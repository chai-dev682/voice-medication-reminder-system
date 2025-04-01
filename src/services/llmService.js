const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI();
/**
 * Process patient response with LLM to generate an appropriate reply
 * @param {string} patientResponse - The transcribed patient response
 * @returns {Promise<string>} - The LLM-generated response
 */
const generateResponse = async (patientResponse) => {
  try {
    logger.info(`Generating LLM response for: "${patientResponse}"`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful healthcare assistant responding to patients about their medication. 
          Keep responses brief (under 30 words), compassionate, and focused on medication adherence. 
          Don't introduce yourself in every message. Don't ask follow-up questions.`
        },
        {
          role: 'user',
          content: `Patient said: "${patientResponse}". Provide a brief, helpful response.`
        }
      ]
    });
    
    const llmResponse = response.choices[0].message.content.trim();
    logger.info(`LLM generated response: "${llmResponse}"`);
    
    return llmResponse;
  } catch (error) {
    logger.error('Error generating LLM response:', error);
    // Return a fallback response if the LLM call fails
    return "Thank you for your response. Your healthcare provider has been notified.";
  }
};

module.exports = {
  generateResponse
}; 