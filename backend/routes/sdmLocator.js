const express = require('express');
const router = express.Router();
const sdmLocatorController = require('../controllers/sdmLocatorController');

router.get('/search', sdmLocatorController.search);

module.exports = router;
