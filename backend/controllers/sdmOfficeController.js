const SDMOffice = require('../models/SDMOffice');
const mongoose = require('mongoose');

exports.list = async (req, res) => {
  try {
    const postcode = req.query.postcode || req.query.postcode || null;
    const filter = {};
    if (postcode) filter.pincode = String(postcode).trim();

    const offices = await SDMOffice.find(filter).sort({ name: 1 }).lean();
    res.json({ sdmOffices: offices });
  } catch (err) {
    console.error('sdmOffices list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const office = await SDMOffice.findById(id).lean();
    if (!office) return res.status(404).json({ error: 'Not found' });
    res.json({ sdmOffice: office });
  } catch (err) {
    console.error('sdmOffices getById error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
