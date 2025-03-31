# Voice Medication Reminder System

A voice-driven medication reminder system that uses Twilio to make calls to patients, remind them about their medications, and capture their responses using Speech-to-Text technology.

## Features

- Trigger voice calls to patients via a REST API
- Text-to-Speech (TTS) for medication reminders
- Speech-to-Text (STT) to capture patient responses
- Voicemail and SMS fallback for unanswered calls
- Call data logging to console

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Twilio account
- Deepgram account (for STT)
- ElevenLabs account (for TTS)
- ngrok (for local webhook testing)
