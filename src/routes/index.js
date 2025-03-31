const express = require('express');
const callController = require('../controllers/callController');

const router = express.Router();

router.post('/calls/outgoing', callController.initiateCall);
router.post('/calls/status', callController.handleCallStatusWebhook);

module.exports = router;