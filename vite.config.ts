import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  // Relative paths so the built app also works over file:// inside the Electron shell.
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // index.html is the LANDING page and app.html is the application — not the other way
        // round, which is the arrangement you would expect. Vercel resolves static files before
        // rewrites, so an app at dist/index.html wins at / and no rewrite can get past it.
        // electron/main.cjs loads dist/app.html to match.
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
})
