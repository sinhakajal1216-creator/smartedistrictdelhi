const documentService = require('./documentService');
const serviceGuidanceService = require('./serviceGuidanceService');
const eligibilityService = require('./eligibilityService');
const schemeService = require('./schemeService');
const sdmLocator = require('./sdmLocator');

function isVerifiedStatus(status) {
  return String(status || '').includes('verified');
}

function normalizeGuidanceVerification(status) {
  if (!status) return 'unverified';
  if (status === 'verified' || status === 'verified_for_service_and_timeline') return 'verified';
  if (String(status).includes('partial')) return 'partially_verified';
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

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function detectIntent(message, context = {}) {
  const text = normalizeText(message);
  const previousIntent = context.lastIntent || '';

  if (
    previousIntent === 'DOCUMENT_QUERY' &&
    /(what about|what else|more|age|residence|address|document|proof|papers|birth certificate|dont have|don t have|do not have|not have)/.test(text)
  ) {
    return 'DOCUMENT_QUERY';
  }

  if (
    previousIntent === 'ELIGIBILITY_QUERY' &&
    /(eligible|eligibility|can i apply|can i get|am i eligible|qualify)/.test(text)
  ) {
    return 'ELIGIBILITY_QUERY';
  }

  if (
    text.includes('eligible') ||
    text.includes('eligibility') ||
    text.includes('qualify') ||
    text.includes('qualification') ||
    text.includes('can i apply') ||
    text.includes('can i get') ||
    text.includes('am i eligible')
  ) {
    return 'ELIGIBILITY_QUERY';
  }

  if (
    text.includes('sdm') ||
    text.includes('sub divisional') ||
    text.includes('jurisdiction') ||
    (text.includes('office') && (text.includes('which') || text.includes('where') || text.includes('sdm'))) ||
    text.includes('where to submit') ||
    text.includes('which office') ||
    (text.includes('visit') && text.includes('office'))
  ) {
    return 'SDM_QUERY';
  }

  if (wantsSchemeListQuery(text)) {
    return 'SCHEME_LIST_QUERY';
  }

  const document = wantsDocumentQuery(text);
  const procedure = wantsProcedureQuery(text);
  const processingTime = wantsProcessingTimeQuery(text);
  const aspectCount = [document, procedure, processingTime].filter(Boolean).length;

  if (aspectCount > 1) return 'COMBINED_QUERY';
  if (document) return 'DOCUMENT_QUERY';
  if (processingTime) return 'PROCESSING_TIME_QUERY';
  if (procedure) return 'APPLICATION_QUERY';

  if (
    text.includes('project') ||
    text.includes('technology') ||
    text.includes('tech stack') ||
    text.includes('smart e district') ||
    text.includes('chatbot') ||
    text.includes('about')
  ) {
    return 'PROJECT_QUERY';
  }

  return 'GENERAL_QUERY';
}

function serviceMatchTerms(scheme) {
  const title = String(scheme.title || '').trim();
  const code = String(scheme.code || '').trim();
  const rawTerms = [
    title,
    title.toLowerCase(),
    code,
    code.replace(/-/g, ' '),
    title.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim(),
    title.toLowerCase().replace(/\s+(scheme|certificate)$/i, '').trim()
  ].filter(Boolean);

  const terms = new Set();
  rawTerms.forEach((term) => {
    const normalized = normalizeText(term);
    if (normalized.length >= 2) terms.add(normalized);
  });

  if (title) {
    const compact = title.toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\b(scheme|certificate)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (compact) terms.add(compact);
  }

  const synonyms = {
    'old age pension': ['old age pension', 'senior citizen pension', 'pension for senior citizens', 'old age pension scheme'],
    'income': ['income certificate', 'income and assets certificate', 'income and assets', 'ews certificate', 'income proof certificate'],
    'caste': ['caste certificate', 'obc certificate', 'caste obc certificate'],
    'non creamy layer': ['non creamy layer', 'ncl certificate'],
    'disability': ['disability pension', 'special needs pension', 'person with special needs'],
    'ration card': ['ration card'],
    'lal dora': ['lal dora'],
    'surviving member': ['surviving member', 'surviving member certificate']
  };

  const matchedSynonyms = Object.entries(synonyms).find(([key]) => title.toLowerCase().includes(key));
  if (matchedSynonyms) {
    matchedSynonyms[1].forEach((item) => terms.add(normalizeText(item)));
  }

  if (title.toLowerCase().includes('income')) {
    ['income certificate', 'income and assets cert', 'income and assets certificate'].forEach((item) => terms.add(normalizeText(item)));
  }

  return terms;
}

function findService(message, context = {}) {
  const schemes = schemeService.getAllSchemes();
  const text = normalizeText(message);
  const candidates = [];

  if (!text) return null;

  for (const scheme of schemes) {
    for (const term of serviceMatchTerms(scheme)) {
      if (!term || term.length < 2) continue;
      const matchScore = text.includes(term) ? term.length : 0;
      if (matchScore > 0) candidates.push({ scheme, len: matchScore });
    }
  }

  if (candidates.length) {
    candidates.sort((a, b) => b.len - a.len);
    return candidates[0].scheme;
  }

  if (context?.currentServiceCode) {
    const existing = schemeService.getScheme(context.currentServiceCode);
    if (existing) {
      const currentText = normalizeText(context.currentService || existing.title || '');
      if (!text.includes('new') && !text.includes('different') && !text.includes('other') && !text.includes('another')) {
        return existing;
      }
      if (currentText && text.includes(currentText)) {
        return existing;
      }
    }
  }

  return null;
}

function isContextualFollowUp(message) {
  const t = message.toLowerCase().trim();

  if (/\b(isme|iska|iski|uska|uske|uski|for this|same service|is certificate|ye certificate)\b/.test(t)) {
    return true;
  }

  if (/^(kitne din|kab tak|kitna time|lagega|lagenge|how long)\??$/i.test(t)) {
    return true;
  }

  if (/^(phone number|phone|contact|email)\??$/i.test(t)) {
    return true;
  }

  if ((t.includes('kitne din') || t.includes('kab tak') || t.includes('lagega') || t.includes('lagenge') || t.includes('kitna time')) && t.length < 60) {
    return true;
  }

  if ((t.includes('kaise apply') || t.includes('apply kaise') || t.includes('kahan apply') || t.includes('where do i apply')) && !findService(message)) {
    return true;
  }

  if ((/^documents?\??$/i.test(t) || /^aur documents?\??$/i.test(t) || (t.includes('isme') && t.includes('chahiye'))) && !findService(message)) {
    return true;
  }

  if ((t.includes('what age proof') || t.includes('age proof') || t.includes('residence proof') || t.includes('address proof') || t.includes('additional documents') || t.includes('additional document') || t.includes('before uploading') || t.includes('what should i know') || t.includes('proof can i use') || t.includes('document alternatives')) && !findService(message)) {
    return true;
  }

  if ((t.includes('procedure') || t.includes('iska process')) && t.length < 50 && !findService(message)) {
    return true;
  }

  return false;
}

function isSdmContactFollowUp(message) {
  const t = message.toLowerCase().trim();
  return /^(phone number|phone|contact|email|call)\??$/i.test(t) || (t.length < 40 && /\b(phone|contact|email)\b/.test(t));
}

function resolveService(message, context = {}) {
  const matched = findService(message, context);
  if (matched) return matched;

  if (context?.serviceCode && isContextualFollowUp(message)) {
    return schemeService.getScheme(context.serviceCode);
  }

  if (context?.currentServiceCode) {
    const currentScheme = schemeService.getScheme(context.currentServiceCode);
    if (currentScheme && !/\b(new|different|another|other)\b/.test(normalizeText(message))) {
      return currentScheme;
    }
  }

  if (context?.currentService && !findService(message)) {
    const currentMatch = findService(context.currentService, context);
    if (currentMatch) return currentMatch;
  }

  return null;
}

function extractLocalityQuery(message) {
  const clean = message
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(which|where|what|is|the|sdm|office|i|should|visit|for|in|near|locate|find|my|address|jurisdiction|tell|me|about|area|sub|divisional)\b/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return clean.length >= 3 ? clean : message;
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

function mergeCombinedResponse(service, message) {
  const text = message.toLowerCase();
  const includeDocument = wantsDocumentQuery(text);
  const includeProcedure = wantsProcedureQuery(text);
  const includeTime = wantsProcessingTimeQuery(text);

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
  const serviceCode = service?.code || context.currentServiceCode || null;
  const topic = inferTopicFromQuestion(message);

  return {
    currentService: serviceTitle,
    currentServiceCode: serviceCode,
    lastIntent: intent,
    lastTopic: topic,
    recentMessages: Array.isArray(context.recentMessages) ? context.recentMessages.slice(-10) : []
  };
}

function processMessage({ message, profile = {}, context = {} }) {
  sdmLocator.loadData();

  if (isSdmContactFollowUp(message) && context?.sdmOffice?.sdmOffice) {
    const office = context.sdmOffice.sdmOffice;
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
      sdmOffice: context.sdmOffice
    };
  }

  const intent = detectIntent(message, context);
  const service = resolveService(message, context);
  const conversationMeta = buildConversationMeta(service, intent, message, context);

  if (intent === 'COMBINED_QUERY') {
    const response = mergeCombinedResponse(service, message);
    if (service) response.usedContext = !findService(message) && context?.serviceCode === service.code;
    return { ...conversationMeta, ...response };
  }

  if (intent === 'DOCUMENT_QUERY') {
    const doc = buildDocumentSection(service, message);
    if (service && !findService(message) && context?.serviceCode === service.code) doc.usedContext = true;
    return { ...conversationMeta, intent, ...doc };
  }

  if (intent === 'APPLICATION_QUERY') {
    const proc = buildProcedureSection(service);
    if (service && !findService(message) && context?.serviceCode === service.code) proc.usedContext = true;
    return { ...conversationMeta, intent, ...proc };
  }

  if (intent === 'PROCESSING_TIME_QUERY') {
    const time = buildProcessingTimeSection(service);
    if (service && !findService(message) && context?.serviceCode === service.code) time.usedContext = true;
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

    const profileKeys = Object.keys(profile || {}).filter(
      (k) => profile[k] !== undefined && profile[k] !== null && profile[k] !== ''
    );

    if (!profileKeys.length) {
      return {
        ...conversationMeta,
        intent,
        status: 'profile_required',
        answer: 'To check your eligibility accurately, please provide your profile details (e.g. age, annual family income, Delhi residency status, category, disability status, etc.).',
        service: service ? { code: service.code, title: service.title } : null,
        requiredProfileFields: [
          'age',
          'income',
          'delhiResident',
          'residenceYears',
          'category',
          'disability',
          'disabilityPercentage'
        ],
        results: []
      };
    }

    const evaluation = eligibilityService.evaluate(profile, schemes);
    const matched = service
      ? evaluation.filter(
          (r) => r.code === service.code || String(r.schemeId) === String(service._id)
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
        answer = `Eligibility evaluation for "${mainResult.title}" requires missing profile information. ${mainResult.reasons.join('; ')}`;
      }
    } else {
      const eligibleSchemes = matched.filter((m) => m.eligible === true).map((m) => m.title);
      answer = eligibleSchemes.length
        ? `Based on your profile, you meet criteria for: ${eligibleSchemes.join(', ')}.`
        : `Based on your profile, eligibility results evaluated for ${matched.length} scheme(s).`;
    }

    return {
      ...conversationMeta,
      intent,
      status: 'success',
      service: service ? { code: service.code, title: service.title } : null,
      answer,
      results: matched
    };
  }

  if (intent === 'SDM_QUERY') {
    const rawLocality = profile.locality || profile.address || extractLocalityQuery(message);
    let sdmResult = sdmLocator.locateSdmOffice(rawLocality);

    if ((!sdmResult || sdmResult.mappingStatus !== 'available') && rawLocality !== message) {
      sdmResult = sdmLocator.locateSdmOffice(message);
    }

    if (sdmResult && sdmResult.mappingStatus === 'available') {
      return {
        ...conversationMeta,
        intent,
        status: 'success',
        answer: `Locality "${sdmResult.locality}" (MCD Ward: ${sdmResult.ward}, AC: ${sdmResult.acName}) falls under SDM ${sdmResult.sdmJurisdiction.subDivision} (${sdmResult.sdmJurisdiction.area} District). Dedicated SDM Office: ${sdmResult.sdmOffice.name} at ${sdmResult.sdmOffice.address}.`,
        sdmOffice: sdmResult
      };
    }

    return {
      ...conversationMeta,
      intent,
      status: 'locality_required',
      answer: 'Please provide your locality, colony, or MCD ward name in Delhi to find your designated SDM jurisdiction and office.',
      sdmOffice: sdmResult || null
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
    answer: 'I can help you with Delhi e-District services, eligibility, required documents, application procedures, SDM jurisdiction and application tracking. What would you like help with?'
  };
}

module.exports = {
  detectIntent,
  findService,
  processMessage
};
