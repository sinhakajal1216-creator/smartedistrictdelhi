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

    const { message, profile, lang, context } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'Message required',
        message: 'Please provide a non-empty message.'
      });
    }

    let response = chatbotService.processMessage({
      message: message.trim(),
      profile: profile || {},
      context: context || {}
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

exports.speechToText = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Provide a valid speech-to-text payload object.'
      });
    }

    const { audioBase64, lang } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      return res.status(400).json({
        error: 'Audio required',
        message: 'Please provide a non-empty audioBase64 string.'
      });
    }

    const speechResult = await bhashiniService.speechToText(audioBase64.trim(), lang || 'hi');
    return res.json(speechResult);
  } catch (error) {
    console.error('Chatbot speech-to-text error:', error);
    return res.status(500).json({
      error: 'Speech-to-text error',
      message: 'Unable to process speech-to-text request.'
    });
  }
};