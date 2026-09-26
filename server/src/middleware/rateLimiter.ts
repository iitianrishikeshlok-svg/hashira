// ============================================================================
// File: server/src/middleware/rateLimiter.ts
// Express Rate Limiter for AI Generation Protection
// ============================================================================
import rateLimit from 'express-rate-limit';

export const aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP/User to allow comfortable exploration
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded: Maximum 20 visual knowledge generations per 15 minutes. Please try again shortly.',
  },
});
