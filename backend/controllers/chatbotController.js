const chatbotService = require('../services/chatbotService');
const bhashiniService = require('../services/bhashiniService');
const lyzrService = require('../services/lyzrService');

// Intents that are good candidates for knowledge/RAG queries handled by Lyzr.
const LYZR_KNOWLEDGE_INTENTS = new Set([
  'DOCUMENT_QUERY',
  'APPLICATION_QUERY',
  'PROCESSING_TIME_QUERY',
  'SCHEME_LIST_QUERY',
  'PROJECT_QUERY'
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

    const trimmed = message.trim();

    // Decide whether to route to Lyzr for knowledge/RAG. If Lyzr is not configured or
    // the intent is not in the knowledge set we'll fall back to the deterministic service.
    let response = null;

    try {
      const intent = chatbotService.detectIntent(trimmed, context || {});

      if (LYZR_KNOWLEDGE_INTENTS.has(intent) && lyzrService.isConfigured()) {
        // Query Lyzr for knowledge-focused intents. Provide profile/context where relevant.
        const lyzrResult = await lyzrService.queryLyzr({
          message: trimmed,
          profile: profile || {},
          context: context || {},
          userId: (profile && (profile.email || profile.userId)) || undefined
        });

        if (lyzrResult && lyzrResult.status === 'success' && lyzrResult.answer) {
          response = {
            intent,
            status: 'success',
            answer: String(lyzrResult.answer),
            source: 'lyzr'
          };
        } else {
          // If Lyzr returned configuration required or an error, log and fallback.
          console.warn('Lyzr response not usable, falling back to chatbotService:', lyzrResult);
        }
      }
    } catch (lyzrCallError) {
      // If Lyzr invocation itself throws, log and fall back to existing service
      console.warn('Lyzr invocation failed, falling back to chatbotService:', lyzrCallError && lyzrCallError.message ? lyzrCallError.message : lyzrCallError);
    }

    // If Lyzr was not used or returned no usable answer, use existing deterministic service.
    if (!response) {
      response = chatbotService.processMessage({
        message: trimmed,
        profile: profile || {},
        context: context || {}
      });
      // mark source as local deterministic service
      response.source = response.source || 'local';
    }

    // Handle language translation request via BHASHINI service if requested (e.g. 'hi')
    if (lang && lang.toLowerCase() === 'hi') {
      try {
        const translationResult = await bhashiniService.translateText(response.answer, 'en', 'hi');
        if (translationResult.status === 'success') {
          response.answer_hi = translationResult.translatedText;
        }
        response.bhashiniStatus = translationResult.status;
      } catch (tErr) {
        console.warn('Bhashini translation failed:', tErr && tErr.message ? tErr.message : tErr);
        response.bhashiniStatus = 'error';
      }
    }
console.log('\n========== FINAL CONTROLLER RESPONSE ==========');
console.log('KEYS:', Object.keys(response));
console.log('ANSWER LENGTH:', response.answer?.length);
console.log('HAS RAW:', Object.prototype.hasOwnProperty.call(response, 'raw'));
console.log('HAS MODULE_OUTPUTS:', Object.prototype.hasOwnProperty.call(response, 'module_outputs'));
console.log('================================================\n');


    return res.json(response);
  } 
  catch (error) {
    console.error("🔥 CHATBOT ERROR:");
    console.error(error);
    console.error("MESSAGE:", error.message);
    console.error("STACK:", error.stack);

    res.status(500).json({
        error: "Chatbot error",
        message: error.message
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