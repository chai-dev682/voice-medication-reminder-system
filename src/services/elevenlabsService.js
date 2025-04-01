const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { ElevenLabsClient } = require('elevenlabs');

// Configuration
const AUDIO_OUTPUT_DIR = path.join(__dirname, '../../public/audio');

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_OUTPUT_DIR)) {
  fs.mkdirSync(AUDIO_OUTPUT_DIR, { recursive: true });
}

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array>} List of available voices
 */
const getVoices = async () => {
  try {
    const voices = await elevenlabs.voices.getAll();
    return voices;
  } catch (error) {
    logger.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
};

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - The text to convert to speech
 * @param {string} voiceId - The ID of the voice to use (default: 'premade/adam')
 * @param {Object} options - Additional options for the TTS request
 * @returns {Promise<string>} - Path to the generated audio file
 */
const textToSpeechToFile = async (text, voiceId = 'gOkFV1JMCt0G0n9xmBwV', options = {}) => {
  try {
    const fileName = `tts_${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_OUTPUT_DIR, fileName);
    
    const defaultOptions = {
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    // Generate audio using the SDK
    const audioStream = await elevenlabs.generate({
      voice: voiceId,
      text: text,
      model: requestOptions.model_id,
      voice_settings: requestOptions.voice_settings
    });
    
    // Save the audio file
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      audioStream.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    logger.info(`Generated audio file: ${fileName}`);
    return fileName;
  } catch (error) {
    logger.error('Error generating speech with ElevenLabs:', error);
    throw error;
  }
};

/**
 * Convert text to speech using ElevenLabs API and return a stream
 * @param {string} text - The text to convert to speech
 * @param {string} voiceId - The ID of the voice to use (default: 'gOkFV1JMCt0G0n9xmBwV')
 * @returns {ReadableStream} - The audio stream
 */
const textToSpeechToStream = async (text, voiceId = 'gOkFV1JMCt0G0n9xmBwV') => {
  const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
    model_id: 'eleven_turbo_v2_5',
    output_format: 'ulaw_8000',
    text: text,
  });
  return audioStream;
};

/**
 * Generate TTS for medication reminder
 * @param {string} message - The medication reminder message
 * @returns {Promise<string>} - URL to the generated audio file
 */
const generateMedicationReminder = async (message) => {
  try {
    const fileName = await textToSpeechToFile(message);
    const audioUrl = `https://${process.env.BASE_DOMAIN}/audio/${fileName}`;
    
    logger.info(`Generated medication reminder audio: ${audioUrl}`);
    return audioUrl;
  } catch (error) {
    logger.error('Error generating medication reminder:', error);
    throw error;
  }
};

/**
 * Delete an audio file
 * @param {string} fileName - Name of the file to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteAudioFile = async (fileName) => {
  try {
    const filePath = path.join(AUDIO_OUTPUT_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted audio file: ${fileName}`);
      return true;
    }
    
    logger.warn(`Audio file not found: ${fileName}`);
    return false;
  } catch (error) {
    logger.error(`Error deleting audio file ${fileName}:`, error);
    throw error;
  }
};

module.exports = {
  getVoices,
  textToSpeechToStream,
  textToSpeechToFile,
  generateMedicationReminder,
  deleteAudioFile
};
