const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Create mock for twilio
const twilioClientMock = {
  calls: {
    create: sinon.stub().resolves({ sid: 'CA123456789' })
  }
};

const twilioMock = {
  twiml: {
    VoiceResponse: function() {
      return {
        say: sinon.stub().returns(this),
        toString: sinon.stub().returns('<Response><Say>Hello</Say></Response>')
      };
    }
  }
};

// Stub for twilio constructor function
const twilioConstructorStub = sinon.stub().returns(twilioClientMock);
// Add the twiml property to the constructor
twilioConstructorStub.twiml = twilioMock.twiml;

// Use proxyquire to inject our mock
const twilioService = proxyquire('../src/services/twilioService', {
  'twilio': twilioConstructorStub
});

describe('Twilio Service', () => {
  let twilioClientStub;
  let callsCreateStub;
  let callsUpdateStub;
  let messagesCreateStub;
  
  beforeEach(() => {
    // Create stubs for Twilio client methods
    callsCreateStub = sinon.stub().resolves({ sid: 'CA123456789' });
    callsUpdateStub = sinon.stub().resolves({});
    messagesCreateStub = sinon.stub().resolves({ sid: 'SM123456789' });
    
    // Create a stub for the Twilio client
    twilioClientStub = {
      calls: {
        create: callsCreateStub
      },
      messages: {
        create: messagesCreateStub
      }
    };
    
    // Add the update method to calls with a specific SID
    twilioClientStub.calls.create.returns(Promise.resolve({ sid: 'CA123456789' }));
    twilioClientStub.calls = {
      ...twilioClientStub.calls,
      'CA123456789': {
        update: callsUpdateStub
      }
    };
    
    // Stub the twilio constructor
    sinon.stub('twilio').returns(twilioClientStub);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('makeCall', () => {
    it('should make a call to the specified phone number', async () => {
      const phoneNumber = '+1234567890';
      const message = 'Test message';
      
      const result = await twilioService.makeCall(phoneNumber, message);
      
      expect(twilioClientMock.calls.create.calledOnce).to.be.true;
      expect(twilioClientMock.calls.create.firstCall.args[0]).to.include({
        to: phoneNumber
      });
      expect(result.sid).to.equal('CA123456789');
    });
    
    it('should handle errors when making a call', async () => {
      const phoneNumber = '+1234567890';
      
      // Make the create method throw an error
      twilioClientMock.calls.create.rejects(new Error('Failed to make call'));
      
      try {
        await twilioService.makeCall(phoneNumber);
        // If we reach here, the test should fail
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('Failed to make call');
      }
    });
  });
  
  describe('handleAnsweringMachine', () => {
    it('should leave a voicemail when call is answered by machine', async () => {
      const phoneNumber = '+1234567890';
      const callSid = 'CA123456789';
      
      await twilioService.handleAnsweringMachine(phoneNumber, callSid);
      
      expect(callsUpdateStub.calledOnce).to.be.true;
      expect(callsUpdateStub.firstCall.args[0].twiml).to.include('We called to check on your medication');
    });
    
    it('should send SMS when voicemail fails', async () => {
      const phoneNumber = '+1234567890';
      const callSid = 'CA123456789';
      const error = new Error('Failed to leave voicemail');
      
      callsUpdateStub.rejects(error);
      
      await twilioService.handleAnsweringMachine(phoneNumber, callSid);
      
      expect(messagesCreateStub.calledOnce).to.be.true;
      expect(messagesCreateStub.firstCall.args[0].to).to.equal(phoneNumber);
      expect(messagesCreateStub.firstCall.args[0].body).to.include('We called to check on your medication');
    });
  });
  
  describe('handleCallStatus', () => {
    it('should handle completed calls correctly', async () => {
      const statusData = {
        CallSid: 'CA123456789',
        CallStatus: 'completed',
        To: '+1234567890',
        AnsweredBy: 'human'
      };
      
      await twilioService.handleCallStatus(statusData);
      
      // No voicemail should be left for human-answered calls
      expect(callsUpdateStub.called).to.be.false;
    });
    
    it('should handle machine-answered calls correctly', async () => {
      const statusData = {
        CallSid: 'CA123456789',
        CallStatus: 'completed',
        To: '+1234567890',
        AnsweredBy: 'machine'
      };
      
      await twilioService.handleCallStatus(statusData);
      
      // Voicemail should be left for machine-answered calls
      expect(callsUpdateStub.calledOnce).to.be.true;
    });
    
    it('should handle unanswered calls correctly', async () => {
      const statusData = {
        CallSid: 'CA123456789',
        CallStatus: 'no-answer',
        To: '+1234567890'
      };
      
      await twilioService.handleCallStatus(statusData);
      
      // Voicemail should be attempted for unanswered calls
      expect(callsUpdateStub.calledOnce).to.be.true;
    });
  });
}); 