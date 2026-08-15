const fs = require('fs');
const path = require('path');

const dataPath = path.join(
  __dirname,
  '../data/documentRequirements.json'
);

function loadDocumentRequirements() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

function getDocumentsForService(serviceCode) {
  const data = loadDocumentRequirements();

  return (
    data.services.find(
      service => service.serviceCode === serviceCode
    ) || null
  );
}

function getOnlineDocuments(serviceCode) {
  const service = getDocumentsForService(serviceCode);
  return service ? service.onlineSubmissionDocuments : [];
}

function getOfficeVerificationDocuments(serviceCode) {
  const service = getDocumentsForService(serviceCode);

  return service
    ? service.officeVerificationDocuments
    : [];
}

function getAdditionalDocuments(serviceCode) {
  const service = getDocumentsForService(serviceCode);

  return service
    ? service.additionalDocuments
    : [];
}

function getDocumentAlternatives(serviceCode) {
  const service = getDocumentsForService(serviceCode);

  return service
    ? service.documentAlternatives
    : [];
}

function getDocumentSources(serviceCode) {
  const service = getDocumentsForService(serviceCode);

  return service
    ? service.sources
    : [];
}

module.exports = {
  loadDocumentRequirements,
  getDocumentsForService,
  getOnlineDocuments,
  getOfficeVerificationDocuments,
  getAdditionalDocuments,
  getDocumentAlternatives,
  getDocumentSources
};