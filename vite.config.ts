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
        // index.html MUST stay the app: electron/main.cjs loads dist/index.html, and the
        // packaged exe would render blank if this moved. The web host maps / to landing.html
        // and /demo to index.html instead — see vercel.json.
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
    },
  },
})
