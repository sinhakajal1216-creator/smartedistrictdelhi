const MAX_MESSAGE_LENGTH = 2000;
const MAX_AUDIO_BASE64_LENGTH = 750000;
const MAX_QUERY_LENGTH = 120;
const MAX_RECENT_MESSAGES = 9;

const PROFILE_FIELDS = [
  'age',
  'income',
  'delhiResident',
  'residency',
  'residenceYears',
  'aadhaar',
  'receivesOtherPension',
  'category',
  'disability',
  'disabilityPercentage',
  'gender',
  'occupation',
  'maritalStatus',
  'locality',
  'address'
];

function pickAllowedProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const field of PROFILE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;
    const value = input[field];
    if (value === undefined || typeof value === 'function') continue;
    if (typeof value === 'string') out[field] = value.slice(0, 120);
    else if (typeof value === 'number' || typeof value === 'boolean') out[field] = value;
  }
  return out;
}

function sanitizeContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};

  const out = {};
  const stringFields = [
    'serviceCode',
    'currentServiceCode',
    'currentService',
    'lastIntent',
    'intent',
    'lastTopic',
    'lastLocality',
    'pendingEligibilityField'
  ];

  for (const field of stringFields) {
    if (typeof context[field] === 'string' && context[field].trim()) {
      out[field] = context[field].trim().slice(0, 160);
    }
  }

  if (Array.isArray(context.recentMessages)) {
    out.recentMessages = context.recentMessages.slice(-MAX_RECENT_MESSAGES).map((item) => ({
      sender: item && item.sender === 'user' ? 'user' : 'bot',
      text: String(item && item.text ? item.text : '').slice(0, 500)
    }));
  }

  if (context.eligibilityProfile) {
    out.eligibilityProfile = pickAllowedProfile(context.eligibilityProfile);
  }

  if (context.lastSdmOffice && typeof context.lastSdmOffice === 'object') {
    out.lastSdmOffice = context.lastSdmOffice;
    out.sdmOffice = context.lastSdmOffice;
  } else if (context.sdmOffice && typeof context.sdmOffice === 'object') {
    out.sdmOffice = context.sdmOffice;
    out.lastSdmOffice = context.sdmOffice;
  }

  return out;
}

function sanitizeLang(lang) {
  const value = String(lang || 'en').toLowerCase().slice(0, 8);
  return value === 'hi' ? 'hi' : 'en';
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  MAX_AUDIO_BASE64_LENGTH,
  MAX_QUERY_LENGTH,
  pickAllowedProfile,
  sanitizeContext,
  sanitizeLang
};
