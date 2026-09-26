export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Vercel Serverless Function is operational',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
}
