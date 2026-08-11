const fs = require('fs');
const path = require('path');

let wardData;
let localityIndex;
let jurisdictionByWard;
let officeByName;

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(__dirname, relativePath), 'utf-8'));

function loadData() {
  if (wardData) return wardData;
  wardData = readJson('../data/mcd_wards_2022_delimitation.json');
  const jurisdictions = readJson('../data/sdm_jurisdictions_2025_official_general_administration.json');
  const offices = readJson('../data/sdm_offices_delhi_post_2025_reorganisation.json');
  localityIndex = {};
  jurisdictionByWard = {};
  officeByName = {};

  wardData.wards.forEach((ward) => (ward.entries || []).forEach((entry) => {
    String(entry.locality || '').split(/[,\n]+/).map((locality) => locality.trim()).filter(Boolean).forEach((locality) => {
      const key = normalize(locality);
      if (key.length < 3) return;
      (localityIndex[key] ||= []).push({ locality, wardNumber: ward.wardNumber, wardName: ward.wardName, acName: entry.acName, sourcePage: entry.sourcePage });
    });
  }));
  jurisdictions.forEach((jurisdiction) => (jurisdiction.mcdWards || []).forEach((wardName) => {
    (jurisdictionByWard[normalize(wardName)] ||= []).push(jurisdiction);
  }));
  offices.forEach((office) => {
    (officeByName[normalize(office.name)] ||= []).push(office);
  });
  return wardData;
}

function searchLocality(query) {
  if (!query || typeof query !== 'string') return null;
  const key = normalize(query);
  if (key.length < 3) return null;
  if (localityIndex[key]?.length) return localityIndex[key][0];
  if (key.length >= 4) return Object.entries(localityIndex).find(([locality]) => locality.includes(key))?.[1][0] || null;
  return null;
}

function unavailable(ward, reason) {
  return {
    mappingStatus: 'unavailable', locality: ward.locality, ward: ward.wardName, wardNumber: ward.wardNumber, acName: ward.acName,
    sdmJurisdiction: null, sdmOffice: null, mappingUnavailableReason: reason,
    sources: { localityWard: { authority: wardData.source.authority, document: wardData.source.document, sourcePage: ward.sourcePage } }
  };
}

function locateSdmOffice(query) {
  const ward = searchLocality(query);
  if (!ward) return null;
  const jurisdictions = jurisdictionByWard[normalize(ward.wardName)] || [];
  if (jurisdictions.length !== 1) {
    return unavailable(ward, jurisdictions.length === 0
      ? 'This MCD ward is not present in the available SDM jurisdiction dataset.'
      : 'This MCD ward appears in more than one available SDM jurisdiction record.');
  }
  const jurisdiction = jurisdictions[0];
  const offices = officeByName[normalize(jurisdiction.subDivision)] || [];
  if (offices.length !== 1) {
    return unavailable(ward, offices.length === 0
      ? 'The mapped SDM jurisdiction has no matching office in the available SDM office dataset.'
      : 'The mapped SDM jurisdiction has more than one matching office in the available SDM office dataset.');
  }
  const office = offices[0];
  return {
    mappingStatus: 'available', locality: ward.locality, ward: ward.wardName, wardNumber: ward.wardNumber, acName: ward.acName,
    sdmJurisdiction: { code: jurisdiction.subDivisionCode, area: jurisdiction.area, subDivision: jurisdiction.subDivision, administrationType: jurisdiction.administrationType, notes: jurisdiction.notes },
    sdmOffice: {
      code: office.code, name: office.name, officer: null, designation: null, address: office.fullAddress, pincode: office.pincode,
      contact: { phone: office.phone, email: office.email },
      coordinates: office.latitude !== null && office.longitude !== null ? { latitude: office.latitude, longitude: office.longitude } : null,
      reference: office.notes
    },
    sources: {
      localityWard: { authority: wardData.source.authority, document: wardData.source.document, sourcePage: ward.sourcePage },
      jurisdiction: { source: jurisdiction.source, sourceUrl: jurisdiction.sourceUrl, sourceDate: jurisdiction.sourceDate },
      office: { code: office.code, reference: office.notes }
    }
  };
}

module.exports = { loadData, locateSdmOffice };
