import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the same build works at a domain root (Vercel)
  // and under a repository sub-path (GitHub Pages: https://<user>.github.io/<repo>/).
  base: './',
})
