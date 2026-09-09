import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 }
    }
  }
});
