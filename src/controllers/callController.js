const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

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

module.exports = {
  initiateCall,
  handleCallStatusWebhook
};