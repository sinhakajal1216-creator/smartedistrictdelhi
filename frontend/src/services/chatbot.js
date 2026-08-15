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
