const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Create mock for openai
const openaiMock = {
  chat: {
    completions: {
      create: sinon.stub()
    }
  }
};

// Create mock for logger
const loggerMock = {
  info: sinon.stub(),
  error: sinon.stub()
};

// Use proxyquire to inject our mocks
const llmService = proxyquire('../src/services/llmService', {
  'openai': openaiMock,
  '../utils/logger': loggerMock
});

describe('LLM Service', () => {
  afterEach(() => {
    // Reset all stubs after each test
    sinon.restore();
    openaiMock.chat.completions.create.reset();
    loggerMock.info.reset();
    loggerMock.error.reset();
  });

  describe('generateResponse', () => {
    it('should generate a response based on patient input', async () => {
      // Setup mock response
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Thanks for confirming. Remember to take your evening dose too.'
            }
          }
        ]
      };
      
      openaiMock.chat.completions.create.resolves(mockResponse);
      
      const patientResponse = "Yes, I took my morning medications";
      const result = await llmService.generateResponse(patientResponse);
      
      // Verify the function called the OpenAI API correctly
      expect(openaiMock.chat.completions.create.calledOnce).to.be.true;
      expect(openaiMock.chat.completions.create.firstCall.args[0].model).to.equal('gpt-4o');
      expect(openaiMock.chat.completions.create.firstCall.args[0].messages[1].content).to.include(patientResponse);
      
      // Verify the function returned the expected response
      expect(result).to.equal('Thanks for confirming. Remember to take your evening dose too.');
      
      // Verify logging
      expect(loggerMock.info.calledTwice).to.be.true;
      expect(loggerMock.info.firstCall.args[0]).to.include(patientResponse);
      expect(loggerMock.info.secondCall.args[0]).to.include(result);
    });

    it('should handle empty responses from the LLM', async () => {
      // Setup mock response with empty content
      const mockResponse = {
        choices: [
          {
            message: {
              content: '   '  // Just whitespace
            }
          }
        ]
      };
      
      openaiMock.chat.completions.create.resolves(mockResponse);
      
      const patientResponse = "I don't understand";
      const result = await llmService.generateResponse(patientResponse);
      
      // The trim() in the code should handle the whitespace
      expect(result).to.equal('');
    });

    it('should return a fallback response when the API call fails', async () => {
      // Make the API call throw an error
      const error = new Error('API connection failed');
      openaiMock.chat.completions.create.rejects(error);
      
      const patientResponse = "Did I take my medicine today?";
      const result = await llmService.generateResponse(patientResponse);
      
      // Verify error was logged
      expect(loggerMock.error.calledOnce).to.be.true;
      expect(loggerMock.error.firstCall.args[0]).to.equal('Error generating LLM response:');
      expect(loggerMock.error.firstCall.args[1]).to.equal(error);
      
      // Verify fallback response was returned
      expect(result).to.equal("Thank you for your response. Your healthcare provider has been notified.");
    });

    it('should handle malformed responses from the API', async () => {
      // Setup a malformed response missing the expected structure
      const malformedResponse = {
        // Missing choices array
        something_else: []
      };
      
      openaiMock.chat.completions.create.resolves(malformedResponse);
      
      const patientResponse = "Hello, is anyone there?";
      const result = await llmService.generateResponse(patientResponse);
      
      // This should trigger an error and return the fallback
      expect(result).to.equal("Thank you for your response. Your healthcare provider has been notified.");
      expect(loggerMock.error.calledOnce).to.be.true;
    });
  });
});
