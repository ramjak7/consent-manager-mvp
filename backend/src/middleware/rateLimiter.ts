/**
 * Rate Limiting Middleware
 * Purpose: Protect against DoS/brute-force attacks
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.8, SEC-13
 */

import rateLimit from 'express-rate-limit';
import { trackRateLimitHit } from './metrics';

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: any, res: any) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    trackRateLimitHit('general', req.ip || 'unknown');
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 60
    });
  }
});

/**
 * Strict rate limiter for consent creation
 * Prevents abuse of consent request endpoint
 * 20 requests per minute per IP
 */
export const consentCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 consent creations per minute
  message: {
    error: 'Too many consent requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  skipSuccessfulRequests: false,
  handler: (req: any, res: any) => {
    console.warn(`Consent creation rate limit exceeded for IP: ${req.ip}`);
    trackRateLimitHit('consent_creation', req.ip || 'unknown');
    res.status(429).json({
      error: 'Too many consent requests. Please try again in 60 seconds.',
      retryAfter: 60
    });
  }
});

/**
 * Aggressive rate limiter for approval/rejection endpoints
 * Protects approval tokens from brute-force attacks
 * 10 attempts per minute per IP
 */
export const tokenEndpointLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  skipSuccessfulRequests: false,
  handler: (req: any, res: any) => {
    console.warn(`Token endpoint rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    trackRateLimitHit('token_endpoint', req.ip || 'unknown');
    res.status(429).json({
      error: 'Too many approval attempts. Please try again later.',
      retryAfter: 60
    });
  }
});

/**
 * Admin endpoint rate limiter
 * Very strict to protect sensitive operations
 * 30 requests per minute per IP
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skipFailedRequests: false,
  handler: (req: any, res: any) => {
    console.warn(`Admin endpoint rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    trackRateLimitHit('admin', req.ip || 'unknown');
    res.status(429).json({
      error: 'Too many admin requests. Please try again later.',
      retryAfter: 60
    });
  }
});

/**
 * Processing validation rate limiter
 * Higher limit for production traffic but still protected
 * 200 requests per minute per IP
 */
export const processLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skipSuccessfulRequests: false,
  handler: (req: any, res: any) => {
    console.warn(`Process endpoint rate limit exceeded for IP: ${req.ip}`);
    trackRateLimitHit('process', req.ip || 'unknown');
    res.status(429).json({
      error: 'Too many processing requests. Please try again later.',
      retryAfter: 60
    });
  }
});
