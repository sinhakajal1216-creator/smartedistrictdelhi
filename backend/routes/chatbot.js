const express = require('express');
const chatbotController = require('../controllers/chatbotController');
const { chatbotLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.post('/message', chatbotLimiter, chatbotController.message);
router.post('/speech-to-text', chatbotLimiter, chatbotController.speechToText);

module.exports = router;
