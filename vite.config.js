import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import path from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'framer-motion-vendor': ['framer-motion'],
          'pdfjs-vendor': ['pdfjs-dist'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'lucide-vendor': ['lucide-react'],
          'html2canvas-vendor': ['html2canvas']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
})
