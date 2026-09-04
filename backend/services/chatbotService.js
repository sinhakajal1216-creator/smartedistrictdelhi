const documentService = require('./documentService');
const serviceGuidanceService = require('./serviceGuidanceService');
const eligibilityService = require('./eligibilityService');
const schemeService = require('./schemeService');
const sdmLocator = require('./sdmLocator');
const chatbotUnderstandingService = require('./chatbotUnderstandingService');

function isVerifiedStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();

  return (
    normalized === 'verified' ||
    normalized === 'verified_for_service_and_timeline'
  );
}

function normalizeGuidanceVerification(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (!normalized) return 'unverified';

  if (
    normalized === 'verified' ||
    normalized === 'verified_for_service_and_timeline'
  ) {
    return 'verified';
  }

  if (normalized.includes('partial')) {
    return 'partially_verified';
  }

  return 'unverified';
}

function wantsDocumentQuery(text) {
  const t = text.trim();
  return (
    /^documents?\??$/i.test(t) ||
    /^aur documents?\??$/i.test(t) ||
    text.includes('document') ||
    text.includes('documents') ||
    text.includes('proof') ||
    text.includes('papers') ||
    text.includes('what to carry') ||
    text.includes('original') ||
    text.includes('photocopy') ||
    text.includes('attest') ||
    (text.includes('chahiye') && (text.includes('document') || text.includes('proof') || text.includes('paper'))) ||
    (text.includes('isme') && text.includes('chahiye'))
  );
}



function wantsProcedureQuery(text) {
  const isTimePhrase =
    text.includes('kitne din') ||
    text.includes('kab tak') ||
    text.includes('kitna time') ||
    text.includes('lagega');

  if (isTimePhrase) return false;

  return (
    text.includes('kaise') ||
    text.includes('how to apply') ||
    text.includes('apply kaise') ||
    text.includes('kahan apply') ||
    text.includes('where do i apply') ||
    text.includes('procedure') ||
    text.includes('steps') ||
    (text.includes('apply') && !text.includes('eligible')) ||
    (text.includes('process') && !text.includes('processing time')) ||
    (text.includes('banega') && !text.includes('din'))
  );
}

function wantsProcessingTimeQuery(text) {
  return (
    text.includes('kitne din') ||
    text.includes('kab tak') ||
    text.includes('kitna time') ||
    text.includes('lagega') ||
    text.includes('lagenge') ||
    text.includes('processing time') ||
    text.includes('how long') ||
    text.includes('timeline') ||
    (text.includes('banega') && text.includes('din'))
  );
}

function wantsTrackingQuery(text) {
  return /\b(track\s*(?:my\s*)?application|track\s*application|check\s*(?:my\s*)?application\s*status|where\s*is\s*my\s*application|application\s*status|submitted\s*application\s*status|application\s*tracking|track\s*(?:my\s*)?status|check\s*status)\b/i.test(text);
}

function wantsSchemeListQuery(text) {
  return (
    (text.includes('scheme') || text.includes('service') || text.includes('certificate')) &&
    (text.includes('available') ||
      text.includes('list') ||
      text.includes('all') ||
      text.includes('kya kya') ||
      text.includes('which') ||
      text.includes('what'))
  );
}

function isSpecificSchemeExistenceQuery(text) {
  const t = normalizeText(text);

  return (
    /\b(is there|do you have|does .* have|called|known as)\b/.test(t) &&
    /\b(scheme|yojana|program|programme|prog)\b/.test(t)
  );
}

