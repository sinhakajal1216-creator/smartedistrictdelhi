const chatbotService = require('../services/chatbotService');
const bhashiniService = require('../services/bhashiniService');
const lyzrService = require('../services/lyzrService');
const {
  MAX_MESSAGE_LENGTH,
  MAX_AUDIO_BASE64_LENGTH,
  pickAllowedProfile,
  sanitizeContext,
  sanitizeLang
} = require('../utils/chatbotInput');

const LOCAL_INTENTS = new Set([
  'SDM_QUERY',
  'DOCUMENT_QUERY',
  'ELIGIBILITY_QUERY',
  'APPLICATION_QUERY',
  'SCHEME_LIST_QUERY',
  'PROJECT_QUERY',
  'TRACKING_QUERY'
]);

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

    const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
    const safeProfile = pickAllowedProfile(profile);
    const safeContext = sanitizeContext(context);
    const safeLang = sanitizeLang(lang);

    let response = null;

    try {
      const intent = chatbotService.detectIntent(trimmed, safeContext);

      if (LOCAL_INTENTS.has(intent)) {
        response = chatbotService.processMessage({
          message: trimmed,
          profile: safeProfile,
          context: safeContext
        });
        response.source = response.source || 'local';
      } else if (lyzrService.isConfigured()) {
        const lyzrResult = await lyzrService.queryLyzr({
          message: trimmed
        });

        if (lyzrResult && lyzrResult.status === 'success' && lyzrResult.answer) {
          response = {
            intent,
            status: 'success',
            answer: String(lyzrResult.answer),
            source: 'lyzr'
          };
        }
      }
    } catch (lyzrCallError) {
      console.warn('Assistant fallback in use');
    }

    if (!response) {
      response = chatbotService.processMessage({
        message: trimmed,
        profile: safeProfile,
        context: safeContext
      });
      response.source = response.source || 'local';
    }

    if (safeLang === 'hi') {
      try {
        const translationResult = await bhashiniService.translateText(response.answer, 'en', 'hi');
        if (translationResult.status === 'success') {
          response.answer_hi = translationResult.translatedText;
        }
        response.bhashiniStatus = translationResult.status;
      } catch (tErr) {
        response.bhashiniStatus = 'error';
      }
    }

    return res.json(response);
  } catch (error) {
    console.error('Chatbot request failed');
    return res.status(500).json({
      error: 'Chatbot error',
      message: 'Sorry, I could not process that request right now. Please try again.'
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

    if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      return res.status(413).json({
        error: 'Audio too large',
        message: 'Record a shorter clip and try again.'
      });
    }

    const speechResult = await bhashiniService.speechToText(audioBase64.trim(), sanitizeLang(lang) === 'hi' ? 'hi' : 'en');
    return res.json(speechResult);
  } catch (error) {
    console.error('Speech-to-text request failed');
    return res.status(500).json({
      error: 'Speech-to-text error',
      message: 'Unable to process speech-to-text request.'
    });
  }
};
