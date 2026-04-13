import path from "path"
import { fileURLToPath } from 'url'
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // 在 frontend 資料夾內，@ 指向自己的 src 是正確的
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // 你的後端實際運行位址
        changeOrigin: true,
        // 如果後端 API 本身就有 /api 前綴，則不需要 rewrite
        // 如果後端是 http://localhost:5000/mvs，則需要：
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})