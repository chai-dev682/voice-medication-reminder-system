const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Readable = require('stream').Readable;
const twilioService = require('../services/twilioService');
const elevenlabs = require('../services/elevenlabsService');
const logger = require('../utils/logger');

const MEDICATION_REMINDER_MESSAGE = "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today.";

function streamToArrayBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).buffer);
    });
    readableStream.on('error', reject);
  });
}

const initiateCall = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const call = await twilioService.makeCall(phoneNumber);

    return res.status(200).json({
      success: true,
      message: 'Call initiated successfully',
      callSid: call.sid
    });
  } catch (error) {
    logger.error('Error initiating call:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate call',
      error: error.message
    });
  }
};

const handleCallStatusWebhook = async (req, res) => {
  try {
    await twilioService.handleCallStatus(req.body);
    return res.status(200).send();
  } catch (error) {
    logger.error('Error handling call status webhook:', error);
    return res.status(500).send();
  }
};

const handleIncomingCall = async (req, res) => {
  const twiml = new VoiceResponse();
  
  twiml.connect().stream({
    url: `wss://${process.env.BASE_DOMAIN}/api/calls/stream`
  });

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
};

// websocket
const handleStream = async (ws, req) => {
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      if (message.event === 'start' && message.start) {
        const streamSid = message.start.streamSid;
        const response = await elevenlabs.textToSpeechToStream(MEDICATION_REMINDER_MESSAGE);
        const readableStream = Readable.from(response);
        const audioArrayBuffer = await streamToArrayBuffer(readableStream);
        ws.send(
          JSON.stringify({
            streamSid,
            event: 'media',
            media: {
              payload: Buffer.from(audioArrayBuffer).toString('base64'),
            },
          })
        );
      }
    } catch (error) {
      logger.error('Error in WebSocket stream:', error);
    }
  });
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
};


module.exports = {
  initiateCall,
  handleCallStatusWebhook,
  handleIncomingCall,
  handleStream
};