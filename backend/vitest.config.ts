import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/tests/basic.test.ts'],  // Legacy test runner
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['src/tests/setup.ts'],
  },
});
