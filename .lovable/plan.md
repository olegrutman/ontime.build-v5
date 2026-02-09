

# Sasha Speaks -- Add Voice Output to Sasha

## Overview

Make Sasha speak her responses aloud using ElevenLabs Text-to-Speech, so users hear explanations instead of just reading them. Each time Sasha responds, her text is converted to speech and played automatically. Users can still see the text in the chat panel, but the primary experience becomes listening.

## How It Works

1. User asks Sasha a question (typed or tapped a button)
2. Sasha's text response streams in as before
3. Once the full response is ready, it gets sent to an Edge Function that calls ElevenLabs TTS
4. The audio plays automatically through the browser
5. A small speaker icon on each message lets users replay or mute

## Setup

- Connect the **ElevenLabs** connector (you'll be prompted to link your ElevenLabs API key)
- A new Edge Function (`elevenlabs-tts`) converts Sasha's text to speech
- The `SashaBubble` component auto-plays the audio after each response

## Voice Selection

Use a warm, friendly female voice from ElevenLabs -- **Laura** (voice ID: `FGY2WhTYpPnrIDTdsKH5`) -- to match Sasha's calm, reassuring persona. This can be changed later.

## Technical Details

### New Edge Function: `supabase/functions/elevenlabs-tts/index.ts`

- Accepts `{ text, voiceId }` in the request body
- Calls ElevenLabs TTS API (`eleven_turbo_v2_5` model for low latency)
- Returns raw MP3 audio bytes
- Uses `ELEVENLABS_API_KEY` from the connector

### Modified: `src/components/sasha/SashaBubble.tsx`

- After Sasha's full response is parsed, call the TTS edge function with the response text
- Use `fetch()` with `.blob()` to get the audio (not `supabase.functions.invoke`)
- Create an `Audio` object and play it automatically
- Track a `isSpeaking` state to show a small animated speaker icon
- Add a mute toggle button in the chat header so users can silence voice if they prefer

### Modified: `src/components/sasha/SashaMessage.tsx`

- Add a small speaker/replay button on each Sasha message
- Clicking it re-plays that message's audio

### New State

- `voiceEnabled` (boolean, default `true`) -- toggle in chat header
- `currentAudio` (Audio | null) -- reference to currently playing audio so we can stop it when a new message arrives or panel closes

### Audio Behavior

- Stop any playing audio when the user sends a new message
- Stop audio when the chat panel is closed
- Don't speak the initial greeting (it's static) -- only speak AI-generated responses
- Strip markdown formatting from text before sending to TTS for cleaner speech

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/elevenlabs-tts/index.ts` | New -- TTS edge function |
| `src/components/sasha/SashaBubble.tsx` | Add auto-play TTS after responses, mute toggle, audio cleanup |
| `src/components/sasha/SashaMessage.tsx` | Add replay button on assistant messages |
| `supabase/config.toml` | Register new edge function |

## No Database Changes

Audio is generated on-the-fly and not stored. No tables or migrations needed.

