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

function detectIntent(message) {
  const text = message.toLowerCase();

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
    text.includes('smart e-district') ||
    text.includes('chatbot') ||
    text.includes('about')
  ) {
    return 'PROJECT_QUERY';
  }

  return 'GENERAL_QUERY';
}

function serviceMatchTerms(scheme) {
  const terms = new Set([
    String(scheme.title || '').toLowerCase(),
    String(scheme.code || '').replace(/-/g, ' ')
  ]);

  const withoutParens = String(scheme.title || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
  if (withoutParens.length >= 3) terms.add(withoutParens);
  const withoutSuffix = withoutParens.replace(/\s+(scheme|certificate)$/i, '').trim();
  if (withoutSuffix.length >= 3) terms.add(withoutSuffix);

  const abbrevMatches = String(scheme.title || '').match(/\(([^)]+)\)/g);
  if (abbrevMatches) {
    abbrevMatches.forEach((part) => {
      const inner = part.replace(/[()]/g, '').trim().toLowerCase();
      if (inner.length >= 2) {
        terms.add(inner);
        if (withoutParens.includes('certificate')) {
          terms.add(`${inner} certificate`);
        }
      }
    });
  }

  return terms;
}

function findService(message) {
  const schemes = schemeService.getAllSchemes();
  const text = message.toLowerCase();
  const candidates = [];

  for (const scheme of schemes) {
    for (const term of serviceMatchTerms(scheme)) {
      if (term.length >= 3 && text.includes(term)) {
        candidates.push({ scheme, len: term.length });
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.len - a.len);
  return candidates[0].scheme;
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
  const matched = findService(message);
  if (matched) return matched;

  if (context?.serviceCode && isContextualFollowUp(message)) {
    return schemeService.getScheme(context.serviceCode);
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
    alternatives: [],
    verificationNotes: []
  };
}

function formatDocumentsPayload(docRecord) {
  return {
    onlineSubmission: docRecord.onlineSubmissionDocuments || [],
    officeVerification: docRecord.officeVerificationDocuments || [],
    additional: docRecord.additionalDocuments || [],
    alternatives: docRecord.documentAlternatives || [],
    verificationNotes: docRecord.verificationNotes || []
  };
}

function buildDocumentSection(service) {
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

  if (verificationStatus === 'unverified') {
    return {
      status: 'unverified',
      service: serviceInfo,
      answer: `The official document requirements for "${docRecord.serviceTitle}" are currently UNVERIFIED against published Delhi e-District standards. Unverified documents are not shown as confirmed mandatory requirements.`,
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
      answer: hasChecklist
        ? `Partially verified document information for "${docRecord.serviceTitle}". Some details may still be pending official confirmation.`
        : `Document checklist for "${docRecord.serviceTitle}" is only partially verified. A complete official checklist is not yet confirmed — do not treat any guessed list as mandatory.`,
      documents,
      sources,
      verificationStatus: 'partially_verified',
      guidanceNotes: notes
    };
  }

  return {
    status: 'success',
    service: serviceInfo,
    answer: `Verified document requirements for "${docRecord.serviceTitle}":`,
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
    const doc = buildDocumentSection(service);
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
      intent: 'SDM_QUERY',
      status: 'success',
      usedContext: true,
      answer: parts.length
        ? `Contact information for ${office.name}: ${parts.join('; ')}.`
        : `No phone or email is available in the current SDM office record for ${office.name}.`,
      sdmOffice: context.sdmOffice
    };
  }

  const intent = detectIntent(message);
  const service = resolveService(message, context);

  if (intent === 'COMBINED_QUERY') {
    const response = mergeCombinedResponse(service, message);
    if (service) response.usedContext = !findService(message) && context?.serviceCode === service.code;
    return response;
  }

  if (intent === 'DOCUMENT_QUERY') {
    const doc = buildDocumentSection(service);
    if (service && !findService(message) && context?.serviceCode === service.code) doc.usedContext = true;
    return { intent, ...doc };
  }

  if (intent === 'APPLICATION_QUERY') {
    const proc = buildProcedureSection(service);
    if (service && !findService(message) && context?.serviceCode === service.code) proc.usedContext = true;
    return { intent, ...proc };
  }

  if (intent === 'PROCESSING_TIME_QUERY') {
    const time = buildProcessingTimeSection(service);
    if (service && !findService(message) && context?.serviceCode === service.code) time.usedContext = true;
    return { intent, ...time };
  }

  if (intent === 'ELIGIBILITY_QUERY') {
    const schemes = schemeService.getAllSchemes();

    const profileKeys = Object.keys(profile || {}).filter(
      (k) => profile[k] !== undefined && profile[k] !== null && profile[k] !== ''
    );

    if (!profileKeys.length) {
      return {
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
        intent,
        status: 'success',
        answer: `Locality "${sdmResult.locality}" (MCD Ward: ${sdmResult.ward}, AC: ${sdmResult.acName}) falls under SDM ${sdmResult.sdmJurisdiction.subDivision} (${sdmResult.sdmJurisdiction.area} District). Dedicated SDM Office: ${sdmResult.sdmOffice.name} at ${sdmResult.sdmOffice.address}.`,
        sdmOffice: sdmResult
      };
    }

    return {
      intent,
      status: 'locality_required',
      answer: 'Please provide your locality, colony, or MCD ward name in Delhi to find your designated SDM jurisdiction and office.',
      sdmOffice: sdmResult || null
    };
  }

  if (intent === 'PROJECT_QUERY') {
    return {
      intent,
      status: 'success',
      answer: 'Smart e-District Delhi is a citizen assistance layer for Delhi e-District services. It uses verified document checklists, eligibility checking, SDM jurisdiction lookup, and service guidance from official Delhi e-District listings where verified.'
    };
  }

  return {
    intent,
    status: 'success',
    answer: 'I am your Smart e-District Delhi assistant. I can guide you on document requirements, eligibility, application steps, processing timelines, and finding your designated SDM office.'
  };
}

module.exports = {
  detectIntent,
  findService,
  processMessage
};
