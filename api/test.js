export default async function handler(req, res) {
  try {
    const mod = await import('./index.js');
    res.status(200).json({
      status: 'ok',
      hasDefault: Boolean(mod.default),
      defaultType: typeof mod.default,
      isExpress: typeof mod.default?.handle,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
