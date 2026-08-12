const eligibilityService = require('../services/eligibilityService');
const schemeService = require('../services/schemeService');

const profileFields = [
  'age', 'income', 'delhiResident', 'residenceYears', 'aadhaar',
  'receivesOtherPension', 'category', 'disability', 'disabilityPercentage',
  'gender', 'occupation', 'maritalStatus'
];

function isProvided(profile, field) {
  if (!Object.prototype.hasOwnProperty.call(profile, field)) return false;
  const value = profile[field];
  return value !== undefined && value !== null && value !== '';
}

function normalizeProfile(payload) {
  const profile = {
    ...payload,
    delhiResident: payload.delhiResident ?? payload.residencyInDelhi ?? payload.residency,
    aadhaar: payload.aadhaar ?? payload.hasAadhaar,
    income: payload.income ?? payload.annualIncome
  };

  if (typeof profile.disability === 'boolean') profile.disability = profile.disability ? 'yes' : 'no';
  if (typeof profile.category === 'string') profile.category = profile.category.toLowerCase();
  return profile;
}

function validateProfile(profile) {
  const providedFields = profileFields.filter((field) => isProvided(profile, field));
  if (providedFields.length === 0) {
    return { invalid: [], empty: true };
  }

  const invalid = [];
  ['age', 'income', 'residenceYears'].forEach((field) => {
    if (isProvided(profile, field) && (!Number.isFinite(Number(profile[field])) || Number(profile[field]) < 0)) invalid.push(field);
  });
  if (isProvided(profile, 'disabilityPercentage') && (!Number.isFinite(Number(profile.disabilityPercentage)) || Number(profile.disabilityPercentage) < 0)) {
    invalid.push('disabilityPercentage');
  }
  ['delhiResident', 'aadhaar', 'receivesOtherPension'].forEach((field) => {
    if (isProvided(profile, field) && typeof profile[field] !== 'boolean') invalid.push(field);
  });
  if (isProvided(profile, 'disability') && !['yes', 'no'].includes(profile.disability)) invalid.push('disability');
  return { invalid, empty: false };
}

exports.evaluate = (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Invalid profile', message: 'Provide a profile object in the request body.' });
  }

  const profile = normalizeProfile(req.body);
  const { invalid, empty } = validateProfile(profile);
  if (empty) {
    return res.status(400).json({
      error: 'Invalid or incomplete profile',
      message: 'Provide at least one profile field to evaluate eligibility.',
      missingFields: [],
      invalidFields: []
    });
  }
  if (invalid.length) {
    return res.status(400).json({
      error: 'Invalid or incomplete profile',
      message: 'Correct the invalid profile field values before evaluating.',
      missingFields: [],
      invalidFields: [...new Set(invalid)]
    });
  }

  const schemes = schemeService.getAllSchemes();
  const results = eligibilityService.evaluate(profile, schemes);
  const groups = { eligible: [], notEligible: [], unknown: [] };

  results.forEach((result) => {
    const scheme = schemes.find((item) => String(item._id) === String(result.schemeId) || item.id === result.schemeId);
    const payload = { scheme, code: result.code, title: result.title, reasons: result.reasons || [], reason: result.reasons?.[0] || null };
    if (result.eligible === true) groups.eligible.push(payload);
    else if (result.eligible === false) groups.notEligible.push(payload);
    else groups.unknown.push(payload);
  });

  return res.json(groups);
};
