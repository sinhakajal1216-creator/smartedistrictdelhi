const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/serviceGuidance.json');

function loadServiceGuidance() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

function getGuidanceForService(serviceCode) {
  const data = loadServiceGuidance();
  return data.services.find((service) => service.serviceCode === serviceCode) || null;
}

module.exports = {
  loadServiceGuidance,
  getGuidanceForService
};
