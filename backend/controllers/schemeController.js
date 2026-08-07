const Scheme = require('../models/Scheme');

exports.list = async (req, res) => {
  try {
    const { q, department, category } = req.query;
    let { limit = 50, skip = 0 } = req.query;

    // parse and validate pagination params
    limit = parseInt(limit, 10);
    skip = parseInt(skip, 10);
    if (Number.isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }
    if (Number.isNaN(skip) || skip < 0) {
      return res.status(400).json({ error: 'Invalid skip parameter' });
    }
    const lim = Math.min(limit, 200);
    const sk = skip;

    const filters = {};
    if (department) filters.department = department;
    if (category) filters.categories = category;

    if (q) {
      // simple case-insensitive substring search across title, description, code
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filters.$or = [{ title: re }, { description: re }, { code: re }];
    }

    const schemes = await Scheme.find(filters).sort({ createdAt: -1 }).skip(sk).limit(lim).lean();
    res.json({ schemes });
  } catch (err) {
    console.error('scheme list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Return list of distinct departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Scheme.distinct('department');
    // filter out empty/null and sort
    const list = departments.filter(d => d).sort();
    res.json({ departments: list });
  } catch (err) {
    console.error('getDepartments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Return list of distinct categories (flattened)
exports.getCategories = async (req, res) => {
  try {
    const categories = await Scheme.distinct('categories');
    const list = categories.filter(c => c).sort();
    res.json({ categories: list });
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) return res.status(404).json({ error: 'Not found' });
    res.json({ scheme });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body;
    const scheme = new Scheme(body);
    await scheme.save();
    res.status(201).json({ scheme });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
