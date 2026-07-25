import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative paths so the built app also works over file:// inside the Electron shell.
  base: './',
  plugins: [react()],
})
