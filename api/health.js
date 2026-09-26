export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    system: 'VisualMind AI Knowledge Extraction Engine (Vercel Serverless)',
    timestamp: new Date().toISOString(),
  });
}
