export default async function handler(req, res) {
  try {
    const mod = await import('./index.js');
    res.status(200).json({
      status: 'healthy',
      hasDefault: Boolean(mod.default),
      type: typeof mod.default,
      keys: Object.keys(mod),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
