import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' keeps the built app relocatable (any folder or sub-path).
export default defineConfig({
  base: './',
  resolve: { preserveSymlinks: true },
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
});
