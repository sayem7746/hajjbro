import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/** General API rate limit: 100 requests per 15 minutes per IP. */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX ?? 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stricter limit for auth endpoints: 10 attempts per 15 minutes. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX ?? 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
