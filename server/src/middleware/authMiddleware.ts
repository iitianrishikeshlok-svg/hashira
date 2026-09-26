// ============================================================================
// File: server/src/middleware/authMiddleware.ts
// Supabase JWT Verification & Demo Session Resolver
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@visualmind.ai',
  full_name: 'Alex Chen',
};

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // If no auth header provided
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In local dev / sandbox mode without Supabase Auth setup, allow demo fallback
    if (!isSupabaseConfigured || process.env.NODE_ENV === 'development') {
      req.user = DEMO_USER;
      return next();
    }
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  // If client passed demo token
  if (token === 'demo-token' || token === 'guest-token') {
    req.user = DEMO_USER;
    return next();
  }

  // If Supabase is configured, verify token with Supabase Auth
  if (isSupabaseConfigured) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired Supabase authentication token.' });
      }
      req.user = {
        id: user.id,
        email: user.email || 'user@visualmind.ai',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      };
      return next();
    } catch (err: any) {
      return res.status(401).json({ error: 'Authentication verification failure.' });
    }
  }

  // Fallback to demo user if Supabase is not yet configured
  req.user = DEMO_USER;
  next();
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = DEMO_USER;
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (isSupabaseConfigured && token !== 'demo-token') {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email || 'user@visualmind.ai',
          full_name: user.user_metadata?.full_name,
        };
      }
    } catch {
      req.user = DEMO_USER;
    }
  } else {
    req.user = DEMO_USER;
  }
  next();
}
