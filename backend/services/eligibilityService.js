// Generic eligibility evaluator
// - Evaluates rule objects stored on each scheme under `eligibilityRules`.
// - Supports predicate operators: >=, <=, >, <, ==, !=, in, not_in
// - Supports logical combinators: { all: [ ... ] } (AND), { any: [ ... ] } (OR)
// - Returns array: [{ schemeId, code, title, eligible: true|false|null, reasons: [string] }]

function isNumeric(v) {
  return typeof v === 'number' || (typeof v !== 'boolean' && !Number.isNaN(Number(v)) && String(v).trim() !== '');
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatVal(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

// Evaluate a single predicate against profile
// predicate: { field, op, value }
// returns { result: true|false|null, reason }
function evalPredicate(profile, pred) {
  if (!pred || typeof pred !== 'object') return { result: null, reason: 'Invalid predicate' };
  const field = pred.field || pred.f || '';
  const op = pred.op || pred.operator || '';
  const value = pred.value;
  if (!field || !op) return { result: null, reason: 'Predicate missing field or op' };

  const profileHas = Object.prototype.hasOwnProperty.call(profile, field) && profile[field] !== null && profile[field] !== undefined && profile[field] !== '';
  const profileVal = profile[field];

  if (!profileHas) {
    return { result: null, reason: `Missing profile field '${field}' — cannot evaluate` };
  }

  // perform comparisons
  // numeric compare when possible
  if (op === 'in' || op === 'not_in') {
    const list = Array.isArray(value) ? value : [value];
    const match = list.map(String).includes(String(profileVal));
    const res = op === 'in' ? match : !match;
    const reason = `Field ${field} (${formatVal(profileVal)}) ${op} [${list.map(formatVal).join(', ')}] => ${res ? 'pass' : 'fail'}`;
    return { result: res, reason };
  }

  // numeric if both numeric-like
  if (isNumeric(profileVal) && isNumeric(value)) {
    const p = Number(profileVal);
    const v = Number(value);
    let res = false;
    switch (op) {
      case '>=': res = p >= v; break;
      case '<=': res = p <= v; break;
      case '>': res = p > v; break;
      case '<': res = p < v; break;
      case '==': res = p === v; break;
      case '!=': res = p !== v; break;
      default: return { result: null, reason: `Unsupported operator '${op}'` };
    }
    const reason = `Field ${field} (${p}) ${op} ${v} => ${res ? 'pass' : 'fail'}`;
    return { result: res, reason };
  }

  // string/boolean comparisons
  switch (op) {
    case '==': {
      const res = String(profileVal) === String(value);
      return { result: res, reason: `Field ${field} (${formatVal(profileVal)}) == ${formatVal(value)} => ${res ? 'pass' : 'fail'}` };
    }
    case '!=': {
      const res = String(profileVal) !== String(value);
      return { result: res, reason: `Field ${field} (${formatVal(profileVal)}) != ${formatVal(value)} => ${res ? 'pass' : 'fail'}` };
    }
    default:
      return { result: null, reason: `Operator ${op} unsupported for non-numeric values` };
  }
}

// Evaluate a rule node which can be a predicate or logical combinator
// node can be: { field, op, value } or { all: [...] } or { any: [...] }
// returns { result: true|false|null, reasons: [string] }
function evalNode(profile, node) {
  if (!node) return { result: null, reasons: ['No rules'] };

  // logical AND
  if (node.all && Array.isArray(node.all)) {
    const reasons = [];
    let anyUnknown = false;
    for (const child of node.all) {
      const r = evalNode(profile, child);
      reasons.push(...(r.reasons || []));
      if (r.result === false) return { result: false, reasons };
      if (r.result === null) anyUnknown = true;
    }
    if (anyUnknown) return { result: null, reasons };
    return { result: true, reasons };
  }

  // logical OR
  if (node.any && Array.isArray(node.any)) {
    const reasons = [];
    let anyUnknown = false;
    let anyTrue = false;
    for (const child of node.any) {
      const r = evalNode(profile, child);
      reasons.push(...(r.reasons || []));
      if (r.result === true) { anyTrue = true; break; }
      if (r.result === null) anyUnknown = true;
    }
    if (anyTrue) return { result: true, reasons };
    if (anyUnknown) return { result: null, reasons };
    return { result: false, reasons };
  }

  // predicate
  const predEval = evalPredicate(profile, node);
  return { result: predEval.result, reasons: [predEval.reason] };
}

exports.evaluate = (userProfile, schemes) => {
  if (!Array.isArray(schemes)) return [];
  const results = [];
  for (const s of schemes) {
    const rules = s.eligibilityRules;
    // if no rules provided, mark unknown (do not assume eligible)
    if (!rules || (typeof rules === 'object' && Object.keys(rules).length === 0)) {
      results.push({ schemeId: s._id || s.id, code: s.code, title: s.title, eligible: null, reasons: ['No eligibility rules available'] });
      continue;
    }

    const evalRes = evalNode(userProfile, rules);
    // normalize result to boolean or null
    const eligible = evalRes.result === true ? true : (evalRes.result === false ? false : null);
    const reasons = evalRes.reasons || [];
    results.push({ schemeId: s._id || s.id, code: s.code, title: s.title, eligible, reasons });
  }
  return results;
};
