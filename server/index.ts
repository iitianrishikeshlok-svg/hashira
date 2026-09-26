// ============================================================================
// File: server/index.ts
// VisualMind AI - Primary Express Server Initialization
// ============================================================================
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './src/routes/api';
import { isGeminiConfigured, GEMINI_MODEL_FAST } from './src/lib/gemini';
import { isSupabaseConfigured } from './src/lib/supabase';

const app = express();

// Security & Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline scripts/SVGs and Mermaid dynamic rendering
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Payload limits: JSON capped at 2MB as per specifications
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// RESTful API Routes (multi-prefix for serverless rewrite compatibility)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/v1', apiRouter);

// Root & API health check
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'VisualMind AI Knowledge Extraction Engine',
    gemini: isGeminiConfigured ? `${GEMINI_MODEL_FAST} (Active)` : 'Dynamic Synthesizer (Ready)',
    supabase: isSupabaseConfigured ? 'Connected (Cloud)' : 'Active (Local Data Layer)',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static build in production if present
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🧠 VisualMind AI Knowledge Extraction Engine`);
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/v1`);
    console.log(`🤖 Gemini Status: ${isGeminiConfigured ? 'API KEY ACTIVE' : 'SIMULATOR & DYNAMIC PARSER ACTIVE'}`);
    console.log(`🗄️ Supabase Status: ${isSupabaseConfigured ? 'CONNECTED' : 'LOCAL PERSISTENT STORE ACTIVE'}`);
    console.log(`====================================================`);
  });
}

const handler = (req: any, res: any) => {
  return app(req, res);
};

export { app };
export default handler;
