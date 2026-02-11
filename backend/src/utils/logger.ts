/**
 * Structured Logger using Winston
 * Purpose: Centralized logging with structured data for observability
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section P0-9
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'dev';

/**
 * Custom format for console output (dev mode)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

/**
 * JSON format for production (for log aggregation)
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
  defaultMeta: {
    service: 'consent-manager',
    environment: nodeEnv,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    
    // File output for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // File output for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

/**
 * Express middleware for request logging
 */
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  
  next();
}

/**
 * Log audit events with structured data
 */
export function logAuditEvent(eventType: string, metadata: Record<string, any>) {
  logger.info('Audit Event', {
    eventType,
    ...metadata,
  });
}

/**
 * Log security events
 */
export function logSecurityEvent(event: string, metadata: Record<string, any>) {
  logger.warn('Security Event', {
    event,
    ...metadata,
  });
}

/**
 * Log errors with stack traces
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}
