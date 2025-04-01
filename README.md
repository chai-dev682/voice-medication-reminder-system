# Voice Medication Reminder System

A voice-driven medication reminder system that uses Twilio to make calls to patients, remind them about their medications, and capture their responses using Speech-to-Text technology.

## Features

- Trigger voice calls to patients via a REST API
- Text-to-Speech (TTS) for medication reminders
- Speech-to-Text (STT) to capture patient responses
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
- ngrok (for local webhook testing)

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start the server: `npm start`

## Testing

Run the test suite with:

```
npm test

For test coverage report:

```
npm run test:coverage
