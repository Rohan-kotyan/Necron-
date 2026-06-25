import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const disableHmr = process.env.DISABLE_HMR === 'true';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled via DISABLE_HMR env var (used during agent edits
      // to prevent the browser from flickering on every file write).
      hmr: !disableHmr,
      // When HMR is disabled, also skip file watching to save CPU.
      watch: disableHmr ? undefined : {},
    },
  };
});
