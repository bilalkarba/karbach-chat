import { config } from 'dotenv';
config();

import '@/ai/flows/call-gemini-api.ts';
import '@/ai/flows/transcribe-audio-flow.ts';
