// Lightweight frontend eligibility engine.
// - Does NOT invent rules. Only evaluates predicates present in eligibilityRules.
// - Returns { status: 'eligible'|'not_eligible'|'unknown', reasons: [string] }

function hasAnyKnownRule(rules) {
  if (!rules || typeof rules !== 'object') return false
  const known = ['minAge','maxAge','residencyRequired','incomeBelow','genders','categories','occupations','disabilityRequired','maritalStatus']
  return Object.keys(rules).some(k => known.includes(k))
}

export function evaluateEligibility(profile, eligibilityRules) {
  // profile: { age, residency (boolean), income, gender, category, occupation, disability (boolean), maritalStatus }
  if (!eligibilityRules) {
    return { status: 'unknown', reason: 'Eligibility information unavailable' }
  }
  if (!hasAnyKnownRule(eligibilityRules)) {
    return { status: 'unknown', reason: 'Eligibility rules present but format unrecognized/unsupported' }
  }

  const failures = []
  const notes = []

  // Helper to check presence of profile values when rules require them
  const needField = (field) => (profile[field] === undefined || profile[field] === null || profile[field] === '')

  // minAge
  if (eligibilityRules.minAge !== undefined) {
    if (needField('age')) return { status: 'unknown', reason: 'Age required to evaluate this scheme' }
    if (Number(profile.age) < Number(eligibilityRules.minAge)) failures.push(`Requires minimum age ${eligibilityRules.minAge}`)
    else notes.push(`Meets minimum age ${eligibilityRules.minAge}`)
  }
  if (eligibilityRules.maxAge !== undefined) {
    if (needField('age')) return { status: 'unknown', reason: 'Age required to evaluate this scheme' }
    if (Number(profile.age) > Number(eligibilityRules.maxAge)) failures.push(`Requires age ≤ ${eligibilityRules.maxAge}`)
    else notes.push(`Within maximum age ${eligibilityRules.maxAge}`)
  }

  if (eligibilityRules.residencyRequired !== undefined) {
    if (eligibilityRules.residencyRequired === true) {
      if (needField('residency')) return { status: 'unknown', reason: 'Residency information required' }
      if (!profile.residency) failures.push('Requires residency in Delhi')
      else notes.push('Residency requirement satisfied')
    }
  }

  if (eligibilityRules.incomeBelow !== undefined) {
    if (needField('income')) return { status: 'unknown', reason: 'Income required to evaluate this scheme' }
    const inc = Number(profile.income)
    if (Number.isNaN(inc)) return { status: 'unknown', reason: 'Income value invalid' }
    if (inc > Number(eligibilityRules.incomeBelow)) failures.push(`Requires annual income ≤ ${eligibilityRules.incomeBelow}`)
    else notes.push(`Income ≤ ${eligibilityRules.incomeBelow}`)
  }

  if (eligibilityRules.genders !== undefined) {
    if (needField('gender')) return { status: 'unknown', reason: 'Gender required to evaluate this scheme' }
    const allowed = Array.isArray(eligibilityRules.genders) ? eligibilityRules.genders.map(String) : [String(eligibilityRules.genders)]
    if (!allowed.includes(String(profile.gender))) failures.push(`Eligible genders: ${allowed.join(', ')}`)
    else notes.push(`Gender matches (${profile.gender})`)
  }

  if (eligibilityRules.categories !== undefined) {
    if (needField('category')) return { status: 'unknown', reason: 'Category required to evaluate this scheme' }
    const allowed = Array.isArray(eligibilityRules.categories) ? eligibilityRules.categories : [eligibilityRules.categories]
    if (!allowed.map(String).includes(String(profile.category))) failures.push(`Eligible categories: ${allowed.join(', ')}`)
    else notes.push(`Category matches (${profile.category})`)
  }

  if (eligibilityRules.occupations !== undefined) {
    if (needField('occupation')) return { status: 'unknown', reason: 'Occupation required to evaluate this scheme' }
    const allowed = Array.isArray(eligibilityRules.occupations) ? eligibilityRules.occupations.map(s => s.toLowerCase()) : [String(eligibilityRules.occupations).toLowerCase()]
    if (!allowed.includes(String(profile.occupation).toLowerCase())) failures.push(`Eligible occupations: ${allowed.join(', ')}`)
    else notes.push(`Occupation matches (${profile.occupation})`)
  }

  if (eligibilityRules.disabilityRequired !== undefined) {
    if (needField('disability')) return { status: 'unknown', reason: 'Disability status required to evaluate this scheme' }
    const required = !!eligibilityRules.disabilityRequired
    if (required && !profile.disability) failures.push('Requires applicant to have a disability')
    else if (required && profile.disability) notes.push('Disability requirement satisfied')
  }

  if (eligibilityRules.maritalStatus !== undefined) {
    if (needField('maritalStatus')) return { status: 'unknown', reason: 'Marital status required to evaluate this scheme' }
    const allowed = Array.isArray(eligibilityRules.maritalStatus) ? eligibilityRules.maritalStatus : [eligibilityRules.maritalStatus]
    if (!allowed.map(String).includes(String(profile.maritalStatus))) failures.push(`Eligible marital status: ${allowed.join(', ')}`)
    else notes.push(`Marital status matches (${profile.maritalStatus})`)
  }

  // Final decision
  if (failures.length > 0) {
    return { status: 'not_eligible', reasons: failures }
  }

  if (notes.length > 0) {
    return { status: 'eligible', reasons: notes }
  }

  // If we get here, rules existed but none matched recognized predicates
  return { status: 'unknown', reason: 'Eligibility rules present but insufficient to make a determination' }
}

export default { evaluateEligibility }
