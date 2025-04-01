const twilio = require('twilio');
const logger = require('../utils/logger');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VOICEMAIL_MESSAGE = "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so."

/**
 * Generate TwiML for outgoing calls using ElevenLabs TTS
 * @param {string} audioUrl - URL to the audio file
 * @returns {Object} - Twilio Voice Response object
 */
const generateTwimlWithElevenLabs = (audioUrl) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.play(audioUrl);
  return twiml;
};

/**
 * Make an outgoing call to a patient with Media Streams
 * @param {string} phoneNumber - The patient's phone number
 * @returns {Promise} - The Twilio call object
 */
const makeCall = async (phoneNumber) => {
  try {
    // Create TwiML with Media Streams
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.connect().stream({
      url: `wss://${process.env.BASE_DOMAIN}/api/calls/stream`
    });
    
    // Make the call
    const call = await client.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      machineDetection: 'DetectMessageEnd',
      twiml: twiml.toString(),
      statusCallback: `https://${process.env.BASE_DOMAIN}/api/calls/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });
    
    logger.info(`Call initiated to ${phoneNumber} with Media Streams`);
    return call;
  } catch (error) {
    logger.error('Error making call with Media Streams:', error);
    throw error;
  }
};

/**
 * Handle answering machine detection
 * @param {string} phoneNumber - The patient's phone number
 * @param {string} callSid - The Twilio call SID
 * @returns {Promise<string>} - The action taken (voicemail or SMS)
 */
const handleAnsweringMachine = async (phoneNumber, callSid) => {
  try {
    // Leave a voicemail
    await client.calls(callSid).update({
      twiml: `<Response><Say>${VOICEMAIL_MESSAGE}</Say></Response>`
    });
    
    logger.info(`Left voicemail for ${phoneNumber}`);
    return 'voicemail left';
  } catch (error) {
    logger.error('Error leaving voicemail:', error);
    
    // Fallback to SMS if voicemail fails
    try {
      await client.messages.create({
        body: VOICEMAIL_MESSAGE,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      logger.info(`Sent SMS to ${phoneNumber} after voicemail failure`);
      return 'SMS sent';
    } catch (smsError) {
      logger.error('Error sending SMS:', smsError);
      return 'failed to contact';
    }
  }
};

/**
 * Handle call status updates
 * @param {Object} statusData - The call status data from Twilio
 * @returns {Promise<void>}
 */
const handleCallStatus = async (statusData) => {
  const { CallSid, CallStatus, To, AnsweredBy } = statusData;
  
  // Log call data based on status
  switch (CallStatus) {
    case 'completed':
      logger.info(`Call ${CallSid} to ${To} status: ${CallStatus}, answered by: ${AnsweredBy || 'N/A'}`);

      if (AnsweredBy && AnsweredBy.includes('machine')) {
        await handleAnsweringMachine(To, CallSid);
      }
      break;
    case 'no-answer':
    case 'busy':
    case 'failed':
      await handleAnsweringMachine(To, CallSid);
    default:
      logger.info(`Call ${CallSid} to ${To} status: ${CallStatus}, answered by: ${AnsweredBy || 'N/A'}`);
  }
};

module.exports = {
  makeCall,
  handleAnsweringMachine,
  handleCallStatus,
  generateTwimlWithElevenLabs
};