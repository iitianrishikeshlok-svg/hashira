import app from './index.js';

export default async function handler(req, res) {
  try {
    return await app(req, res);
  } catch (err) {
    console.error('Serverless Catch-All Error:', err);
    return res.status(500).json({
      error: 'Vercel Serverless Function Error: ' + (err?.message || String(err)),
      stack: err?.stack,
    });
  }
}
