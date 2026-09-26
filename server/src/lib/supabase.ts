// ============================================================================
// File: server/src/lib/supabase.ts
// Supabase Client Utilities & Storage Management
// ============================================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

export const supabaseAdmin: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createClient('https://mock-instance.supabase.co', 'mock-service-role-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

if (isSupabaseConfigured) {
  console.log(`📡 Supabase Cloud Client successfully initialized with URL: ${supabaseUrl}`);
} else {
  console.log(`ℹ️ Supabase credentials not set in .env. High-fidelity persistent storage active.`);
}

// Local mock storage for demo user and fallback records
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const fallbackStorePath = path.join(DATA_DIR, 'visualmind_store.json');

export interface MemoryStore {
  profiles: Record<string, any>;
  documents: Record<string, any>;
  knowledge_maps: Record<string, any>;
  quizzes: Record<string, any>;
}

export function loadMemoryStore(): MemoryStore {
  try {
    if (fs.existsSync(fallbackStorePath)) {
      const data = fs.readFileSync(fallbackStorePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading fallback store:', err);
  }
  return {
    profiles: {},
    documents: {},
    knowledge_maps: {},
    quizzes: {},
  };
}

export function saveMemoryStore(store: MemoryStore) {
  try {
    fs.writeFileSync(fallbackStorePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving fallback store:', err);
  }
}
