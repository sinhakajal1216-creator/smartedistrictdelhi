const SDMJurisdiction = require('../models/SDMJurisdiction');
const SDMOffice = require('../models/SDMOffice');

/**
 * Resolve a jurisdiction given ward and optional area/subDivision.
 * Returns { jurisdiction, sdmOffice } where jurisdiction is the SDMJurisdiction document
 * and sdmOffice is the linked SDMOffice document (if any).
 */
async function resolveByWard({ ward, area, subDivision }) {
  if (!ward) return { error: 'ward_required' };

  // search for ward case-insensitive exact match in mcdWards array
  const jurisdiction = await SDMJurisdiction.findOne({ mcdWards: { $elemMatch: { $regex: new RegExp('^' + escapeRegExp(ward) + '$', 'i') } } }).lean();
  if (!jurisdiction) return { jurisdiction: null, sdmOffice: null };

  let sdmOffice = null;
  if (jurisdiction.linkedOfficeCode) {
    sdmOffice = await SDMOffice.findOne({ code: jurisdiction.linkedOfficeCode }).lean();
  } else if (jurisdiction.subDivision) {
    // try name-based match
    sdmOffice = await SDMOffice.findOne({ title: new RegExp('^' + escapeRegExp(jurisdiction.subDivision) + '$', 'i') }).lean();
  }

  return { jurisdiction, sdmOffice };
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveLocation({ ward, area, subDivision }) {
  if (!ward) return { error: 'ward_required' };

  // find all jurisdictions that include the ward (case-insensitive whole-word match)
  const regex = new RegExp('^' + escapeRegExp(String(ward).trim()) + '$', 'i');
  const matches = await SDMJurisdiction.find({ mcdWards: { $elemMatch: { $regex: regex } } }).lean();

  if (!matches || matches.length === 0) {
    return { jurisdiction: null, sdmOffice: null };
  }

  if (matches.length === 1) {
    const jurisdiction = matches[0];
    let sdmOffice = null;
    if (jurisdiction.linkedOfficeCode) {
      sdmOffice = await SDMOffice.findOne({ code: jurisdiction.linkedOfficeCode }).lean();
    } else if (jurisdiction.subDivision) {
      sdmOffice = await SDMOffice.findOne({ name: new RegExp('^' + escapeRegExp(jurisdiction.subDivision) + '$', 'i') }).lean();
    }
    return { jurisdiction, sdmOffice };
  }

  // multiple matches - try to disambiguate using subDivision then area
  if (subDivision) {
    const bySub = matches.filter(m => (m.subDivision || '').trim().toLowerCase() === String(subDivision).trim().toLowerCase());
    if (bySub.length === 1) {
      const jurisdiction = bySub[0];
      const sdmOffice = jurisdiction.linkedOfficeCode ? await SDMOffice.findOne({ code: jurisdiction.linkedOfficeCode }).lean() : null;
      return { jurisdiction, sdmOffice };
    }
    if (bySub.length > 1) return { ambiguous: true, matches: bySub };
  }

  if (area) {
    const byArea = matches.filter(m => (m.area || '').trim().toLowerCase() === String(area).trim().toLowerCase());
    if (byArea.length === 1) {
      const jurisdiction = byArea[0];
      const sdmOffice = jurisdiction.linkedOfficeCode ? await SDMOffice.findOne({ code: jurisdiction.linkedOfficeCode }).lean() : null;
      return { jurisdiction, sdmOffice };
    }
    if (byArea.length > 1) return { ambiguous: true, matches: byArea };
  }

  // still ambiguous - return ambiguity information rather than guessing
  return { ambiguous: true, matches };
}

module.exports = { resolveByWard, resolveLocation };
