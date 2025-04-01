const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Readable = require('stream').Readable;
const twilioService = require('../services/twilioService');
const elevenlabs = require('../services/elevenlabsService');
const logger = require('../utils/logger');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const llmService = require('../services/llmService');


const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);

const MEDICATION_REMINDER_MESSAGE = "Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your Aspirin, Cardivol, and Metformin today.";

// Store active call streams and transcriptions
const activeStreams = new Map();
const activeTranscriptions = new Map();

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
  try {
    const { CallSid, From } = req.body;
    logger.info(`Incoming call received from ${From} with SID ${CallSid}`);
    
    // Log the call data in the required format
    console.log('\n========== CALL DATA LOG ==========');
    console.log(`Call SID: ${CallSid}`);
    console.log(`Status: incoming call`);
    console.log(`Patient Phone: ${From}`);
    console.log('====================================\n');
    
    const twiml = new VoiceResponse();
    
    // Connect to media stream for real-time audio processing
    twiml.connect().stream({
      url: `wss://${process.env.BASE_DOMAIN}/api/calls/stream`
    });

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (error) {
    logger.error('Error handling incoming call:', error);
    
    // Send a basic response if there's an error
    const twiml = new VoiceResponse();
    twiml.say('We are experiencing technical difficulties. Please try again later.');
    
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
};

// websocket
const handleStream = async (ws, req) => {
  // Track connection state
  let isConnected = true;
  
  // Set a ping interval to keep the connection alive
  const pingInterval = setInterval(() => {
    if (isConnected) {
      try {
        ws.ping();
      } catch (error) {
        logger.error('Error sending ping:', error);
        clearInterval(pingInterval);
      }
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // 30 seconds
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.event === 'start' && message.start) {
        const streamSid = message.start.streamSid;
        const callSid = message.start.callSid;
        
        if (!streamSid || !callSid) {
          logger.error('Missing streamSid or callSid in start event');
          return;
        }
        
        // Store the stream information
        activeStreams.set(streamSid, {
          callSid,
          ws,
          startTime: new Date(),
          transcripts: []
        });
        
        logger.info(`Stream started for call ${callSid} with stream ${streamSid}`);
        
        // Set up Deepgram for this stream
        try {
          const deepgram = setupDeepgram(streamSid, ws);
          activeTranscriptions.set(streamSid, deepgram);
          
          // Generate speech with ElevenLabs
          const response = await elevenlabs.textToSpeechToStream(MEDICATION_REMINDER_MESSAGE);
          const readableStream = Readable.from(response);
          const audioArrayBuffer = await streamToArrayBuffer(readableStream);
          
          // Send the audio to the call
          if (isConnected) {
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
          logger.error(`Error setting up stream ${streamSid}:`, error);
          
          // Clean up if setup fails
          activeStreams.delete(streamSid);
          activeTranscriptions.delete(streamSid);
        }
      } else if (message.event === 'media' && message.media) {
        // Handle incoming audio from the call (patient's response)
        if (message.media.track === "inbound" && message.streamSid) {
          const streamSid = message.streamSid;
          const deepgram = activeTranscriptions.get(streamSid);
          
          if (deepgram) {
            try {
              // Send the audio to Deepgram for transcription
              const rawAudio = Buffer.from(message.media.payload, 'base64');
              deepgram.send(rawAudio);
            } catch (error) {
              logger.error(`Error sending audio to Deepgram for stream ${streamSid}:`, error);
            }
          } else {
            logger.warn(`No Deepgram instance found for stream ${streamSid}`);
          }
        }
      } else if (message.event === 'stop' && message.stop) {
        const streamSid = message.stop.streamSid;
        logger.info(`Stream ${streamSid} ended`);
        
        // Clean up Deepgram connection
        const deepgram = activeTranscriptions.get(streamSid);
        if (deepgram) {
          try {
            deepgram.finish();
          } catch (error) {
            logger.error(`Error finishing Deepgram for stream ${streamSid}:`, error);
          } finally {
            activeTranscriptions.delete(streamSid);
          }
        }
        
        // Get all transcripts for this call
        const streamData = activeStreams.get(streamSid);
        if (streamData) {
          const transcripts = streamData.transcripts.join(' ');
          logger.info(`Call transcripts: ${transcripts}`);
          
          // Log the call data in the required format
          console.log('\n========== CALL DATA LOG ==========');
          console.log(`Call SID: ${streamData.callSid}`);
          console.log(`Status: completed`);
          console.log(`Patient Response: "${transcripts}"`);
          console.log('====================================\n');
        }
        
        activeStreams.delete(streamSid);
      }
    } catch (error) {
      logger.error('Error in WebSocket stream:', error);
    }
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    isConnected = false;
    clearInterval(pingInterval);
  });
  
  ws.on('close', () => {
    isConnected = false;
    clearInterval(pingInterval);
    
    // Clean up any streams associated with this connection
    for (const [streamSid, stream] of activeStreams.entries()) {
      if (stream.ws === ws) {
        // Clean up Deepgram connection
        const deepgram = activeTranscriptions.get(streamSid);
        if (deepgram) {
          try {
            deepgram.finish();
          } catch (error) {
            logger.error(`Error finishing Deepgram on close for stream ${streamSid}:`, error);
          } finally {
            activeTranscriptions.delete(streamSid);
          }
        }
        
        // Log final transcripts if available
        if (stream.transcripts && stream.transcripts.length > 0) {
          const transcripts = stream.transcripts.join(' ');
          
          // Log the call data in the required format
          console.log('\n========== CALL DATA LOG ==========');
          console.log(`Call SID: ${stream.callSid}`);
          console.log(`Status: disconnected`);
          console.log(`Patient Response: "${transcripts}"`);
          console.log('====================================\n');
        }
        
        activeStreams.delete(streamSid);
        logger.info(`Cleaned up stream ${streamSid} on WebSocket close`);
      }
    }
  });
  
  // Handle pong responses to track connection state
  ws.on('pong', () => {
    isConnected = true;
  });
};

// Setup Deepgram for speech-to-text
const setupDeepgram = (streamSid, ws) => {
  let is_finals = [];
  
  const deepgram = deepgramClient.listen.live({
    model: "nova-2-phonecall",
    language: "en",
    smart_format: true,
    encoding: "mulaw",
    sample_rate: 8000,
    channels: 1,
    multichannel: false,
    no_delay: true,
    interim_results: true,
    endpointing: 300,
    utterance_end_ms: 1000
  });

  deepgram.addListener(LiveTranscriptionEvents.Open, () => {
    logger.info("Deepgram STT: Connected");
  });

  deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (transcript !== "") {
      if (data.is_final) {
        is_finals.push(transcript);
        if (data.speech_final) {
          const utterance = is_finals.join(" ");
          is_finals = [];
          logger.info(`Deepgram STT: [Speech Final] ${utterance}`);
          
          // Store the transcript
          const streamData = activeStreams.get(streamSid);
          if (streamData) {
            streamData.transcripts.push(utterance);
            
            // Process with LLM and respond to the patient
            (async () => {
              try {
                const llmResponse = await llmService.generateResponse(utterance);
                
                // Generate speech with ElevenLabs for the LLM response
                const response = await elevenlabs.textToSpeechToStream(llmResponse);
                const readableStream = Readable.from(response);
                const audioArrayBuffer = await streamToArrayBuffer(readableStream);
                
                // Send the audio to the call
                ws.send(
                  JSON.stringify({
                    streamSid,
                    event: 'media',
                    media: {
                      payload: Buffer.from(audioArrayBuffer).toString('base64'),
                    },
                  })
                );
              } catch (error) {
                logger.error(`Error generating LLM response for stream ${streamSid}:`, error);
              }
            })();
          }
        }
      }
    }
  });

  deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
    logger.error('Deepgram STT error:', error);
  });

  deepgram.addListener(LiveTranscriptionEvents.Close, () => {
    logger.info('Deepgram STT: Disconnected');
  });

  return deepgram;
};

module.exports = {
  initiateCall,
  handleCallStatusWebhook,
  handleIncomingCall,
  handleStream
};