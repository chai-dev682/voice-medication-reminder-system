const express = require('express');
const callController = require('../controllers/callController');

const router = express.Router();

// Outgoing call routes
router.post('/calls/outgoing', callController.initiateCall);
router.post('/calls/status', callController.handleCallStatusWebhook);

// Incoming call routes
router.post('/calls/incoming', callController.handleIncomingCall);

module.exports = router;