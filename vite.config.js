/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Vite replaces the old CRA (react-scripts + react-app-rewired + config-overrides.js) toolchain.
export default defineConfig({
  plugins: [
    react(),
    // Replaces the webpack polyfills that deps like bip39 / crypto-js / @react-pdf expect
    // in the browser (crypto, buffer, stream, process, …) plus the Buffer/process globals.
    nodePolyfills({
      globals: { Buffer: true, process: true, global: true },
      protocolImports: true,
    }),
  ],
  build: {
    outDir: 'build', // keep CRA's output dir — Vercel, Docker and the SEA packer all read build/
    chunkSizeWarningLimit: 4000,
    // No inline module-preload polyfill → keeps the strict CSP (script-src 'self') happy.
    modulePreload: { polyfill: false },
  },
  server: { port: 3000 },
  preview: { port: 3000 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
  },
});
