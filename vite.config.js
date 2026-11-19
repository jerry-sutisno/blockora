import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Naikkan batas ukuran precache ke 4MB agar bundle Phaser tidak terlewat
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      },
      manifest: {
        name: 'BLOCKORA',
        short_name: 'BLOCKORA',
        description: 'Game puzzle susun balok 10x10 taktil dan santai',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f8f9ff',
        background_color: '#f8f9ff',
        id: '/?source=pwa',
        categories: ['games', 'puzzle'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: false // Jangan aktifkan SW di dev server agar tidak mengganggu pengembangan
      }
    })
  ]
});
