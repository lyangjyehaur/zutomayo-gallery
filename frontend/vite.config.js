import path from "path"
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, existsSync, cpSync } from 'fs'
import { execSync } from 'child_process'
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8'))

// 注入版本號到環境變數，可以在程式碼中透過 import.meta.env.VITE_APP_VERSION 取得
process.env.VITE_APP_VERSION = pkg.version

// 注入建置日期與 Git Hash
const now = new Date()
process.env.VITE_BUILD_DATE = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

try {
  process.env.VITE_BUILD_HASH = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  process.env.VITE_BUILD_HASH = 'unknown'
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.ztmr\.club\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/img\.ztmr\.club\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'ZUTOMAYO MV Gallery',
        short_name: 'ZTMY Gallery',
        description: 'ZUTOMAYO (ずっと真夜中でいいのに。) 粉絲自建 MV 設定圖資料庫。',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: "所有 MV (All MVs)",
            short_name: "Gallery",
            description: "瀏覽所有 MV 設定圖",
            url: "/",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "我的收藏 (Favorites)",
            short_name: "Favorites",
            description: "查看已收藏的內容",
            url: "/zh-Hant/favorites",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // 在 frontend 資料夾內，@ 指向自己的 src 是正確的
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-scroll-area', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          'vendor-gallery': ['@fancyapps/ui', 'lightgallery', 'react-masonry-css', 'masonry-layout'],
          'vendor-editor': ['@monaco-editor/react'],
          'vendor-utils': ['swr', 'sonner', 'clsx', 'tailwind-merge', 'zod']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5010', // 你的後端實際運行位址
        changeOrigin: true,
        // 如果後端 API 本身就有 /api 前綴，則不需要 rewrite
        // 如果後端是 http://localhost:5000/mvs，則需要：
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
