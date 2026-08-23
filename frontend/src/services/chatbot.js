import api from './api';

export const sendChatMessage = async (message, profile = {}, lang = 'en', context = {}) => {
  const response = await api.post('/chatbot/message', {
    message,
    profile,
    lang,
    context
  });
  return response.data;
};

export const transcribeSpeech = async (audioBase64, lang = 'hi') => {
  const response = await api.post('/chatbot/speech-to-text', {
    audioBase64,
    lang
  });
  return response.data;
};
