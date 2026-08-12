const schemeService = require('../services/schemeService');

exports.list = (req, res) => {
  const schemes = schemeService.listSchemes(req.query);
  res.json({ schemes, total: schemes.length, source: 'local-eligibility-rules' });
};

exports.departments = (req, res) => {
  res.json({ departments: schemeService.getDepartments() });
};

exports.categories = (req, res) => {
  res.json({ categories: schemeService.getCategories() });
};

exports.getById = (req, res) => {
  const scheme = schemeService.getScheme(req.params.id);
  if (!scheme) return res.status(404).json({ error: 'Scheme not found' });
  return res.json({ scheme });
};
