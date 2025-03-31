const twilio = require('twilio');
const logger = require('../utils/logger');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const MEDICATION_REMINDER_MESSAGE = "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today.";
const VOICEMAIL_MESSAGE = "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so."

/**
 * Make an outgoing call to a patient
 * @param {string} phoneNumber - The patient's phone number
 * @returns {Promise} - The Twilio call object
 */
const makeCall = async (phoneNumber) => {
  try {
    const call = await client.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `<Response><Say>${MEDICATION_REMINDER_MESSAGE}</Say></Response>`,
      machineDetection: 'Enable',
      statusCallback: `${process.env.BASE_URL}/api/calls/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });
    
    return call;
  } catch (error) {
    logger.error('Error making call:', error);
    throw error;
  }
};

/**
 * Handle answering machine detection
 * @param {string} phoneNumber - The patient's phone number
 * @param {string} callSid - The Twilio call SID
 */
const handleAnsweringMachine = async (phoneNumber, callSid) => {
  try {
    // Leave a voicemail
    await client.calls(callSid).update({
      twiml: `<Response><Say>${VOICEMAIL_MESSAGE}</Say></Response>`
    });
    
    logger.info(`Left voicemail for ${phoneNumber}`);
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
    } catch (smsError) {
      logger.error('Error sending SMS:', smsError);
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
  console.log(statusData);
  
  logger.info(`Call ${CallSid} to ${To} status: ${CallStatus}, answered by: ${AnsweredBy || 'N/A'}`);
  
  // TODO: Handle call status updates
};

module.exports = {
  makeCall,
  handleAnsweringMachine,
  handleCallStatus
};