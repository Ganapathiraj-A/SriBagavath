import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'
import path from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,mjs}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
      },
      manifest: {
        name: 'Sri Bagavath',
        short_name: 'Sri Bagavath',
        description: 'Inner Path to Spiritual Enlightenment. Satsangs, Books, and Teachings of Sri Bagavath Ayya.',
        theme_color: '#ff9800',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        prefer_related_applications: false,
        related_applications: [
          {
            "platform": "play",
            "url": "https://play.google.com/store/apps/details?id=com.bhavathpathai.app",
            "id": "com.bhavathpathai.app"
          }
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
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
