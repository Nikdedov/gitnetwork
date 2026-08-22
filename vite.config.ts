import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://raw.githubusercontent.com https://github.com",
  "connect-src 'self' https://api.github.com https://raw.githubusercontent.com",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'gitnetwork:csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${PROD_CSP}" />`,
      )
    },
  }
}

// GitHub Pages has no SPA rewrite rule: any deep link (e.g. /@alice) must
// serve index.html. GitHub Pages serves 404.html for unknown paths, so we
// emit a copy of index.html as 404.html.
function spaFallbackPlugin(): Plugin {
  return {
    name: 'gitnetwork:spa-fallback',
    apply: 'build',
    writeBundle(options) {
      const outDir = resolve(options.dir ?? 'dist')
      const index = resolve(outDir, 'index.html')
      const fallback = resolve(outDir, '404.html')
      if (existsSync(index)) copyFileSync(index, fallback)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), cspPlugin(), spaFallbackPlugin()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
