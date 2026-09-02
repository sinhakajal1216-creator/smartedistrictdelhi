const DEFAULT_INTENT = 'GENERAL_QUERY';
const INTENT_PRIORITY = [
  'SDM_QUERY',
  'SCHEME_LIST_QUERY',
  'ELIGIBILITY_QUERY',
  'DOCUMENT_QUERY',
  'PROCESSING_TIME_QUERY',
  'APPLICATION_QUERY',
  'COMBINED_QUERY',
  'PROJECT_QUERY',
  DEFAULT_INTENT
];

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const stopWords = new Set([
    'the', 'is', 'are', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'on',
    'my', 'me', 'i', 'can', 'you', 'do', 'does', 'what', 'which', 'where', 'how',
    'please', 'about', 'get', 'kya', 'ki', 'ke', 'ka', 'mein', 'me', 'hai', 'ko'
  ]);

  return normalizeText(text)
    .split(' ')
    .filter((token) => token && token.length > 1 && !stopWords.has(token));
}

function jaccardSimilarity(leftTokens, rightTokens) {
  if (!leftTokens.length || !rightTokens.length) return 0;
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  let overlap = 0;
  left.forEach((token) => {
    if (right.has(token)) overlap += 1;
  });
  const union = new Set([...left, ...right]).size;
  return union ? overlap / union : 0;
}

function containsPhrase(text, phrase) {
  if (!phrase) return false;
  return text.includes(phrase);
}

function getServiceAliases(scheme) {
  const title = String(scheme.title || '').trim();
  const normalizedTitle = normalizeText(title);
  const aliases = new Set([
    normalizedTitle,
    normalizeText(scheme.code),
    normalizeText(String(scheme.code || '').replace(/-/g, ' ')),
    normalizedTitle.replace(/\bissuance of\b/g, '').trim(),
    normalizedTitle.replace(/\bfor economically weaker section ews\b/g, '').trim(),
    normalizedTitle.replace(/\bcertificate\b/g, '').trim(),
    normalizedTitle.replace(/\bscheme\b/g, '').trim()
  ]);

  const keywordAliases = {
    'old-age-pension-scheme': [
      'old age pension',
      'senior citizen pension',
      'pension for elderly',
      'pension for old people'
    ],
    'issuance-of-income-and-assets-certificate-for-economically-weaker-section-ews': [
      'income certificate',
      'income proof',
      'certificate showing my income',
      'income and assets certificate',
      'ews certificate',
      'income and assets'
    ],
    'non-creamy-layer-certificate-ncl-for-obc': [
      'obc ncl',
      'ncl certificate',
      'non creamy layer certificate',
      'non-creamy layer',
      'obc non creamy layer'
    ],
    'issuance-of-lal-dora-certificate': [
      'lal dora certificate',
      'lal dora',
      'certificate for lal dora property'
    ],
    'issuance-of-caste-obc-certificate': [
      'obc certificate',
      'caste obc certificate',
      'caste certificate'
    ],
    'financial-assistance-to-persons-with-special-needs': [
      'disability pension',
      'special needs pension',
      'persons with special needs'
    ],
    'issuance-of-surviving-member-certificate': [
      'surviving member',
      'surviving member certificate'
    ]
  };

  (keywordAliases[scheme.code] || []).forEach((alias) => aliases.add(normalizeText(alias)));
  return [...aliases].filter((alias) => alias && alias.length >= 3);
}

function deterministicServiceMatch(messageText, serviceCatalog) {
  const candidates = [];

  serviceCatalog.forEach((entry) => {
    entry.aliases.forEach((alias) => {
      if (!alias) return;
      if (containsPhrase(messageText, alias)) {
        candidates.push({
          service: entry.service,
          matchType: 'deterministic',
          score: 0.92 + Math.min(alias.length / 200, 0.07),
          alias
        });
      }
    });
  });

  candidates.sort((a, b) => b.score - a.score || b.alias.length - a.alias.length);
  return candidates[0] || null;
}

