import api from '../api/axios';

export const chatbotService = {
  /**
   * Ask Gena via OpenRouter backend.
   * Returns object with { response, suggestedQuestions }.
   */
  askChatbot: async (input) => {
    let payload;
    if (Array.isArray(input)) {
      payload = { messages: input };
    } else {
      payload = { query: input };
    }
    const res = await api.post('/chatbot/ask', payload);
    return {
      response: typeof res.data === 'string' ? res.data : (res.data.response || ''),
      suggestedQuestions: res.data.suggestedQuestions || []
    };
  }
};
