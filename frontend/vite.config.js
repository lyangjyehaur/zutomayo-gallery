import path from "path"
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, existsSync, cpSync } from 'fs'
import { execSync } from 'child_process'
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from "vite"

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

// 產生 version.json 到 public 資料夾，讓 PWA 更新時能抓取新版本資訊
const versionData = {
  version: process.env.VITE_APP_VERSION,
  buildDate: process.env.VITE_BUILD_DATE,
  buildHash: process.env.VITE_BUILD_HASH
}
writeFileSync(path.resolve(__dirname, 'public', 'version.json'), JSON.stringify(versionData, null, 2))

const normalizeOrigin = (value, fallback) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  return (raw || fallback).replace(/\/+$/, '');
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiOrigin = normalizeOrigin(env.VITE_API_ORIGIN, 'https://api.ztmr.club');
  const imgproxyOrigin = normalizeOrigin(env.VITE_IMGPROXY_ORIGIN, 'https://img.ztmr.club');

  return {
    base: env.VITE_BASE || '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,webmanifest}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 放寬到 5MB 以容納大型 JS chunk
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*`, 'i'),
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
              urlPattern: new RegExp(`^${imgproxyOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*`, 'i'),
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
          enabled: env.VITE_PWA_DEV === 'true'
        },
        manifest: false
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // 在 frontend 資料夾內，@ 指向自己的 src 是正確的
      },
      dedupe: ["@tanstack/query-core", "@tanstack/react-query"],
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
            'vendor-ui': [
              '@radix-ui/react-alert-dialog', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover', '@radix-ui/react-progress', '@radix-ui/react-scroll-area',
              '@radix-ui/react-select', '@radix-ui/react-slot', '@radix-ui/react-switch',
              '@radix-ui/react-tabs', '@radix-ui/react-tooltip', 'cmdk', 'vaul'
            ],
            'vendor-gallery': ['@fancyapps/ui', 'lightgallery', 'react-masonry-css', 'masonry-layout', 'imagesloaded'],
            'vendor-editor': ['@monaco-editor/react'],
            'vendor-utils': ['swr', 'sonner', 'clsx', 'tailwind-merge'],
            'vendor-icons': ['lucide-react'],
            'vendor-three': ['three'],
            'vendor-waline': ['@waline/client'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'vendor-auth': ['@simplewebauthn/browser'],
            'vendor-table': ['@tanstack/react-table']
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
  }
})
