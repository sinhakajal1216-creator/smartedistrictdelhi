const express = require('express');
const router = express.Router();
const jurisdictionController = require('../controllers/jurisdictionController');

// GET /api/jurisdictions?ward=Kalkaji
router.get('/', jurisdictionController.lookup);
// GET /api/jurisdictions/resolve?ward=Kalkaji
router.get('/resolve', jurisdictionController.resolve);
// GET /api/jurisdictions/resolve-location?ward=Kalkaji or ?address=...
router.get('/resolve-location', jurisdictionController.resolveLocation);

module.exports = router;
