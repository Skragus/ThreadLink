import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Browser-like environment for testing React components
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'dist/',
        'build/',
        'coverage/',
      ],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Add test timeout for slower tests
    testTimeout: 10000,
    // Include TypeScript files
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],    // Exclude certain patterns
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '**/*.config.*',
      '_archive/**',
      '**/node_modules/**',
      '**/@testing-library/**',
      '**/entities/**',
      '**/gensync/**',
      '**/json-schema-traverse/**'
    ],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