function isSpecificBenefitQuery(text) {
  const t = normalizeText(text);

  return (
    /\b(can i get|is there|do i get|does the government provide|government scheme)\b/.test(t) &&
    /\b(rs|inr|rupees|laptop|cash|amount|financial assistance|subsidy|benefit)\b/.test(t)
  );
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function serviceMatchTerms(scheme) {
  const terms = [
    scheme?.title,
    scheme?.name,
    scheme?.serviceName,
    scheme?.code
  ];

  return [
    ...new Set(
      terms
        .filter(Boolean)
        .map((term) => normalizeText(term))
        .filter((term) => term.length >= 2)
    )
  ];
}

function inferTopicFromQuestion(text) {
  const query = normalizeText(text);

  if (/(age|dob|birth certificate|date of birth)/.test(query)) return 'ageProof';
  if (/(residence|address|proof of address|delhi residence)/.test(query)) return 'residenceProof';
  if (/(additional|extra|conditional|other docs|other documents)/.test(query)) return 'additionalDocuments';
  if (/(aadhar|aadhaar)/.test(query)) return 'verificationNotes';
  if (/(upload|scan|photograph|photo|online)/.test(query)) return 'onlineSubmissionDocuments';
  if (/(verification|office|visit|submit|physical)/.test(query)) return 'officeVerificationDocuments';
  if (/(what about|what else|more)/.test(query)) return 'documentAlternatives';
  return 'documents';
}

function getUnderstanding(message, context = {}, profile = {}) {
  return chatbotUnderstandingService.understandMessage({
    message,
    context,
    profile,
    schemes: schemeService.getAllSchemes()
  });
}

function detectIntent(message, context = {}) {
  return getUnderstanding(message, context).intent;
}

function findService(message, context = {}) {
  const schemes = schemeService.getAllSchemes();
  const text = normalizeText(message);

  if (!text) return null;

  const candidates = [];

  for (const scheme of schemes) {
    for (const term of serviceMatchTerms(scheme)) {
      if (!term || term.length < 2) continue;

      if (text.includes(term)) {
        candidates.push({
          scheme,
          len: term.length
        });
      }
    }
  }

  if (!candidates.length) {
    return null;
  }

  // Longest/more specific service match wins.
  candidates.sort((a, b) => b.len - a.len);

  return candidates[0].scheme;
}

function isSdmContactFollowUp(message) {
  const t = message.toLowerCase().trim();
  return /^(phone number|phone|contact|email|call)\??$/i.test(t) || (t.length < 40 && /\b(phone|contact|email)\b/.test(t));
}

function isContextualFollowUp(message) {
  const text = normalizeText(message);
  return /\b(what about|this|that|same|the scheme|the service|where should i go|where do i submit|where should i submit|what documents do i need|documents do i need)\b/.test(text);
}

function resolveService(message, context = {}, understanding = null) {
  // FIRST: check whether the CURRENT message explicitly names a service.
  const explicitMatch = findService(message);

  if (explicitMatch) {
    return explicitMatch;
  }

    const resolvedUnderstanding =
    understanding || getUnderstanding(message, context);
    if (resolvedUnderstanding.serviceCode) {
    const understoodService = schemeService.getScheme(
      resolvedUnderstanding.serviceCode
    );
    if (understoodService) return understoodService;
  }

  // SECOND: only use conversation context for genuine follow-up questions.
  if (context?.serviceCode && isContextualFollowUp(message)) {
    const previousService = schemeService.getScheme(context.serviceCode);

    if (previousService) {
      return previousService;
    }
  }

  if (context?.currentServiceCode && isContextualFollowUp(message)) {
    const previousService = schemeService.getScheme(
      context.currentServiceCode
    );

    if (previousService) {
      return previousService;
    }
  }

  return null;
}

function buildServiceClarification(understanding) {
  const candidates = understanding?.entities?.topServiceCandidates || [];
  const shortList = candidates.slice(0, 3).map((candidate) => candidate.title);
  if (shortList.length) {
    return `I can help with that. Which service do you mean — ${shortList.join(', ')}?`;
  }
  return 'Please specify which service or certificate you mean.';
}

function emptyDocuments() {
  return {
    onlineSubmission: [],
    officeVerification: [],
    additional: [],
    alternatives: {},
    verificationNotes: []
  };
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((value) => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim());
}

function normalizeAlternativeList(alternatives, key) {
  if (!alternatives || typeof alternatives !== 'object') return [];
  const candidateKeys = [key, key.replace(/([a-z])([A-Z])/g, '$1_$2'), key.toLowerCase()];
  for (const candidate of candidateKeys) {
    const value = alternatives[candidate];
    if (Array.isArray(value)) return normalizeStringList(value);
  }
  return [];
}

function formatDocumentsPayload(docRecord) {
  const alternatives = docRecord && docRecord.documentAlternatives && typeof docRecord.documentAlternatives === 'object'
    ? docRecord.documentAlternatives
    : {};

  return {
    onlineSubmission: normalizeStringList(docRecord && docRecord.onlineSubmissionDocuments),
    officeVerification: normalizeStringList(docRecord && docRecord.officeVerificationDocuments),
    additional: normalizeStringList(docRecord && docRecord.additionalDocuments),
    alternatives,
    verificationNotes: normalizeStringList(docRecord && docRecord.verificationNotes)
  };
}

function buildDocumentAnswerText(docRecord, message = '') {
  const text = String(message || '').toLowerCase();
  const documents = formatDocumentsPayload(docRecord);
  const sourceLinks = (docRecord.sources || []).filter((source) => source && source.url).map((source) => {
    const title = source.title ? `${source.title}: ` : '';
    return `${title}${source.url}`;
  });
  const ageAlternatives = normalizeAlternativeList(docRecord.documentAlternatives, 'ageProof');
  const residenceAlternatives = normalizeAlternativeList(docRecord.documentAlternatives, 'residenceProof');
  const isAgeQuery = /age proof|date of birth|dob|birth certificate/.test(text);
  const isResidenceQuery = /(residence proof|address proof|proof of address|delhi residence|residing in delhi)/.test(text);
  const isAdditionalQuery = /additional document|conditional document|any other document|extra document/.test(text);
  const isNotesQuery = /(before uploading|know before|what should i know|important.*document|verification note|upload.*document)/.test(text);
  const isSpecificQuery = isAgeQuery || isResidenceQuery || isAdditionalQuery || isNotesQuery;

  const sections = [];

  const pushSection = (heading, items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    sections.push({ heading, items: items.map((item) => String(item).trim()).filter(Boolean) });
  };

  if (isSpecificQuery) {
    if (isAgeQuery) {
      if (ageAlternatives.length) {
        sections.push({
          heading: '🔄 Accepted Document Alternatives',
          groups: [{ heading: 'Age proof alternatives', items: ageAlternatives }]
        });
      }
    } else if (isResidenceQuery) {
      if (residenceAlternatives.length) {
        sections.push({
          heading: '🔄 Accepted Document Alternatives',
          groups: [{ heading: 'Residence proof alternatives', items: residenceAlternatives }]
        });
      }
    } else if (isAdditionalQuery) {
      pushSection('📌 Additional Documents / conditional documents', documents.additional);
    } else if (isNotesQuery) {
      pushSection('⚠️ Important Verification Notes', documents.verificationNotes);
      const verificationMeta = [];
      if (docRecord.verificationStatus) verificationMeta.push(`Verification status: ${docRecord.verificationStatus}`);
      if (docRecord.lastVerified) verificationMeta.push(`Last verified: ${docRecord.lastVerified}`);
      pushSection('✅ Verification status / last verified date', verificationMeta);
      if (sourceLinks.length) pushSection('🔗 Official source link', sourceLinks);
    }
    return sections;
  }

  pushSection('💻 Online Upload Documents', documents.onlineSubmission);
  pushSection('🏢 Physical Office Verification Documents', documents.officeVerification);
  pushSection('📌 Additional Documents / conditional documents', documents.additional);

  const alternativeGroups = [];
  if (ageAlternatives.length) alternativeGroups.push({ heading: 'Age proof alternatives', items: ageAlternatives });
  if (residenceAlternatives.length) alternativeGroups.push({ heading: 'Residence proof alternatives', items: residenceAlternatives });
  if (alternativeGroups.length) {
    sections.push({
      heading: '🔄 Accepted Document Alternatives',
      groups: alternativeGroups
    });
  }

  pushSection('⚠️ Important Verification Notes', documents.verificationNotes);

  const verificationMeta = [];
  if (docRecord.verificationStatus) verificationMeta.push(`Verification status: ${docRecord.verificationStatus}`);
  if (docRecord.lastVerified) verificationMeta.push(`Last verified: ${docRecord.lastVerified}`);
  pushSection('✅ Verification status / last verified date', verificationMeta);
  if (sourceLinks.length) pushSection('🔗 Official source link', sourceLinks);

  return sections;
}

function buildDocumentSection(service, message = '') {
  if (!service) {
    return {
      status: 'service_required',
      answer: 'Please specify which service or certificate you need document details for (e.g., EWS, OBC Certificate, NCL, Old Age Pension, Disability Pension, Lal Dora, or Surviving Member Certificate).',
      service: null,
      documents: emptyDocuments(),
      sources: [],
      verificationStatus: 'unverified'
    };
  }

  const docRecord = documentService.getDocumentsForService(service.code);

  if (!docRecord) {
    return {
      status: 'not_found',
      answer: `No document requirements record found for ${service.title}.`,
      service: { code: service.code, title: service.title },
      documents: emptyDocuments(),
      sources: [],
      verificationStatus: 'unverified'
    };
  }

  const verificationStatus = docRecord.verificationStatus || 'unverified';
  const serviceInfo = { code: docRecord.serviceCode, title: docRecord.serviceTitle };
  const documents = formatDocumentsPayload(docRecord);
  const sources = docRecord.sources || [];
  const formattedSections = buildDocumentAnswerText(docRecord, message);
  const answerText = formattedSections.length
    ? formattedSections.map((section) => {
        if (section.groups) {
          return [
            section.heading,
            ...section.groups.map((group) => `${group.heading}\n${group.items.map((item) => `- ${item}`).join('\n')}`)
          ].join('\n');
        }
        return `${section.heading}\n${section.items.map((item) => `- ${item}`).join('\n')}`;
      }).join('\n\n')
    : 'No document guidance is currently available for this service.';

  if (verificationStatus === 'unverified') {
    return {
      status: 'unverified',
      service: serviceInfo,
      answer: answerText || `The official document requirements for "${docRecord.serviceTitle}" are currently UNVERIFIED against published Delhi e-District standards. Unverified documents are not shown as confirmed mandatory requirements.`,
      documents,
      sources,
      verificationStatus: 'unverified'
    };
  }

  if (verificationStatus === 'partially_verified') {
    const notes = docRecord.verificationNotes || [];
    const hasChecklist = documents.onlineSubmission.length > 0 || documents.officeVerification.length > 0;
    return {
      status: 'partially_verified',
      service: serviceInfo,
      answer: answerText || (hasChecklist
        ? `Partially verified document information for "${docRecord.serviceTitle}". Some details may still be pending official confirmation.`
        : `Document checklist for "${docRecord.serviceTitle}" is only partially verified. A complete official checklist is not yet confirmed — do not treat any guessed list as mandatory.`),
      documents,
      sources,
      verificationStatus: 'partially_verified',
      guidanceNotes: notes
    };
  }

  return {
    status: 'success',
    service: serviceInfo,
    answer: answerText,
    documents,
    sources,
    verificationStatus: 'verified'
  };
}

function buildProcedureSection(service) {
  if (!service) {
    return {
      status: 'service_required',
      answer: 'Please specify which service or certificate you want application steps for.',
      service: null,
      procedure: [],
      verificationStatus: 'unverified'
    };
  }

  const guidance = serviceGuidanceService.getGuidanceForService(service.code);
  if (!guidance) {
    return {
      status: 'not_found',
      answer: `No application procedure guidance found for ${service.title}.`,
      service: { code: service.code, title: service.title },
      procedure: [],
      verificationStatus: 'unverified'
    };
  }

  const verificationStatus = normalizeGuidanceVerification(guidance.officialSource?.verificationStatus);
  const serviceInfo = { code: guidance.serviceCode, title: guidance.serviceTitle };

  if (!isVerifiedStatus(guidance.officialSource?.verificationStatus)) {
    return {
      status: 'unverified',
      service: serviceInfo,
      answer: `Application procedure for "${guidance.serviceTitle}" is not fully verified from official Delhi e-District sources.`,
      procedure: [],
      whereToApply: guidance.whereToApply || null,
      verificationStatus,
      guidanceNotes: guidance.notes || []
    };
  }

  const steps = guidance.procedure || [];
  const howToApply = guidance.citizenFAQs?.howToApply || guidance.whereToApply || 'Delhi e-District portal';

  return {
    status: 'success',
    service: serviceInfo,
    answer: `To apply for ${guidance.serviceTitle}, use the Delhi e-District portal. ${howToApply}`,
    procedure: steps,
    whereToApply: guidance.whereToApply || 'Delhi e-District portal',
    department: guidance.department || null,
    verificationStatus,
    guidanceNotes: guidance.notes || []
  };
}

function buildProcessingTimeSection(service) {
  if (!service) {
    return {
      status: 'service_required',
      answer: 'Please specify which service or certificate you are asking about.',
      service: null,
      verificationStatus: 'unverified'
    };
  }

  const guidance = serviceGuidanceService.getGuidanceForService(service.code);
  if (!guidance) {
    return {
      status: 'not_found',
      answer: `No processing-time guidance found for ${service.title}.`,
      service: { code: service.code, title: service.title },
      verificationStatus: 'unverified'
    };
  }

  const verificationStatus = normalizeGuidanceVerification(guidance.officialSource?.verificationStatus);
  const serviceInfo = { code: guidance.serviceCode, title: guidance.serviceTitle };

  if (!isVerifiedStatus(guidance.officialSource?.verificationStatus)) {
    return {
      status: 'unverified',
      service: serviceInfo,
      answer: `Processing-time information for "${guidance.serviceTitle}" is not fully verified from official sources.`,
      verificationStatus,
      guidanceNotes: guidance.notes || []
    };
  }

  const processingTime = guidance.processingTime;
  if (!processingTime?.citizenMessage) {
    return {
      status: 'not_available',
      service: serviceInfo,
      answer: `No prescribed processing timeline is available for "${guidance.serviceTitle}" in the current guidance data.`,
      verificationStatus,
      guidanceNotes: guidance.notes || []
    };
  }

  return {
    status: 'success',
    service: serviceInfo,
    answer: processingTime.citizenMessage,
    processingTime,
    verificationStatus,
    guidanceNotes: guidance.notes || []
  };
}

function mergeCombinedResponse(service, message, queryAspects = {}) {
  const text = message.toLowerCase();
  const includeDocument = queryAspects.document || wantsDocumentQuery(text);
  const includeProcedure = queryAspects.procedure || wantsProcedureQuery(text);
  const includeTime = queryAspects.processingTime || wantsProcessingTimeQuery(text);

  const parts = [];
  const response = {
    intent: 'COMBINED_QUERY',
    status: 'success',
    service: service ? { code: service.code, title: service.title } : null,
    verificationStatus: 'verified'
  };

  if (includeDocument) {
    const doc = buildDocumentSection(service, message);
    response.documents = doc.documents;
    response.sources = doc.sources || [];
    parts.push(doc.answer);
    if (doc.verificationStatus !== 'verified') response.verificationStatus = doc.verificationStatus;
    if (doc.guidanceNotes) response.guidanceNotes = doc.guidanceNotes;
  }

  if (includeProcedure) {
    const proc = buildProcedureSection(service);
    response.procedure = proc.procedure || [];
    response.whereToApply = proc.whereToApply;
    if (proc.department) response.department = proc.department;
    parts.push(proc.answer);
    if (proc.verificationStatus !== 'verified') response.verificationStatus = proc.verificationStatus;
    if (proc.guidanceNotes?.length) {
      response.guidanceNotes = [...(response.guidanceNotes || []), ...proc.guidanceNotes];
    }
  }

  if (includeTime) {
    const time = buildProcessingTimeSection(service);
    response.processingTime = time.processingTime;
    parts.push(time.answer);
    if (time.verificationStatus !== 'verified') response.verificationStatus = time.verificationStatus;
    if (time.guidanceNotes?.length) {
      response.guidanceNotes = [...(response.guidanceNotes || []), ...time.guidanceNotes];
    }
  }

  if (!service) {
    response.status = 'service_required';
    response.answer = 'Please specify the service or certificate name (for example: Old Age Pension, EWS, OBC Certificate, NCL, Lal Dora, or Surviving Member Certificate).';
    return response;
  }

  const hasFailure = parts.some((p) => !p);
  response.answer = parts.filter(Boolean).join('\n\n');
  if (response.verificationStatus !== 'verified') {
    response.status = response.verificationStatus === 'partially_verified' ? 'partially_verified' : 'unverified';
  }

  return response;
}

function buildConversationMeta(service, intent, message, context = {}) {
  const serviceTitle = service?.title || context.currentService || null;
  const serviceCode = service?.code || context.currentServiceCode || context.serviceCode || null;
  const topic = inferTopicFromQuestion(message);
  const previousMessages = Array.isArray(context.recentMessages) ? context.recentMessages.slice(-9) : [];
  const recentMessages = [...previousMessages, message];

  return {
    currentService: serviceTitle,
    currentServiceCode: serviceCode,
    serviceCode,
    lastIntent: intent,
    lastTopic: topic,
    recentMessages,
    lastLocality: context.lastLocality || null,
    lastSdmOffice: context.lastSdmOffice || context.sdmOffice || null,
    pendingEligibilityField: context.pendingEligibilityField || null
  };
}
function extractExplicitLocality(message) {
  const text = String(message || '').trim();

  const patterns = [
    /i live in (.+?)(?:\s+where|\s+what|\s+which|\s*$)/i,
    /i stay in (.+?)(?:\s+where|\s+what|\s+which|\s*$)/i,
    /i am in (.+?)(?:\s+where|\s+what|\s+which|\s*$)/i,
    /my locality is (.+)/i,
    /my area is (.+)/i,
    /i live at (.+?)(?:\s+where|\s+what|\s+which|\s*$)/i,
    /my address is (.+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return match[1].trim();
    }

  }

  return null;
}

function extractEligibilityProfile(message) {
  const text = String(message || '').toLowerCase();
  const facts = {};

  // Age
  const age = text.match(
    /\b(?:i\s+am|i'm|age(?:\s+is)?|aged)\s*(\d{1,3})\s*(?:years?\s*old)?\b/i
  );

  if (age) {
    facts.age = Number(age[1]);
  }

  // Income
  const income = text.match(
    /\b(?:annual|yearly|family)?\s*income\s*(?:is\s*)?(?:less\s+than|under|below|up\s+to|upto|=)?\s*(?:rs\.?|inr)?\s*([0-9][0-9,]*)\b/i
  );

  if (income) {
    const amount = Number(income[1].replace(/,/g, ''));

    facts.income = /\b(less\s+than|under|below)\b/i.test(text)
      ? Math.max(0, amount - 1)
      : amount;
  }

  // Delhi residency
  if (
    /\b(not|don't|do not)\s+(live|living|stay|staying|reside|residing)\s+in\s+delhi\b/.test(text) ||
    /\bnot\s+(?:a\s+)?delhi\s+resident\b/.test(text) ||
    /\bnot\s+a\s+resident\s+of\s+delhi\b/.test(text)
  ) {
    facts.delhiResident = false;
  } else if (
    /\b(live|living|stay|staying|reside|residing)\s+in\s+delhi\b/.test(text) ||
    /\bdelhi\s+resident\b/.test(text) ||
    /\bresident\s+of\s+delhi\b/.test(text)
  ) {
    facts.delhiResident = true;
  }

  // Residence duration
  const residenceYears = text.match(
    /\b(?:lived|living|staying|residing|resident)\b(?:\s+in\s+delhi)?\s+(?:for\s+)?(?:more\s+than\s+|over\s+)?(\d{1,2})\s+years?\b/i
  );

  if (residenceYears) {
    facts.residenceYears = Number(residenceYears[1]);
  }

  // Since year
  const sinceYear = text.match(/\bsince\s+(20\d{2}|19\d{2})\b/);

  if (!facts.residenceYears && sinceYear) {
    const year = Number(sinceYear[1]);
    const currentYear = new Date().getFullYear();
    const delta = currentYear - year;

    if (delta >= 0 && delta <= 100) {
      facts.residenceYears = delta;
    }
  }

  // Aadhaar
  if (/\baadhaar\b|\baadhar\b/.test(text)) {
    if (/\b(yes|have|has|available|present)\b/.test(text)) {
      facts.aadhaar = true;
    }

    if (/\b(no|not|don't have|do not have|without)\b/.test(text)) {
      facts.aadhaar = false;
    }
  }

  // Other pension
  if (
    /\b(other pension|another pension|already receiving pension|receiv(?:e|ing).+pension)\b/.test(
      text
    )
  ) {
    if (/\b(yes|already|receiv)/.test(text)) {
      facts.receivesOtherPension = true;
    }

    if (/\b(no|not|don't|do not)\b/.test(text)) {
      facts.receivesOtherPension = false;
    }
  }

  // Category
  if (/\bobc\b/.test(text)) {
    facts.category = 'obc';
  } else if (/\bgeneral\b/.test(text)) {
    facts.category = 'general';
  } else if (/\bsc\b/.test(text)) {
    facts.category = 'sc';
  } else if (/\bst\b/.test(text)) {
    facts.category = 'st';
  }

  // Disability
  if (/\bdisability\b|\bdisabled\b|\bspecial needs\b/i.test(text)) {
    if (/\b(yes|have|has)\b/i.test(text)) {
      facts.disability = 'yes';
    }

    if (/\b(no|not|don't|do not)\b/i.test(text)) {
      facts.disability = 'no';
    }
  }

  // Disability percentage
  const disabilityPct = text.match(
    /\b(\d{1,3})\s*%\s*(?:disability|disabled)?\b/i
  );

  if (disabilityPct) {
    facts.disabilityPercentage = Number(disabilityPct[1]);
  }

  return facts;
}

function extractMissingFields(reasons = []) {
  return reasons
    .map((reason) => String(reason).match(/Missing profile field '([^']+)'/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function missingFieldPrompt(field) {
  const labels = {
    age: 'your age in years',
    income: 'your annual family income',
    delhiResident: 'whether you currently live in Delhi (yes/no)',
    residenceYears: 'how long you have lived in Delhi (in years)',
    aadhaar: 'whether you have Aadhaar (yes/no)',
    receivesOtherPension: 'whether you receive another pension (yes/no)',
    category: 'your social category (for example: general, obc, sc, st)',
    disability: 'whether you have a disability (yes/no)',
    disabilityPercentage: 'your disability percentage'
  };
  return labels[field] || field;
}

function parseYesNo(text) {
  const normalized = String(text || '').toLowerCase().trim();
  if (!normalized) return null;
  if (/^(yes|haan|ha|yep|yeah|true)\b/.test(normalized)) return true;
  if (/^(no|nahi|nahin|nope|false)\b/.test(normalized)) return false;
  return null;
}

function enrichFromPendingField(message, pendingField) {
  const updates = {};
  const answer = String(message || '');

  if (pendingField === 'residenceYears') {
    const parsed = extractEligibilityProfile(answer);
    if (parsed.residenceYears !== undefined) updates.residenceYears = parsed.residenceYears;
  } else if (pendingField === 'delhiResident' || pendingField === 'aadhaar' || pendingField === 'receivesOtherPension') {
    const yn = parseYesNo(answer);
    if (yn !== null) updates[pendingField] = yn;
  } else if (pendingField === 'income') {
    const parsed = extractEligibilityProfile(answer);
    if (parsed.income !== undefined) updates.income = parsed.income;
  } else if (pendingField === 'age') {
    const parsed = extractEligibilityProfile(answer);
    if (parsed.age !== undefined) updates.age = parsed.age;
  } else if (pendingField === 'disabilityPercentage') {
    const pct = String(answer).match(/\b(\d{1,3})\s*%?\b/);
    if (pct) updates.disabilityPercentage = Number(pct[1]);
  } else if (pendingField === 'category') {
    const parsed = extractEligibilityProfile(answer);
    if (parsed.category) updates.category = parsed.category;
  } else if (pendingField === 'disability') {
    const yn = parseYesNo(answer);
    if (yn !== null) updates.disability = yn ? 'yes' : 'no';
  }

  return updates;
}

function processMessage({ message, profile = {}, context = {} }) {
  sdmLocator.loadData();
  const extractedProfile = {
    ...extractEligibilityProfile(message),
    ...enrichFromPendingField(message, context?.pendingEligibilityField)
  };
  const effectiveProfile = {
    ...(context.eligibilityProfile || {}),
    ...profile,
    ...extractedProfile
  };
  const conversationContext = { ...context, eligibilityProfile: effectiveProfile };
  const understanding = getUnderstanding(message, conversationContext, effectiveProfile);
  let intent = understanding.intent;
  if (intent === 'GENERAL_QUERY') {
    const normalizedMessage = normalizeText(message);

    if (wantsTrackingQuery(normalizedMessage)) {
      intent = 'TRACKING_QUERY';
    } else if (wantsDocumentQuery(normalizedMessage)) {
      intent = 'DOCUMENT_QUERY';
    } else if (wantsProcessingTimeQuery(normalizedMessage)) {
      intent = 'PROCESSING_TIME_QUERY';
    } else if (wantsProcedureQuery(normalizedMessage)) {
      intent = 'APPLICATION_QUERY';
    } else if (wantsSchemeListQuery(normalizedMessage)) {
      intent = 'SCHEME_LIST_QUERY';
    }
  }

  const service = resolveService(
    message,
    conversationContext,
    understanding
  );

  // Resolve the previously discussed service only for eligibility follow-ups.
  const contextServiceCode =
    conversationContext.currentServiceCode ||
    conversationContext.serviceCode ||
    null;

  const eligibilityServiceFromContext = contextServiceCode
    ? schemeService.getScheme(contextServiceCode)
    : null;

  const eligibilityServiceTarget =
    intent === 'ELIGIBILITY_QUERY'
      ? (service || eligibilityServiceFromContext)
      : service;

  const conversationMeta = {
    ...buildConversationMeta(
      eligibilityServiceTarget,
      intent,
      message,
      conversationContext
    ),
    eligibilityProfile: effectiveProfile
  };

  // Handle application tracking / status questions with truthful official guidance
  if (intent === 'TRACKING_QUERY' || wantsTrackingQuery(normalizeText(message))) {
    return {
      ...conversationMeta,
      intent: 'TRACKING_QUERY',
      status: 'unsupported_tracking',
      answer: "SevaSphere provides pre-application guidance, eligibility verification, and SDM jurisdiction assistance, but it does not have access to live government application records. To check the status of an application you have already submitted, please use the official Delhi e-District portal at https://edistrict.delhigovt.nic.in/ under 'Track Your Application'."
    };
  }

  // Prevent unknown scheme/benefit questions from being incorrectly
  // treated as generic eligibility queries.
  if (
    (isSpecificSchemeExistenceQuery(message) ||
      isSpecificBenefitQuery(message)) &&
    !service
  ) {
    return {
      ...conversationMeta,
      intent: 'UNKNOWN_SCHEME_QUERY',
      status: 'not_found',
      answer:
        "I couldn't find a verified record of a Delhi government scheme matching that request in my available information. Please check the latest official Delhi Government/e-District source for current schemes and benefits."
    };
  }

  const usedContext = Boolean(understanding.usedContextService);

  const sdmContextOffice =
    conversationContext?.lastSdmOffice ||
    conversationContext?.sdmOffice ||
    null;

  console.debug('[CHATBOT] message received, length:', message?.length);
  console.debug('[CHATBOT] intent:', intent);
  console.debug('[CHATBOT] intentConfidence:', understanding.intentConfidence);
  console.debug('[CHATBOT] service:', service ? `${service.title} (${service.code})` : null);
  console.debug('[CHATBOT] serviceConfidence:', understanding.serviceConfidence);
  console.debug('[CHATBOT] locality:', understanding.locality || null);
  console.debug('[CHATBOT] usedContext:', usedContext);

  if (isSdmContactFollowUp(message) && sdmContextOffice?.sdmOffice) {
    const office = sdmContextOffice.sdmOffice;
    const phone = office.contact?.phone;
    const email = office.contact?.email;
    const parts = [];
    if (phone) parts.push(`Phone: ${phone}`);
    if (email) parts.push(`Email: ${email}`);

    return {
      ...buildConversationMeta(null, 'SDM_QUERY', message, context),
      intent: 'SDM_QUERY',
      status: 'success',
      usedContext: true,
      answer: parts.length
        ? `Contact information for ${office.name}: ${parts.join('; ')}.`
        : `No phone or email is available in the current SDM office record for ${office.name}.`,
      sdmOffice: sdmContextOffice,
      lastSdmOffice: sdmContextOffice
    };
  }

  if (intent === 'COMBINED_QUERY') {
    const response = mergeCombinedResponse(service, message, understanding.entities?.queryAspects || {});
    if (!service && understanding.needsServiceClarification) {
      response.answer = buildServiceClarification(understanding);
    }
    if (service) response.usedContext = usedContext;
    return { ...conversationMeta, ...response };
  }

  if (intent === 'DOCUMENT_QUERY') {
    const doc = buildDocumentSection(service, message);
    if (!service && understanding.needsServiceClarification) {
      doc.answer = buildServiceClarification(understanding);
    }
    if (service) doc.usedContext = usedContext;
    return { ...conversationMeta, intent, ...doc };
  }

  if (intent === 'APPLICATION_QUERY') {
    const proc = buildProcedureSection(service);
    if (!service && understanding.needsServiceClarification) {
      proc.answer = buildServiceClarification(understanding);
    }
    if (service) proc.usedContext = usedContext;
    return { ...conversationMeta, intent, ...proc };
  }

  if (intent === 'PROCESSING_TIME_QUERY') {
    const time = buildProcessingTimeSection(service);
    if (!service && understanding.needsServiceClarification) {
      time.answer = buildServiceClarification(understanding);
    }
    if (service) time.usedContext = usedContext;
    return { ...conversationMeta, intent, ...time };
  }

  if (intent === 'SCHEME_LIST_QUERY') {
    const schemes = schemeService.getAllSchemes();
    const topSchemes = schemes.slice(0, 20).map((scheme) => ({
      code: scheme.code,
      title: scheme.title
    }));
    const titleList = topSchemes.map((scheme) => scheme.title).join(', ');
    const suffix = schemes.length > topSchemes.length
      ? ` I can share details for more services too (${schemes.length} total).`
      : '';

    return {
      ...conversationMeta,
      intent,
      status: 'success',
      answer: `Available Smart e-District services include: ${titleList}.${suffix}`,
      services: topSchemes,
      totalServices: schemes.length
    };
  }

  if (intent === 'ELIGIBILITY_QUERY') {
    const schemes = schemeService.getAllSchemes();
    const hasPendingField = Boolean(conversationContext?.pendingEligibilityField);

    const profileKeys = Object.keys(effectiveProfile || {}).filter(
      (k) => effectiveProfile[k] !== undefined && effectiveProfile[k] !== null && effectiveProfile[k] !== ''
    );

    if (!profileKeys.length) {
      const initialMissing = hasPendingField
        ? [context.pendingEligibilityField]
        : ['age'];
      return {
        ...conversationMeta,
        intent,
        status: 'profile_required',
        pendingEligibilityField: initialMissing[0],
        answer: `To check your eligibility, please tell me ${missingFieldPrompt(initialMissing[0])}.`,
        service: eligibilityServiceTarget ? { code: eligibilityServiceTarget.code, title: eligibilityServiceTarget.title } : null,
        requiredProfileFields: initialMissing,
        results: []
      };
    }

    const evaluation = eligibilityService.evaluate(effectiveProfile, schemes);
    const matched = eligibilityServiceTarget
      ? evaluation.filter(
          (r) => r.code === eligibilityServiceTarget.code || String(r.schemeId) === String(eligibilityServiceTarget._id)
        )
      : evaluation;

    const mainResult = matched.length === 1 ? matched[0] : null;

    let answer = '';
    if (mainResult) {
      if (mainResult.eligible === true) {
        answer = `You meet the currently modeled eligibility criteria for "${mainResult.title}".`;
      } else if (mainResult.eligible === false) {
        answer = `You do not currently meet the eligibility criteria for "${mainResult.title}". Reasons: ${mainResult.reasons.join('; ')}`;
      } else {
        const missing = extractMissingFields(mainResult.reasons);
        answer = missing.length
          ? `I have recorded the details you provided. To finish checking "${mainResult.title}", please confirm ${missingFieldPrompt(missing[0])}.`
          : `I have recorded the details you provided, but need a little more information to finish checking "${mainResult.title}".`;
      }
       } else {
      const eligibleSchemes = matched
        .filter((m) => m.eligible === true)
        .map((m) => m.title);

      const ineligibleSchemes = matched
        .filter((m) => m.eligible === false)
        .map((m) => m.title);

      const incompleteSchemes = matched
        .filter((m) => m.eligible === null || m.eligible === undefined)
        .map((m) => m.title);

      const answerParts = [];

      if (eligibleSchemes.length) {
        answerParts.push(
          `Based on the information you provided, you may meet the modeled criteria for: ${eligibleSchemes.join(', ')}.`
        );
      }

      if (incompleteSchemes.length && !eligibleSchemes.length) {
        answerParts.push(
          `I need a little more information to determine eligibility for some services.`
        );
      }

      if (!answerParts.length && ineligibleSchemes.length) {
        answerParts.push(
          `I could not find a scheme in the current eligibility data that you clearly qualify for based on the information provided.`
        );
      }

      answer = answerParts.join(' ');
    }
     

    const missingForMain = mainResult ? extractMissingFields(mainResult.reasons) : [];
    const unresolvedPendingField = hasPendingField && !Object.prototype.hasOwnProperty.call(extractedProfile, context.pendingEligibilityField)
      ? context.pendingEligibilityField
      : null;
    const focusedMissingField = unresolvedPendingField || missingForMain[0] || null;
    const nextActions = mainResult && mainResult.eligible !== null ? [
      { type: 'message', label: 'Required Documents', message: `What documents are required for ${mainResult.title}?` },
      { type: 'message', label: 'How to Apply', message: `Where do I apply for ${mainResult.title}?` },
      { type: 'navigate', label: 'Find SDM Office', to: '/sdm-locator' }
    ] : [{ type: 'navigate', label: 'Find SDM Office', to: '/sdm-locator' }];

    const eligibilityAnswer = unresolvedPendingField
      ? `I still need ${missingFieldPrompt(unresolvedPendingField)} to continue the eligibility check.`
      : answer;

    return {
      ...conversationMeta,
      intent,
      status: focusedMissingField ? 'profile_required' : 'success',
      pendingEligibilityField: focusedMissingField,
      service: eligibilityServiceTarget ? { code: eligibilityServiceTarget.code, title: eligibilityServiceTarget.title } : null,
      answer: eligibilityAnswer,
      results: matched,
      requiredProfileFields: focusedMissingField ? [focusedMissingField] : [],
      actions: nextActions
    };
  }

  if (intent === 'SDM_QUERY') {
    const localityFromMessage = understanding.locality;
    const explicitLocality = extractExplicitLocality(message);
    const fallbackLocality = explicitLocality || profile.locality || profile.address || context.lastLocality || null;
    let sdmResult = sdmLocator.locateSdmOffice(localityFromMessage || fallbackLocality);
    if ((!sdmResult || sdmResult.mappingStatus !== 'available') && localityFromMessage && localityFromMessage !== message) {
      sdmResult = sdmLocator.locateSdmOffice(message);
    }

    if (sdmResult && sdmResult.mappingStatus === 'available') {
      return {
        ...conversationMeta,
        intent,
        status: 'success',
        usedContext: !localityFromMessage,
        locality: localityFromMessage || fallbackLocality,
        answer: `Locality "${sdmResult.locality}" (MCD Ward: ${sdmResult.ward}, AC: ${sdmResult.acName}) falls under SDM ${sdmResult.sdmJurisdiction.subDivision} (${sdmResult.sdmJurisdiction.area} District). Dedicated SDM Office: ${sdmResult.sdmOffice.name} at ${sdmResult.sdmOffice.address}.`,
        sdmOffice: sdmResult,
        lastLocality: localityFromMessage || fallbackLocality,
        lastSdmOffice: sdmResult,
        actions: [{ type: 'navigate', label: 'Find SDM Office', to: '/sdm-locator' }]
      };
    }

    return {
      ...conversationMeta,
      intent,
      status: 'locality_required',
      locality: localityFromMessage || fallbackLocality || null,
      answer: 'Please provide your locality, colony, or MCD ward name in Delhi to find your designated SDM jurisdiction and office.',
      sdmOffice: sdmResult || null,
      lastLocality: localityFromMessage || fallbackLocality || null,
      actions: [{ type: 'navigate', label: 'Find SDM Office', to: '/sdm-locator' }]
    };
  }

  if (service) {
    const guidance = serviceGuidanceService.getGuidanceForService(service.code);
    return {
      ...conversationMeta,
      intent,
      status: 'success',
      service: { code: service.code, title: service.title },
      answer: guidance
        ? `I found "${service.title}". You can ask for documents, eligibility, processing timeline, or how to apply.`
        : `I found "${service.title}". Ask me for document requirements, eligibility, or SDM office guidance for this service.`
    };
  }

  if (intent === 'PROJECT_QUERY') {
    return {
      ...conversationMeta,
      intent,
      status: 'success',
      answer: 'Smart e-District Delhi is a citizen assistance layer for Delhi e-District services. It uses verified document checklists, eligibility checking, SDM jurisdiction lookup, and service guidance from official Delhi e-District listings where verified.'
    };
  }

  return {
    ...conversationMeta,
    intent,
    status: 'success',
    answer: 'I can help you with Delhi e-District services, eligibility, required documents, application procedures, and SDM jurisdiction. What would you like help with?'
  };
}

module.exports = {
  detectIntent,
  findService,
  processMessage
};
