const jurisdictionEngine = require('./jurisdictionEngine');

/**
 * Resolve a user-provided location.
 * Inputs: { address, ward, area, subDivision }
 * Rules:
 *  - If ward provided: use jurisdictionEngine.resolveLocation (which uses SDMJurisdiction)
 *  - If address provided but no ward: do NOT guess; return WARD_REQUIRED
 *  - If both provided: use ward and include address in response
 */
async function resolveUserLocation({ address, ward, area, subDivision }) {
  // normalize inputs
  const addr = (address === undefined) ? undefined : String(address).trim();
  const w = (ward === undefined) ? undefined : String(ward).trim();
  const a = (area === undefined) ? undefined : String(area).trim();
  const sd = (subDivision === undefined) ? undefined : String(subDivision).trim();

  // No input
  if (!addr && !w && !a && !sd) {
    return { error: 'missing_location' };
  }

  // Address only (no ward) -> require ward
  if (addr && !w) {
    return { status: 'WARD_REQUIRED', message: 'The address must be resolved to an MCD ward before determining the SDM jurisdiction.', address: addr };
  }

  // Ward provided -> resolve using jurisdiction engine
  if (w) {
    // pass area and subDivision as disambiguation hints
    const res = await jurisdictionEngine.resolveLocation({ ward: w, area: a, subDivision: sd });
    // res may be { jurisdiction:null, sdmOffice:null } or { ambiguous:true, matches } or { jurisdiction, sdmOffice }
    // include address if present
    if (res && !res.ambiguous && res.jurisdiction) {
      return { jurisdiction: res.jurisdiction, sdmOffice: res.sdmOffice, address: addr || null };
    }
    return res;
  }

  // Fallback
  return { error: 'unhandled' };
}

module.exports = { resolveUserLocation };
