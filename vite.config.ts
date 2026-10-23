import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const tauriPlatform = process.env.TAURI_ENV_PLATFORM
const isTauri = Boolean(tauriPlatform)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Don't clear the screen so Tauri's CLI output stays visible.
  clearScreen: false,
  // Vite picks up TAURI_ENV_* alongside VITE_* so Rust-side env reaches the frontend.
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    hmr: process.env.TAURI_DEV_HOST
      ? { protocol: 'ws', host: process.env.TAURI_DEV_HOST, port: 1421 }
      : undefined,
    watch: {
      // Skip Rust source changes — Tauri handles those itself.
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    // Tauri's WebView2 (Windows) and WKWebView (macOS) targets.
    target: isTauri
      ? tauriPlatform === 'windows'
        ? 'chrome105'
        : 'safari13'
      : undefined,
    minify: isTauri ? (process.env.TAURI_ENV_DEBUG ? false : 'esbuild') : undefined,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
