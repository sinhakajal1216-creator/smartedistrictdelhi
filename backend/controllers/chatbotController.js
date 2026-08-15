const chatbotService = require('../services/chatbotService');
const bhashiniService = require('../services/bhashiniService');

exports.message = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Provide a valid chatbot payload object.'
      });
    }

    const { message, profile, lang } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'Message required',
        message: 'Please provide a non-empty message.'
      });
    }

    let response = chatbotService.processMessage({
      message: message.trim(),
      profile: profile || {}
    });

    // Handle language translation request via BHASHINI service if requested (e.g. 'hi')
    if (lang && lang.toLowerCase() === 'hi') {
      const translationResult = await bhashiniService.translateText(response.answer, 'en', 'hi');
      if (translationResult.status === 'success') {
        response.answer_hi = translationResult.translatedText;
      }
      response.bhashiniStatus = translationResult.status;
    }

    return res.json(response);
  } catch (error) {
    console.error('Chatbot error:', error);

    return res.status(500).json({
      error: 'Chatbot error',
      message: 'Unable to process the chatbot request.'
    });
  }
};