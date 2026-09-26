// ============================================================================
// File: server/src/lib/gemini.ts
// Official Google Gen AI SDK Integration (@google/genai)
// ============================================================================
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

export const isGeminiConfigured = Boolean(
  apiKey &&
  apiKey.trim().length >= 20 &&
  !apiKey.includes('...') &&
  !apiKey.includes('your_') &&
  apiKey !== '++' &&
  !apiKey.startsWith('++')
);

export const ai = isGeminiConfigured
  ? new GoogleGenAI({ apiKey: apiKey.trim() })
  : new GoogleGenAI({ apiKey: 'dummy-key-for-initialization' });

// Default models to use across system
export const GEMINI_MODEL_FAST = 'gemini-2.5-flash';
export const GEMINI_MODEL_PRO = 'gemini-2.5-pro';

if (isGeminiConfigured) {
  console.log(`🤖 Google Gen AI (@google/genai) initialized with ${GEMINI_MODEL_FAST} / ${GEMINI_MODEL_PRO}`);
} else {
  console.log(`⚠️ GEMINI_API_KEY not configured in .env. High-fidelity dynamic fallback knowledge synthesis active.`);
}
