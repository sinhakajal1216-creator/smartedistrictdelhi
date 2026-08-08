const express = require('express');
const router = express.Router();
const sdmOfficeController = require('../controllers/sdmOfficeController');

// GET /api/sdm-offices?postcode=110001
router.get('/', sdmOfficeController.list);
// GET /api/sdm-offices/:id
router.get('/:id', sdmOfficeController.getById);

module.exports = router;
