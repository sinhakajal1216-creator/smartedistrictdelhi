// Simple eligibility engine placeholder. Replace with rule evaluator.

/**
 * Evaluate eligibility for a user profile against a list of schemes.
 * Returns array: [{ schemeId, eligible: boolean, reasons: [] }]
 */
exports.evaluate = (userProfile, schemes) => {
  if (!schemes || !Array.isArray(schemes)) return [];
  return schemes.map(s => {
    // naive: if eligibilityRules is empty, mark as eligible
    const rules = s.eligibilityRules || {};
    const eligible = Object.keys(rules).length === 0;
    const reasons = eligible ? ['No explicit exclusion rules found (stub)'] : ['Rules present — evaluation not implemented'];
    return { schemeId: s._id || s.id, code: s.code, title: s.title, eligible, reasons };
  });
};
