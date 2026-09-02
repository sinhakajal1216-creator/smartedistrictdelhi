const axios = require('axios');

function isConfigured() {
  return Boolean(process.env.LYZR_API_KEY && process.env.LYZR_AGENT_ID && process.env.LYZR_BASE_URL);
}

function cleanLyzrAnswer(answer) {
  if (!answer) return '';

  let text = answer;

  if (typeof answer === 'object') {
    text =
      answer.response ||
      answer.answer ||
      answer.message ||
      answer.output ||
      JSON.stringify(answer);
  } else {
    text = String(answer).trim();
  }

  // Lyzr may return JSON as a STRING:
  // "{\"response\":\"actual answer\"}"
  try {
    const parsed = JSON.parse(String(text));

    if (typeof parsed === 'string') {
      text = parsed;
    } else if (parsed && typeof parsed === 'object') {
      text =
        parsed.response ||
        parsed.answer ||
        parsed.message ||
        parsed.output ||
        String(text);
    }
  } catch (e) {
    // Not JSON, so keep the original text
  }

  // Remove common unnecessary prefixes
  text = String(text).replace(/^answer:\s*/i, '');
  text = String(text).replace(/^response:\s*/i, '');

  // Remove excessive blank lines
  text = String(text).replace(/\n{3,}/g, '\n\n');

  return String(text).trim();
}
async function queryLyzr({ message, profile = {}, context = {}, userId }) {
  if (!isConfigured()) {
    return {
      status: 'configuration_required',
      error: 'LYZR configuration missing',
      requiredEnvVars: ['LYZR_API_KEY', 'LYZR_AGENT_ID', 'LYZR_BASE_URL']
    };
  }

  try {
    const sessionId = (context && context.sessionId) || `${process.env.LYZR_AGENT_ID}-${Date.now()}`;
    const payload = {
      user_id: userId || profile.email || profile.userId || 'anonymous',
      agent_id: process.env.LYZR_AGENT_ID,
      session_id: sessionId,
      message: String(message || '')
    };

    const url = (process.env.LYZR_BASE_URL || 'https://agent-prod.studio.lyzr.ai').replace(/\/$/, '') + '/v3/inference/chat/';

    const resp = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.LYZR_API_KEY
      },
      timeout: 10000
    });

    const data = resp && resp.data ? resp.data : null;
    console.log('\n========== LYZR ACTUAL RESPONSE ==========');
console.log('TYPE:', typeof data);
console.log('KEYS:', data && typeof data === 'object' ? Object.keys(data) : 'not-object');

console.log(
  'RESPONSE TYPE:',
  data?.response !== undefined ? typeof data.response : 'undefined'
);

console.log(
  'ANSWER TYPE:',
  data?.answer !== undefined ? typeof data.answer : 'undefined'
);

console.log(
  'MESSAGE TYPE:',
  data?.message !== undefined ? typeof data.message : 'undefined'
);

console.log('==========================================\n');

    // Try to extract a human-readable answer from common response shapes
    let answer = null;

    if (!data) {
      return { status: 'empty_response', raw: resp };
    }

    // Common guesses for where text might live
    if (typeof data === 'string') {
  answer = data;
}

if (!answer && typeof data.response === 'string') {
  answer = data.response;
}

if (!answer && typeof data.message === 'string') {
  answer = data.message;
}

if (!answer && typeof data.answer === 'string') {
  answer = data.answer;
}
    if (!answer && data.output && data.output.length) {
      // flatten arrays of outputs
      const parts = data.output.map((o) => (typeof o === 'string' ? o : o.text || o.content)).filter(Boolean);
      if (parts.length) answer = parts.join('\n\n');
    }

    // Some providers wrap text under data.choices or data.data
    if (!answer && Array.isArray(data.choices) && data.choices.length) {
      answer = data.choices.map((c) => c.text || c.message || c.content).filter(Boolean).join('\n\n');
    }

   

    // Fallback stringify entire response
    if (!answer) {
  console.warn('Lyzr did not return a usable answer');
  return {
    status: 'error',
    error: 'Lyzr did not return a usable answer'
  };
}

const cleanedAnswer = cleanLyzrAnswer(answer);

return {
  status: 'success',
  answer: cleanedAnswer
};
  } catch (error) {
    return {
      status: 'error',
      error: error.message || String(error),
      rawError: error.response ? { status: error.response.status, data: error.response.data } : null
    };
  }
}

module.exports = {
  isConfigured,
  queryLyzr
};
