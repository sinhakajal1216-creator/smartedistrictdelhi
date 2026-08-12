const express = require('express');
const eligibilityController = require('../controllers/eligibilityController');

const router = express.Router();

router.post('/evaluate', eligibilityController.evaluate);

module.exports = router;