function semanticServiceMatch(messageText, messageTokens, serviceCatalog) {
  const candidates = [];

  serviceCatalog.forEach((entry) => {
    let best = 0;
    entry.aliases.forEach((alias) => {
      const aliasTokens = tokenize(alias);
      const overlapScore = jaccardSimilarity(messageTokens, aliasTokens);
      const containmentBoost = containsPhrase(messageText, alias) ? 0.25 : 0;
      const score = Math.min(1, overlapScore + containmentBoost);
      if (score > best) best = score;
    });

    if (best > 0) {
      candidates.push({
        service: entry.service,
        matchType: 'semantic',
        score: best
      });
    }
  });

  candidates.sort((a, b) => b.score - a.score);
  return {
    best: candidates[0] || null,
    candidates
  };
}

function isFollowUpMessage(messageText) {
  if (!messageText) return false;
  if (/^(documents?|what documents are required|how long does it take|kitne din|kab tak|where do i apply|how to apply)\??$/.test(messageText)) {
    return true;
  }
  if (/\b(what about|aur|isme|iska|uska|same service|for this|for that)\b/.test(messageText)) {
    return true;
  }
  if (messageText.split(' ').length <= 6 && /\b(documents?|timeline|time|apply|eligibility|proof)\b/.test(messageText)) {
    return true;
  }
  return false;
}

function detectIntentSignals(messageText, context) {
  const hasSdm = /\b(sdm|sub divisional magistrate|sub divisional|jurisdiction|which sdm|sdm office|which office)\b/.test(messageText);
  const hasSchemeList = /\b(what services|services available|service list|list of services|what schemes|scheme list|all services|all schemes)\b/.test(messageText);
  const hasEligibility = /\b(eligible|eligibility|am i eligible|qualification|qualify|criteria)\b/.test(messageText);
  const hasDocuments = /\b(document|documents|proof|papers|required documents|kya documents|what to carry)\b/.test(messageText);
  const hasProcessingTime = /\b(how many days|how long|processing time|timeline|kitne din|kab tak|kitna time|lagega|milega)\b/.test(messageText);
  const hasApplication = /\b(how to apply|where do i apply|apply kaise|kahan apply|procedure|steps|application process)\b/.test(messageText);
  const hasProject = /\b(project|technology|tech stack|smart e district|chatbot)\b/.test(messageText);

  const aspects = {
    document: hasDocuments,
    processingTime: hasProcessingTime,
    procedure: hasApplication
  };
  const aspectCount = Object.values(aspects).filter(Boolean).length;

  const followUp = isFollowUpMessage(messageText);
  const lastIntent = String(context?.lastIntent || '');
  const candidates = {
    SDM_QUERY: hasSdm ? 0.98 : 0,
    SCHEME_LIST_QUERY: hasSchemeList ? 0.96 : 0,
    ELIGIBILITY_QUERY: hasEligibility ? 0.95 : 0,
    DOCUMENT_QUERY: hasDocuments ? 0.92 : 0,
    PROCESSING_TIME_QUERY: hasProcessingTime ? 0.92 : 0,
    APPLICATION_QUERY: hasApplication ? 0.9 : 0,
    COMBINED_QUERY: aspectCount > 1 ? 0.88 : 0,
    PROJECT_QUERY: hasProject ? 0.85 : 0,
    GENERAL_QUERY: 0.5
  };

  if (followUp && lastIntent && !hasSdm && !hasSchemeList && !hasEligibility && !hasProject) {
    if (lastIntent === 'DOCUMENT_QUERY' && !hasProcessingTime) candidates.DOCUMENT_QUERY = Math.max(candidates.DOCUMENT_QUERY, 0.84);
    if (lastIntent === 'PROCESSING_TIME_QUERY' && !hasDocuments) candidates.PROCESSING_TIME_QUERY = Math.max(candidates.PROCESSING_TIME_QUERY, 0.84);
    if (lastIntent === 'APPLICATION_QUERY') candidates.APPLICATION_QUERY = Math.max(candidates.APPLICATION_QUERY, 0.84);
  }

  return { candidates, aspects, followUp };
}

function pickIntent(intentScores) {
  for (const intent of INTENT_PRIORITY) {
    const score = intentScores[intent] || 0;
    if (score > 0.6) {
      return { intent, confidence: score };
    }
  }

  return { intent: DEFAULT_INTENT, confidence: intentScores.GENERAL_QUERY || 0.5 };
}

