const fs = require('fs');
const path = require('path');
const Scheme = require('../models/Scheme');

let localSchemes;
let guidanceByCode;
let documentByCode;

function createCode(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractCategories(rule) {
  if (!rule || typeof rule !== 'object') return [];
  if (Array.isArray(rule.all)) return rule.all.flatMap(extractCategories);
  if (Array.isArray(rule.any)) return rule.any.flatMap(extractCategories);
  if (rule.field !== 'category') return [];
  if (rule.operator === '==' && rule.value) return [String(rule.value)];
  if (rule.operator === 'in' && Array.isArray(rule.value)) return rule.value.map(String);
  return [];
}

function loadLocalSchemes() {
  if (localSchemes) return localSchemes;

  const sourcePath = path.join(__dirname, '../data/eligibilityRules.json');
  const records = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  const serviceGuidancePath = path.join(__dirname, '../data/serviceGuidance.json');
  const documentRequirementsPath = path.join(__dirname, '../data/documentRequirements.json');
  const guidanceRecords = JSON.parse(fs.readFileSync(serviceGuidancePath, 'utf-8')).services || [];
  const documentRecords = JSON.parse(fs.readFileSync(documentRequirementsPath, 'utf-8')).services || [];

  guidanceByCode = new Map(guidanceRecords.map((item) => [item.serviceCode, item]));
  documentByCode = new Map(documentRecords.map((item) => [item.serviceCode, item]));

  localSchemes = records.map((record) => {
    const generatedCode = createCode(record.schemeName);
    const guidance = guidanceByCode.get(generatedCode) || null;
    const documentInfo = documentByCode.get(generatedCode) || null;

    const sourceLinks = [
      ...(Array.isArray(documentInfo?.sources) ? documentInfo.sources : [])
    ];
    const officialLink = guidance?.officialUrl || sourceLinks[0]?.url || undefined;

    // Use the existing schema to keep the local record shape MongoDB-compatible.
    const scheme = new Scheme({
      code: generatedCode,
      title: record.schemeName,
      description: record.sourceNote,
      categories: [...new Set(extractCategories(record.rules))],
      eligibilityRules: record.rules,
      department: guidance?.department,
      officialLink,
      published: true
    }).toObject();

    return {
      ...scheme,
      id: scheme.code,
      whereToApply: guidance?.whereToApply || null,
      processingTime: guidance?.processingTime || null,
      steps: guidance?.procedure || [],
      requiredDocuments: documentInfo
        ? [
            ...(documentInfo.onlineSubmissionDocuments || []),
            ...(documentInfo.officeVerificationDocuments || [])
          ]
        : [],
      documentSources: sourceLinks,
      guidanceVerificationStatus: guidance?.officialSource?.verificationStatus || null,
      documentsVerificationStatus: documentInfo?.verificationStatus || null,
      dataSource: 'local-eligibility-rules'
    };
  });

  return localSchemes;
}

function matchesText(scheme, query) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [scheme.code, scheme.title, scheme.description].some((value) => String(value || '').toLowerCase().includes(needle));
}

function listSchemes({ q, department, category, limit } = {}) {
  const result = loadLocalSchemes().filter((scheme) => {
    const departmentMatches = !department || String(scheme.department || '').toLowerCase() === department.toLowerCase();
    const categoryMatches = !category || scheme.categories.some((item) => item.toLowerCase() === category.toLowerCase());
    return matchesText(scheme, q) && departmentMatches && categoryMatches;
  });

  const parsedLimit = Number.parseInt(limit, 10);
  return Number.isInteger(parsedLimit) && parsedLimit > 0 ? result.slice(0, parsedLimit) : result;
}

function getScheme(id) {
  return loadLocalSchemes().find((scheme) => String(scheme._id) === String(id) || scheme.id === id || scheme.code === id) || null;
}

function getAllSchemes() {
  return loadLocalSchemes();
}

function getDepartments() {
  return [...new Set(loadLocalSchemes().map((scheme) => scheme.department).filter(Boolean))].sort();
}

function getCategories() {
  return [...new Set(loadLocalSchemes().flatMap((scheme) => scheme.categories).filter(Boolean))].sort();
}

module.exports = { listSchemes, getScheme, getAllSchemes, getDepartments, getCategories };
