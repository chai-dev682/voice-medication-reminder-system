// Load environment variables at the top of your test file
require('dotenv').config();

const { expect } = require('chai');
const sinon = require('sinon');
const callController = require('../src/controllers/callController');
const twilioService = require('../src/services/twilioService');
const elevenlabs = require('../src/services/elevenlabsService');

let chai;

before(async () => {
  // Dynamically import chai
  chai = await import('chai');
});

describe('Call Controller', () => {
  let req;
  let res;
  let twilioServiceStub;
  let elevenlabsStub;
  
  beforeEach(() => {
    // Create request and response objects
    req = {
      body: {}
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      writeHead: sinon.stub(),
      end: sinon.stub(),
      send: sinon.stub()
    };
    
    // Stub twilioService methods
    twilioServiceStub = sinon.stub(twilioService, 'makeCall').resolves({ sid: 'CA123456789' });
    sinon.stub(twilioService, 'handleCallStatus').resolves();
    
    // Stub elevenlabs methods
    elevenlabsStub = sinon.stub(elevenlabs, 'textToSpeechToStream').resolves(Buffer.from('audio data'));
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('initiateCall', () => {
    it('should initiate a call to the specified phone number', async () => {
      req.body.phoneNumber = '+1234567890';
      
      await callController.initiateCall(req, res);
      
      expect(twilioServiceStub.calledOnce).to.be.true;
      expect(twilioServiceStub.firstCall.args[0]).to.equal('+1234567890');
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0].success).to.be.true;
    });
    
    it('should return an error if phone number is missing', async () => {
      await callController.initiateCall(req, res);
      
      expect(twilioServiceStub.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0].success).to.be.false;
    });
    
    it('should handle errors when initiating a call', async () => {
      req.body.phoneNumber = '+1234567890';
      const error = new Error('Failed to initiate call');
      
      twilioServiceStub.rejects(error);
      
      await callController.initiateCall(req, res);
      
      expect(twilioServiceStub.calledOnce).to.be.true;
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0].success).to.be.false;
    });
  });
  
  describe('handleCallStatusWebhook', () => {
    it('should handle call status updates', async () => {
      req.body = {
        CallSid: 'CA123456789',
        CallStatus: 'completed'
      };
      
      await callController.handleCallStatusWebhook(req, res);
      
      expect(twilioService.handleCallStatus.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
    });
    
    it('should handle errors in call status updates', async () => {
      req.body = {
        CallSid: 'CA123456789',
        CallStatus: 'completed'
      };
      
      const error = new Error('Failed to handle call status');
      twilioService.handleCallStatus.rejects(error);
      
      await callController.handleCallStatusWebhook(req, res);
      
      expect(twilioService.handleCallStatus.calledOnce).to.be.true;
      expect(res.status.calledWith(500)).to.be.true;
    });
  });
  
  describe('handleIncomingCall', () => {
    it('should handle incoming calls', async () => {
      req.body = {
        CallSid: 'CA123456789',
        From: '+1234567890'
      };
      
      await callController.handleIncomingCall(req, res);
      
      expect(res.writeHead.calledWith(200, { 'Content-Type': 'text/xml' })).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });
    
    it('should handle errors in incoming calls', async () => {
      req.body = {};
      
      // Force an error by making From undefined
      await callController.handleIncomingCall(req, res);
      
      expect(res.writeHead.calledWith(200, { 'Content-Type': 'text/xml' })).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });
  });
}); 