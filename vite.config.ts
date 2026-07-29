import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

/**
 * Mirror vercel.json's `/demo -> /app.html` rewrite in the dev server.
 *
 * Without it the two disagree: Vite's SPA fallback serves index.html — the LANDING page — for an
 * unknown path, so `/demo` in dev showed marketing copy while production served the app. That makes
 * the demo untestable locally, which is how a demo-seeding regression slipped through once already.
 *
 * A server-side rewrite leaves the browser's URL as /demo, so `isDemoPath` still sees the demo path
 * and seeds — exactly as on Vercel.
 */
function demoRoute() {
  return {
    name: 'demo-route',
    configureServer(server: { middlewares: { use: (fn: Handler) => void } }) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split('?')[0]
        if (path === '/demo' || path === '/demo/') req.url = '/app.html'
        next()
      })
    },
  }
}

type Handler = (
  req: { url?: string },
  res: unknown,
  next: (err?: unknown) => void,
) => void

export default defineConfig({
  // Relative paths so the built app also works over file:// inside the Electron shell.
  base: './',
  plugins: [react(), demoRoute()],
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
