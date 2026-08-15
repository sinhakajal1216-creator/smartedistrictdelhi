const express = require('express');
const chatbotController = require('../controllers/chatbotController');

const router = express.Router();

router.post('/message', chatbotController.message);

module.exports = router;
