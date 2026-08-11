const express = require('express');
const router = express.Router();
const Scheme = require('../models/Scheme');
const eligibilityService = require('../services/eligibilityService');

// POST /api/eligibility/evaluate
// Body: citizen profile object
router.post('/evaluate', async (req, res) => {
  try {
    const profile = req.body;
    // load schemes — return all published schemes to evaluate
    const schemes = await Scheme.find({}).lean();
    const results = eligibilityService.evaluate(profile, schemes);

    // Prepare response grouping
    const eligible = [];
    const notEligible = [];
    const unknown = [];

    results.forEach(r => {
      const scheme = schemes.find(s => String(s._id) === String(r.schemeId));
      const payload = { scheme, reasons: r.reasons || [], code: r.code, title: r.title };
      if (r.eligible === true) eligible.push(payload);
      else if (r.eligible === false) notEligible.push(payload);
      else unknown.push(payload);
    });

    res.json({ eligible, notEligible, unknown });
  } catch (err) {
  console.error('eligibility evaluate error:', err);
  res.status(500).json({
    error: 'Server error',
    details: err.message
  });
}
});

module.exports = router;