function extractLocality(message) {
  const raw = String(message || '').trim();
  if (!raw) return null;

  const patterns = [
    /\bi\s+live\s+in\s+(.+?)(?:\s+(?:which|what|where|who|sdm|office|should)\b|[?.!,]|$)/i,
    /\bi\s+am\s+in\s+(.+?)(?:\s+(?:which|what|where|who|sdm|office|should)\b|[?.!,]|$)/i,
    /\bwhich\s+sdm(?:\s+office)?\s+handles?\s+(.+?)(?:[?.!,]|$)/i,
    /\bsdm\s+office\s+handles?\s+(.+?)(?:[?.!,]|$)/i,
    /\bfor\s+(.+?)\s+which\s+sdm(?:\s+office)?/i,
    /\bin\s+(.+?)\s+which\s+sdm(?:\s+office)?/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      const locality = match[1].trim();
      if (locality.length >= 3) return locality;
    }
  }

  if (/\b(sdm|sub divisional|jurisdiction|office)\b/i.test(raw)) {
    const cleaned = raw
      .replace(/[?.,]/g, ' ')
      .replace(/\b(i|live|am|in|which|what|where|is|my|correct|the|sdm|office|should|visit|handles|handle|for)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 3) return cleaned;
  }

  return null;
}

function callSemanticProvider() {
  // Reserved extension point for plugging an LLM/NLU provider later.
  return null;
}

function understandMessage({ message, context = {}, schemes = [] }) {
  const normalizedMessage = normalizeText(message);
  const messageTokens = tokenize(message);
  const serviceCatalog = schemes.map((service) => ({
    service,
    aliases: getServiceAliases(service)
  }));

  const deterministicMatch = deterministicServiceMatch(normalizedMessage, serviceCatalog);
  const semanticResult = semanticServiceMatch(normalizedMessage, messageTokens, serviceCatalog);
  const semanticBest = semanticResult.best;
  const intentSignals = detectIntentSignals(normalizedMessage, context);
  const intentChoice = pickIntent(intentSignals.candidates);
  const explicitLocality = extractLocality(message);
  const externalSemantic = callSemanticProvider();
  const followUp = intentSignals.followUp;

  let chosenService = null;
  let serviceConfidence = 0;
  let serviceSource = 'none';
  let usedContextService = false;

  if (deterministicMatch) {
    chosenService = deterministicMatch.service;
    serviceConfidence = deterministicMatch.score;
    serviceSource = deterministicMatch.matchType;
  } else if (semanticBest && semanticBest.score >= 0.72) {
    chosenService = semanticBest.service;
    serviceConfidence = semanticBest.score;
    serviceSource = semanticBest.matchType;
  } else if (followUp && (context?.currentServiceCode || context?.serviceCode)) {
    const contextCode = context.currentServiceCode || context.serviceCode;
    chosenService = schemes.find((scheme) => scheme.code === contextCode) || null;
    serviceConfidence = chosenService ? 0.78 : 0;
    serviceSource = chosenService ? 'context' : 'none';
    usedContextService = Boolean(chosenService);
  }

  const topCandidates = (semanticResult.candidates || []).slice(0, 3).map((entry) => ({
    code: entry.service.code,
    title: entry.service.title,
    confidence: Number(entry.score.toFixed(2))
  }));

  const needsServiceClarification =
    !chosenService &&
    ['DOCUMENT_QUERY', 'APPLICATION_QUERY', 'PROCESSING_TIME_QUERY', 'COMBINED_QUERY'].includes(intentChoice.intent) &&
    topCandidates.length > 0 &&
    topCandidates[0].confidence >= 0.45;

  const semanticIntent = externalSemantic?.intent;
  const semanticIntentConfidence = Number(externalSemantic?.intentConfidence || 0);
  const finalIntent = semanticIntent && semanticIntentConfidence >= 0.92 ? semanticIntent : intentChoice.intent;
  const finalIntentConfidence = semanticIntent && semanticIntentConfidence >= 0.92
    ? semanticIntentConfidence
    : intentChoice.confidence;

  return {
    intent: finalIntent,
    serviceCode: chosenService ? chosenService.code : null,
    serviceConfidence: Number(serviceConfidence.toFixed(2)),
    intentConfidence: Number(finalIntentConfidence.toFixed(2)),
    locality: explicitLocality,
    entities: {
      queryAspects: intentSignals.aspects,
      topServiceCandidates: topCandidates
    },
    isFollowUp: followUp,
    usedContextService,
    needsServiceClarification,
    serviceSource
  };
}

module.exports = {
  understandMessage,
  normalizeText
};
