# ZUTOMAYO MV Gallery

一個 ZUTOMAYO MV 資料庫。

繁體中文 (Traditional Chinese) | [简体中文 (Simplified Chinese)](README.zh-Hans.md)

![Version](https://img.shields.io/badge/version-3.2-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

---

## 目錄

- [簡介](#簡介)
- [特色功能](#特色功能)
- [技術棧](#技術棧)
- [專案結構](#專案結構)
- [快速開始](#快速開始)
- [環境變數配置](#環境變數配置)
- [部署指南 (V3.2)](#部署指南-v32)

---

## 簡介

本專案是一個展示 ZUTOMAYO MV 設定圖的線上畫廊，同時提供管理後台用於資料維護。前端使用 React + TypeScript 構建，後端採用 Express + Node.js。支援多種燈箱展示模式（Fancybox、LightGallery）及瀑布流佈局。

---

## 特色功能

- 🖼️ **沉浸式畫廊體驗**：支援 Fancybox 與 LightGallery 雙燈箱模式切換，提供無縫的圖片瀏覽體驗。
- 🧱 **瀑布流佈局**：採用高效能的 Masonry 瀑布流設計，自動適應不同尺寸的 MV 設定圖。
- 🔐 **現代化安全登入**：支援 WebAuthn (通行密鑰 / Passkeys) 與生物辨識登入管理後台，無須記憶密碼。
- 📊 **資料可視化與編輯**：內建 Monaco Editor 支援直接編輯 JSON 資料，並提供完善的資料庫管理介面。
- 💬 **互動留言系統**：整合 Waline 留言板，支援自定義 Emoji 與即時互動。
- ⚡ **極致效能優化**：嚴格的 React.memo 渲染控制、組件懶加載與 Vite Chunk 拆分，確保頁面載入如絲般順滑。

---

## 技術棧

### 前端

| 技術 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | 18.3 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 類型安全 |
| [Vite](https://vitejs.dev/) | 5.4 | 建構工具 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | 樣式框架 |
| [shadcn/ui](https://ui.shadcn.com/) | 4.2 | UI 組件庫 |
| [Neobrutalism](https://www.neobrutalism.dev/) | - | 設計風格與主題 |
| [Fancybox](https://fancyapps.com/fancybox/) | 6.1 | 燈箱組件 |
| [LightGallery](https://www.lightgalleryjs.com/) | 2.9 | 燈箱組件 (備用) |
| [Masonry](https://masonry.desandro.com/) | 4.2 | 瀑布流佈局 |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7 | 代碼編輯器 |
| [Waline](https://waline.js.org/) | 3.5 | 留言系統 |
| [Umami](https://umami.is/) | - | 網站數據分析 |
| [React Router](https://reactrouter.com/) | 6.22 | 路由管理 |
| [SWR](https://swr.vercel.app/) | 2.4 | 資料獲取 |

### 後端

| 技術 | 版本 | 用途 |
|------|------|------|
| [Express](https://expressjs.com/) | 4.19 | Web 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 類型安全 |
| [Zod](https://zod.dev/) | 3.22 | 輸入驗證 |
| [probe-image-size](https://github.com/nodeca/probe-image-size) | 7.2 | 圖片尺寸偵測 |
| [Helmet](https://helmetjs.github.io/) | 7.1 | 安全 headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.1 | 請求限流 |
| [CORS](https://github.com/expressjs/cors) | 2.8 | 跨域支援 |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 11.1 | 高效能同步資料庫驅動 |

---

## 專案結構

```text
zutomayo-gallery/
├── frontend/                    # 前端應用 (React)
│   ├── public/                  # 靜態資源 & 舊版 Vanilla JS 實作
│   ├── src/
│   │   ├── components/          # React 組件
│   │   │   ├── ui/              # shadcn/ui 組件
│   │   │   ├── FancyboxViewer.tsx # Fancybox 燈箱組件
│   │   │   ├── LightGalleryViewer.tsx # LightGallery 燈箱組件
│   │   │   ├── MVCard.tsx       # MV 卡片
│   │   │   ├── MVDetailsModal.tsx # MV 詳情彈窗
│   │   │   └── WalineComments.tsx # 留言板組件
│   │   ├── pages/               # 頁面組件 (AdminPage, DebugGallery 等)
│   │   ├── lib/                 # 工具函數與類型定義
│   │   ├── config/              # 配置檔案
│   │   ├── hooks/               # 自定義 Hooks
│   │   └── debug/               # 開發用除錯組件
│   └── package.json
│
├── backend/                     # 後端 API (Node.js)
│   ├── data/
│   │   └── data.json            # MV 數據文件
│   ├── src/
│   │   ├── controllers/         # 路由控制器
│   │   ├── routes/              # API 路由
│   │   ├── services/            # 業務邏輯
│   │   ├── validators/          # Zod 驗證器
│   │   ├── middleware/          # Express 中間件
│   │   └── index.ts             # 入口文件
│   └── package.json
│
├── package.json                 # 根目錄 workspace 配置
├── deploy.sh                    # 伺服器自動化部署腳本 (V3.2 新增)
└── README.md
```

---

## 快速開始

### 🚀 一鍵啟動（最簡單的方式）

**Windows 用戶**：
- 雙擊 `start.bat` 文件（最簡單）
- 或雙擊 `launch.bat` 文件（有更多檢查）

**Linux/Mac 用戶**：
- 在終端機運行 `./start.sh`
- 或運行 `npm run dev`

**命令列用戶**：
- 運行 `npm run dev` 啟動前後端
- 運行 `npm run start:frontend` 只啟動前端
- 運行 `npm run start:backend` 只啟動後端

### 前置需求

- Node.js >= 18
- npm 或 pnpm
- Git

### 安裝

```bash
# 1. 取得程式碼
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery

# 2. 方法一：一鍵安裝所有依賴（推薦）
npm run install:all

# 3. 方法二：分別安裝
# 安裝根依賴
npm install

# 安裝前端依賴
cd frontend && npm install

# 安裝後端依賴
cd ../backend && npm install
```

### 開發模式

```bash
# 方法一：一鍵啟動（推薦）
npm run dev
# 這個命令會同時啟動前端（localhost:5173）和後端（localhost:5000）

# 方法二：分別啟動
# 啟動前端
npm run start:frontend

# 啟動後端
npm run start:backend
```

### 生產構建

```bash
# 前端構建
cd frontend && npm run build

# 後端構建
cd backend && npm run build
```

---

## 環境變數配置

本專案提供了環境變數的模板檔案（`.env.example`）。在部署或生產環境中，請將其複製為 `.env` 並根據實際情況修改：
```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 前端環境變數 (`frontend/.env`)
| 變數名稱 | 說明 | 預設值 |
|---|---|---|
| `VITE_API_URL` | 後端 API 伺服器地址，生產環境若為分離部署請務必設定 | `/api/mvs` |
| `VITE_WALINE_SERVER_URL` | Waline 留言板伺服器位址 | `https://wl.danndann.cn` |
| `VITE_UMAMI_WEBSITE_ID` | (選填) Umami 網站追蹤 ID | 無 |
| `VITE_UMAMI_SCRIPT_URL` | (選填) Umami 追蹤腳本網址 | 無 |

### 後端環境變數 (`backend/.env`)
| 變數名稱 | 說明 | 預設值 |
|---|---|---|
| `PORT` | 伺服器運行的連接埠 | `5010` |
| `NODE_ENV` | 運行環境 (`development` / `production`) | `development` |
| `ALLOWED_ORIGINS` | 允許的 CORS 來源（以逗號分隔） | `localhost` 相關 |
| `ADMIN_PASSWORD` | 管理後台登入密碼 (⚠️**生產環境強烈建議修改**) | `zutomayo` |
| `EXPECTED_ORIGIN` | WebAuthn (通行密鑰) 驗證的來源域名 (需與前端一致) | `http://localhost:5173` |
| `RP_ID` | WebAuthn 依賴方 ID (通常為網站主網域，不含 http) | 解析自 `EXPECTED_ORIGIN` |

---

## 部署指南 (V3.2)

### ⚠️ 部署注意事項與優化建議
1. **密碼安全性**：務必在後端環境變數中修改 `ADMIN_PASSWORD`，否則後台會有被未授權存取的風險。
2. **通行密鑰 (Passkeys)**：專案引入了 `@simplewebauthn`。如果要使用生物辨識或通行密鑰登入，必須正確設定 `EXPECTED_ORIGIN`（例如 `https://gallery.ztmy.com`）與 `RP_ID`（例如 `gallery.ztmy.com`），並且**必須在 HTTPS 環境下**運行。
3. **資料持久化 (Data Persistence)**：後端會在 `backend/data/` 產生 `.json` 檔案及 SQLite 資料庫檔案。如果是使用 Docker 或無狀態容器（如 Render / Railway）部署，**請務必掛載 Volume (磁碟空間)** 至 `backend/data/` 目錄，避免每次重啟後資料丟失。
4. **CORS 設定**：前端若部署於 Vercel / Netlify 等平台，後端部署於另一台主機，請記得在後端設定 `ALLOWED_ORIGINS=https://你的前端網址.com`。

### 部署方式參考

**選項 A：自動化部署腳本 (推薦伺服器使用)**
本專案提供了一個互動式的部署腳本 `deploy.sh`，支援自動拉取程式碼、安裝依賴、編譯並透過 PM2 啟動後端，同時內建前端靜態檔案與後端資料庫的自動備份機制。

1. 在伺服器上執行腳本：
   ```bash
   ./deploy.sh
   ```
2. 首次執行會產生 `deploy.conf` 設定檔，請修改裡面的路徑：
   - `FRONTEND_DEPLOY_PATH`：Nginx 等 Web 伺服器的靜態網站目錄。
   - `FRONTEND_BACKUP_PATH`：部署前的檔案與資料庫備份目錄。
3. 再次執行腳本，選擇要部署的項目（前端、後端、或兩者皆是），腳本將自動完成剩餘工作。

**選項 B：手動分離部署**
- **前端**：執行 `npm run build:frontend`，將 `frontend/dist` 的靜態檔案部署至 Vercel、Netlify 或 GitHub Pages。
- **後端**：將 `backend` 資料夾上傳至 Node.js 伺服器 (如 VPS、Render 等)，執行 `npm install`、`npm run build`，並用 `npm start` 啟動。記得設定上述環境變數及持久化 `data` 目錄。

**選項 C：整合部署 (使用 Nginx)**
1. 前端編譯出 `dist`，由 Nginx 提供靜態文件服務。
2. Nginx 配置 `/api` 路徑反向代理 (Reverse Proxy) 至本地後端 `http://localhost:5010`。
3. 後端可使用 `pm2` 或 `systemd` 常駐運行。

---

## License

本專案僅供粉絲交流學習之用，無任何商業用途。

ZUTOMAYO 所有內容版權歸原作者所有。
