const jurisdictionEngine = require('../services/jurisdictionEngine');
const locationResolver = require('../services/locationResolver');

exports.lookup = async (req, res) => {
  try {
    const ward = req.query.ward;
    const area = req.query.area;
    const subDivision = req.query.subDivision;

    if (!ward) return res.status(400).json({ error: 'ward query parameter is required' });

    const result = await jurisdictionEngine.resolveByWard({ ward, area, subDivision });
    if (result.error) return res.status(400).json({ error: result.error });

    res.json({ jurisdiction: result.jurisdiction, sdmOffice: result.sdmOffice });
  } catch (err) {
    console.error('jurisdiction lookup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// New resolve endpoint: GET /api/jurisdictions/resolve?ward=...
exports.resolve = async (req, res) => {
  try {
    const ward = req.query.ward;
    const area = req.query.area;
    const subDivision = req.query.subDivision;

    if (!ward) return res.status(400).json({ error: 'ward query parameter is required' });

    const result = await jurisdictionEngine.resolveLocation({ ward, area, subDivision });

    if (result.error === 'ward_required') return res.status(400).json({ error: 'ward query parameter is required' });
    if (result.ambiguous) return res.status(409).json({ error: 'ambiguous', matches: result.matches });
    if (!result.jurisdiction) return res.status(404).json({ error: 'not_found' });

    res.json({ jurisdiction: result.jurisdiction, sdmOffice: result.sdmOffice });
  } catch (err) {
    console.error('jurisdiction resolve error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// New endpoint: resolve-location that uses the user's address + ward logic
exports.resolveLocation = async (req, res) => {
  try {
    const ward = req.query.ward;
    const address = req.query.address;
    const area = req.query.area;
    const subDivision = req.query.subDivision;

    if (!ward && !address) return res.status(400).json({ error: 'Provide ward or address query parameter' });

    const result = await locationResolver.resolveUserLocation({ address, ward, area, subDivision });

    if (result && result.error === 'missing_location') return res.status(400).json({ error: 'missing_location' });
    if (result && result.status === 'WARD_REQUIRED') return res.status(422).json(result);
    if (result && result.ambiguous) return res.status(409).json({ error: 'ambiguous', matches: result.matches });
    if (result && !result.jurisdiction) return res.status(404).json({ error: 'not_found' });

    // success
    return res.json({ jurisdiction: result.jurisdiction, sdmOffice: result.sdmOffice, address: result.address || null });
  } catch (err) {
    console.error('jurisdiction resolveLocation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
