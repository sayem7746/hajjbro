import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

function isKafelaLivePath(path: string): boolean {
  return /\/kafelas\/[^/]+\/(events|snapshot)\/?$/.test(path);
}

/** General API rate limit: 100 requests per 15 minutes per IP. */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX ?? 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isKafelaLivePath(req.path),
});

/** Stricter limit for auth endpoints: 10 attempts per 15 minutes. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX ?? 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Per-user cap for kafela live sync (SSE + snapshot).
 * Shared hotel/bus IPs would otherwise thrash the global per-IP limiter.
 * Keyed by authenticated user id only (never by IP).
 */
export const kafelaLiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { error: 'Too many kafela sync requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? 'anonymous',
  validate: { keyGeneratorIpFallback: false },
});
