const fs = require('fs');
const path = require('path');
const Scheme = require('../models/Scheme');

let localSchemes;

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

  localSchemes = records.map((record) => {
    // Use the existing schema to keep the local record shape MongoDB-compatible.
    const scheme = new Scheme({
      code: createCode(record.schemeName),
      title: record.schemeName,
      description: record.sourceNote,
      categories: [...new Set(extractCategories(record.rules))],
      eligibilityRules: record.rules,
      published: true
    }).toObject();

    return { ...scheme, id: scheme.code, dataSource: 'local-eligibility-rules' };
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
