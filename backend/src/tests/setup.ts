/**
 * Vitest global setup
 * Sets environment variables for test runs
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.OAUTH2_ISSUER = 'mock';
process.env.API_KEY = 'test-api-key';
process.env.FRONTEND_URL = 'http://localhost:5173';
