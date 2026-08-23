const express = require('express');
const chatbotController = require('../controllers/chatbotController');

const router = express.Router();

router.post('/message', chatbotController.message);
router.post('/speech-to-text', chatbotController.speechToText);

module.exports = router;
