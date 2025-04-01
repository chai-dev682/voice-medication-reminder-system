const { createClient } = require('@deepgram/sdk');
const logger = require('../utils/logger');

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Transcribe audio using Deepgram API
 * @param {string} audioUrl - URL to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
const transcribeAudio = async (audioUrl) => {
  try {
    logger.info(`Transcribing audio from: ${audioUrl}`);
    
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      {
        punctuate: true,
        model: 'general',
        language: 'en-US',
      }
    );
    
    const transcript = result.results.channels[0].alternatives[0].transcript;
    logger.info(`Transcription result: "${transcript}"`);
    
    return transcript;
  } catch (error) {
    logger.error('Error transcribing audio with Deepgram:', error);
    throw error;
  }
};

/**
 * Process patient response from a call recording
 * @param {string} recordingUrl - URL to the call recording
 * @returns {Promise<string>} - Processed patient response
 */
const processPatientResponse = async (recordingUrl) => {
  try {
    const transcript = await transcribeAudio(recordingUrl);
    logger.info(`Patient response processed: "${transcript}"`);
    return transcript;
  } catch (error) {
    logger.error('Error processing patient response:', error);
    throw error;
  }
};

module.exports = {
  transcribeAudio,
  processPatientResponse
}; 