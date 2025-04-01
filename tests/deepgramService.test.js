const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Create mock for @deepgram/sdk
const deepgramMock = {
  createClient: sinon.stub().returns({
    listen: {
      prerecorded: {
        transcribeUrl: sinon.stub().resolves({
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: 'This is a test transcript'
                  }
                ]
              }
            ]
          }
        })
      }
    }
  })
};

// Use proxyquire to inject our mock
const deepgramService = proxyquire('../src/services/deepgramService', {
  '@deepgram/sdk': deepgramMock
});

describe('Deepgram Service', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio from a URL', async () => {
      const audioUrl = 'https://d67d-165-22-39-162.ngrok-free.app/audio/tts_1743414772079.mp3';
      
      const result = await deepgramService.transcribeAudio(audioUrl);
      
      expect(deepgramMock.createClient.calledOnce).to.be.true;
      expect(result).to.equal('This is a test transcript');
    });

    it('should handle errors during transcription', async () => {
      const audioUrl = 'https://d67d-165-22-39-162.ngrok-free.app/audio/tts_1743414772079.mp3';
      
      // Make the transcribeUrl method throw an error
      const deepgramClientMock = deepgramMock.createClient();
      deepgramClientMock.listen.prerecorded.transcribeUrl.rejects(new Error('Transcription failed'));
      
      try {
        await deepgramService.transcribeAudio(audioUrl);
        // If we reach here, the test should fail
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.include('Transcription failed');
      }
    });
  });
}); 