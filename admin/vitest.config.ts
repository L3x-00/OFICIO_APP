import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// Vitest + React Testing Library para el panel admin. jsdom como entorno
// de DOM. `tsconfigPaths` resuelve el alias `@/*` igual que Next.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['components/**', 'lib/**'],
      exclude: ['**/*.d.ts', 'node_modules/**'],
    },
  },
});
