# Voice Medication Reminder System

A voice-driven medication reminder system that uses Twilio to make calls to patients, remind them about their medications, and capture their responses using Speech-to-Text technology.

## Features

- Trigger voice calls to patients via a REST API
- Text-to-Speech (TTS) for medication reminders using ElevenLabs
- Real-time Speech-to-Text (STT) with Deepgram for interactive conversations
- Intelligent response generation using OpenAI's GPT-4o
- Voicemail and SMS fallback for unanswered calls
- Call data logging to console
- Robust error handling and edge case management
- Comprehensive test suite

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Twilio account
- Deepgram account (for STT)
- ElevenLabs account (for TTS)
- OpenAI account (for LLM)
- ngrok (for local webhook testing)

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/chai-dev682/voice-medication-reminder-system.git
   cd voice-medication-reminder
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```

4. Fill in your API keys and configuration in the `.env` file.

## Configuration

### Environment Variables

Your `.env` file should include the following variables:

### Twilio Setup

1. Sign up for a Twilio account at [twilio.com](https://www.twilio.com)
2. Purchase a phone number with voice capabilities
3. Get your Account SID and Auth Token from the Twilio dashboard
4. Add these credentials to your `.env` file

### STT Setup (Deepgram)

1. Sign up for a Deepgram account at [deepgram.com](https://deepgram.com)
2. Create an API key
3. Add the API key to your `.env` file

### TTS Setup (ElevenLabs)

1. Sign up for an ElevenLabs account at [elevenlabs.io](https://elevenlabs.io)
2. Create an API key
3. Add the API key to your `.env` file

### Local Development with ngrok

1. Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com)
2. Start your application: `npm run dev`
3. In a separate terminal, start ngrok: `ngrok http 3000`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and add it to your `.env` file as `WEBHOOK_BASE_URL`
5. Configure your Twilio phone number's webhook to point to `{WEBHOOK_BASE_URL}/api/calls/incoming`

## Usage

### Starting the Server

```
npm start
```

For development with auto-reload:

```
npm run dev
```

### API Endpoints

#### Trigger a Call

```
POST /api/calls/outgoing
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

### Call Flow

1. System initiates a call to the patient
2. When answered, the system plays a medication reminder message
3. The patient responds verbally
4. Deepgram transcribes the response in real-time
5. OpenAI processes the transcription and generates an appropriate reply
6. ElevenLabs converts the reply to speech
7. The system plays the response to the patient
8. The conversation continues until the call ends

## Testing

Run the test suite:

```
npm test
```

For test coverage:

```
npm run test:coverage
```

## License

MIT