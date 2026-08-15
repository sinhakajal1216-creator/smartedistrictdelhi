/**
 * BHASHINI Multilingual & Speech Integration Adapter
 * 
 * Government of India Digital India BHASHINI API Service Wrapper.
 * 
 * REQUIRED ENVIRONMENT VARIABLES FOR LIVE API:
 * - BHASHINI_API_KEY: Official Bhashini API Auth Key
 * - BHASHINI_USER_ID: Bhashini User Identification
 * - BHASHINI_PIPELINE_ID: Bhashini Pipeline Identifier for NMT/ASR/TTS
 * - BHASHINI_ENDPOINT: Base URL for Bhashini Model Inference API
 */

const axios = require('axios');

function isConfigured() {
  return Boolean(
    process.env.BHASHINI_API_KEY &&
    process.env.BHASHINI_USER_ID &&
    process.env.BHASHINI_PIPELINE_ID &&
    process.env.BHASHINI_ENDPOINT
  );
}

async function translateText(text, sourceLang = 'en', targetLang = 'hi') {
  if (!isConfigured()) {
    return {
      status: 'configuration_required',
      message: 'BHASHINI API credentials not configured in environment variables.',
      requiredEnvVars: [
        'BHASHINI_API_KEY',
        'BHASHINI_USER_ID',
        'BHASHINI_PIPELINE_ID',
        'BHASHINI_ENDPOINT'
      ],
      translatedText: null
    };
  }

  try {
    const response = await axios.post(
      process.env.BHASHINI_ENDPOINT,
      {
        pipelineTasks: [
          {
            taskType: 'translation',
            config: {
              language: {
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
              }
            }
          }
        ],
        inputData: {
          input: [{ source: text }]
        }
      },
      {
        headers: {
          'Authorization': process.env.BHASHINI_API_KEY,
          'userID': process.env.BHASHINI_USER_ID,
          'ulcaApiKey': process.env.BHASHINI_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const translatedText =
      response.data?.pipelineResponse?.[0]?.output?.[0]?.target || null;

    if (!translatedText) {
      return {
        status: 'error',
        message: 'Invalid response structure received from BHASHINI API.',
        translatedText: null
      };
    }

    return {
      status: 'success',
      sourceLang,
      targetLang,
      translatedText
    };
  } catch (error) {
    return {
      status: 'error',
      message: `BHASHINI API call failed: ${error.message}`,
      translatedText: null
    };
  }
}

async function speechToText(audioBase64, language = 'hi') {
  if (!isConfigured()) {
    return {
      status: 'configuration_required',
      message: 'BHASHINI ASR (Speech-to-Text) credentials not configured in environment variables.',
      requiredEnvVars: [
        'BHASHINI_API_KEY',
        'BHASHINI_USER_ID',
        'BHASHINI_PIPELINE_ID',
        'BHASHINI_ENDPOINT'
      ],
      transcription: null
    };
  }

  try {
    const response = await axios.post(
      process.env.BHASHINI_ENDPOINT,
      {
        pipelineTasks: [
          {
            taskType: 'asr',
            config: {
              language: { sourceLanguage: language }
            }
          }
        ],
        audio: [{ audioContent: audioBase64 }]
      },
      {
        headers: {
          'Authorization': process.env.BHASHINI_API_KEY,
          'userID': process.env.BHASHINI_USER_ID,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      status: 'success',
      transcription: response.data?.pipelineResponse?.[0]?.output?.[0]?.source || null
    };
  } catch (error) {
    return {
      status: 'error',
      message: `BHASHINI ASR call failed: ${error.message}`,
      transcription: null
    };
  }
}

module.exports = {
  isConfigured,
  translateText,
  speechToText
};
