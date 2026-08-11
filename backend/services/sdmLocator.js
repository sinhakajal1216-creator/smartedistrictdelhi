const fs = require('fs');
const path = require('path');

let wardData = null;
let localityIndex = null;

function loadData() {
  if (wardData) return wardData;
  
  const dataPath = path.join(__dirname, '../data/mcd_wards_2022_delimitation.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  wardData = JSON.parse(rawData);
  
  buildLocalityIndex();
  return wardData;
}

function buildLocalityIndex() {
  localityIndex = {};
  
  wardData.wards.forEach(ward => {
    if (ward.entries && Array.isArray(ward.entries)) {
      ward.entries.forEach(entry => {
        if (entry.locality) {
          const localities = entry.locality
            .split(/[,\n]+/)
            .map(loc => loc.trim())
            .filter(loc => loc.length > 0);
          
          localities.forEach(locality => {
            const normalized = normalizeString(locality);
            if (normalized.length >= 3) {
              if (!localityIndex[normalized]) {
                localityIndex[normalized] = [];
              }
              localityIndex[normalized].push({
                locality,
                wardNumber: ward.wardNumber,
                wardName: ward.wardName,
                acName: entry.acName
              });
            }
          });
        }
      });
    }
  });
}

function normalizeString(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function searchLocality(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }
  
  const normalized = normalizeString(query);
  
  if (normalized.length < 3) {
    return null;
  }
  
  if (localityIndex[normalized]) {
    const matches = localityIndex[normalized];
    if (matches.length > 0) {
      return matches[0];
    }
  }
  
  if (normalized.length >= 4) {
    for (const [key, matches] of Object.entries(localityIndex)) {
      if (key.includes(normalized) && matches.length > 0) {
        return matches[0];
      }
    }
  }
  
  return null;
}

module.exports = {
  loadData,
  searchLocality
};
