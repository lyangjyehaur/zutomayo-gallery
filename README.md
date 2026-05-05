# ZUTOMAYO Gallery

一個 ZUTOMAYO MV 資料庫。

[繁體中文](README.md) | [简体中文](README.zh-Hans.md) | [English](README.en.md) | [日本語](README.ja.md)

![Version](https://img.shields.io/badge/version-3.6.2-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

修訂日期：2026-05-05

---

## 目錄

- [簡介](#簡介)
- [特色功能](#特色功能)
- [技術棧](#技術棧)
- [專案結構](#專案結構)
- [快速開始](#快速開始)
- [環境變數配置](#環境變數配置)
- [部署指南](#部署指南)

---

## 簡介

本專案是一個展示 ZUTOMAYO MV 設定圖的線上畫廊，同時提供管理後台用於資料維護。前端使用 React + TypeScript 構建；後端採用 Express + TypeScript，主資料庫使用 PostgreSQL（Sequelize + Umzug migrations）。燈箱正式功能目前使用 Fancybox；LightGallery 僅保留在 debug/除錯頁面。

---

## 特色功能

- 🖼️ **沉浸式畫廊體驗**：正式功能使用 Fancybox 提供無縫的圖片瀏覽體驗（LightGallery 目前僅保留於 debug/除錯用途）。
- 🧱 **瀑布流佈局**：採用高效能的 Masonry 瀑布流設計，自動適應不同尺寸的 MV 設定圖。
- 🔐 **現代化安全登入**：支援 WebAuthn (通行密鑰 / Passkeys) 與生物辨識登入管理後台，無須記憶密碼。
- 🧑‍💻 **管理與權限**：管理後台支援資料維護，並提供角色/權限（RBAC）與多種管理 API。
- 📊 **資料可視化與編輯**：內建 Monaco Editor 支援直接編輯/檢視資料，並提供完善的管理介面。
- 💬 **互動留言系統**：整合 Waline 留言板，支援自定義 Emoji、Reaction 表態與 Pageview 瀏覽量統計。
- ⚡ **極致效能優化**：嚴格的 React.memo 渲染控制、組件懶加載與 Vite Chunk 拆分，確保頁面載入如絲般順滑。

---

## 技術棧

### 前端

| 技術 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | 18.3 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 類型安全 |
| [Vite](https://vitejs.dev/) | 5.4.2 | 建構工具 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | 樣式框架 |
| [shadcn/ui](https://ui.shadcn.com/) | 4.2 | UI 組件庫 |
| [Neobrutalism](https://www.neobrutalism.dev/) | - | 設計風格與主題 |
| [Fancybox](https://fancyapps.com/fancybox/) | 6.1 | 燈箱組件 |
| [LightGallery](https://www.lightgalleryjs.com/) | 2.9 | 燈箱組件（debug/除錯用途） |
| [Masonry](https://masonry.desandro.com/) | 4.2 | 瀑布流佈局 |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7 | 代碼編輯器 |
| [Waline](https://waline.js.org/) | 3.5.0 | 留言系統 |
| [Umami](https://umami.is/) | - | 網站數據分析 |
| [React Router](https://reactrouter.com/) | 6.22 | 路由管理 |
| [SWR](https://swr.vercel.app/) | 2.4 | 資料獲取 |

### 後端

| 技術 | 版本 | 用途 |
|------|------|------|
| [Express](https://expressjs.com/) | 4.19 | Web 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 類型安全 |
| [PostgreSQL](https://www.postgresql.org/) | - | 主資料庫 |
| [Sequelize](https://sequelize.org/) | 6.37.8 | ORM |
| [Umzug](https://github.com/sequelize/umzug) | 3.8.0 | 資料庫 migrations |
| [Zod](https://zod.dev/) | 3.22 | 輸入驗證 |
| [probe-image-size](https://github.com/nodeca/probe-image-size) | 7.2 | 圖片尺寸偵測 |
| [Helmet](https://helmetjs.github.io/) | 7.1.0 | 安全 headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.1.5 | 請求限流 |
| [CORS](https://github.com/expressjs/cors) | 2.8.5 | 跨域支援 |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0.0 | 密碼雜湊 |
| [Redis](https://redis.io/) | - | Session / 限流 / 佇列等（選配） |
| [BullMQ](https://docs.bullmq.io/) | 5.76.2 | 任務佇列（選配） |
| [Meilisearch](https://www.meilisearch.com/) | 0.57.0 | 搜尋（選配） |
| [@simplewebauthn/server](https://simplewebauthn.dev/) | 13.3 | WebAuthn (Passkeys) |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.9 | SQLite（遺留資料/遷移腳本用途） |

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
│   ├── data/                    # 本地資料/快取/遺留資料（ip2region、SQLite 舊資料等）
│   ├── src/
│   │   ├── controllers/         # 路由控制器
│   │   ├── routes/              # API 路由
│   │   ├── services/            # 業務邏輯
│   │   ├── validators/          # Zod 驗證器
│   │   ├── middleware/          # Express 中間件
│   │   └── index.ts             # 入口文件
│   └── package.json
│
├── image-hosting/               # (可選) 獨立 Next.js 圖床/上傳服務
│   └── package.json
│
├── package.json                 # 根目錄 workspace 配置
├── deploy.sh                    # 伺服器自動化部署腳本
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

- Node.js 20 LTS（專案提供 `.nvmrc`；目前支援 `>=20 <26`）
- npm 10+
- Git
- PostgreSQL（主資料庫）
- Redis / Meilisearch（選配，用於 session / 搜尋 / 佇列等；未配置時部分功能會自動降級或停用）

### 安裝

```bash
# 1. 取得程式碼
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery

# 2. 方法一：一鍵安裝主站依賴（推薦：root + frontend + backend）
npm run install:all

# CI / 乾淨環境可使用 lockfile 安裝
npm run ci:all

# 3. 方法二：分別安裝
# 安裝根依賴
npm install

# 安裝前端依賴
npm --prefix frontend install --legacy-peer-deps

# 安裝後端依賴
npm --prefix backend install

# 可選：安裝獨立圖床服務依賴
npm run install:optional
```

### 開發模式

```bash
# 方法一：一鍵啟動（推薦）
npm run dev
# 這個命令會同時啟動前端（localhost:5173）和後端（localhost:5010）

# 方法二：分別啟動
# 啟動前端
npm run start:frontend

# 啟動後端
npm run start:backend

# 建置 + 測試
npm run verify
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

前端環境檔已經切成兩份：
- `frontend/.env`：本機開發用
- `frontend/.env.production`：正式打包用

Vite 在 `vite build` 時會以 production mode 載入 `frontend/.env.production`，再疊加 `frontend/.env` 與執行階段環境變數。正式部署時請確認打包流程沒有額外覆蓋這些值。

### 前端環境變數 (`frontend/.env`)
| 變數名稱 | 說明 | 預設值 |
|---|---|---|
| `VITE_API_ROOT` | 後端 API 伺服器根路徑，開發時通常維持 `/api` | `/api` |
| `VITE_API_ORIGIN` | API 伺服器原始網域，用於實際 API 請求與 HTML `preconnect` | `http://localhost:5010` |
| `VITE_IMGPROXY_ORIGIN` | Imgproxy 服務原始網域；此欄位以本機開發為主 | `http://localhost:8018` |
| `VITE_ASSETS_ORIGIN` | 靜態媒體資源原始網域；此欄位以本機開發為主 | `http://localhost:5173` |
| `VITE_UNPKG_ORIGIN` | 第三方套件 CDN 原始網域 | `https://unpkg.com` |
| `VITE_TWITTER_IMAGE_SOURCE_HOST` | Twitter 圖片來源主機 | `https://pbs.twimg.com` |
| `VITE_TWITTER_VIDEO_SOURCE_HOST` | Twitter 影片來源主機 | `https://video.twimg.com` |
| `VITE_TWITTER_PROXY_PATH` | Twitter 圖片反代路徑 | `/ti` |
| `VITE_TWITTER_VIDEO_PROXY_PATH` | Twitter 影片反代路徑 | `/tv` |
| `VITE_YOUTUBE_SOURCE_HOSTS` | YouTube 圖片來源主機列表（逗號分隔） | `i.ytimg.com,img.youtube.com,youtube.com` |
| `VITE_YOUTUBE_PROXY_PATH` | YouTube 圖片反代路徑 | `/yi` |
| `VITE_R2_DOMAIN` | (選填) Cloudflare R2 自訂網域 | `https://r2.dan.tw` |
| `VITE_WALINE_SERVER_URL` | Waline 伺服器位址；開發時可直接沿用正式站 | `https://comments.ztmr.club` |
| `VITE_WALINE_EMOJI_ORIGIN` | Waline 表情 CDN 原始網域 | `https://unpkg.com` |
| `VITE_WALINE_EMOJI_FASTLY_ORIGIN` | Waline 表情 CDN 備援網域 | `https://fastly.jsdelivr.net/npm` |
| `VITE_WALINE_AVATAR_ORIGIN` | Waline 頭像來源 | `https://gravatar.com/avatar` |
| `VITE_WALINE_AVATAR_MIRROR_ORIGIN` | Waline 頭像鏡像來源 | `https://cravatar.cn/avatar` |
| `VITE_YOUTUBE_EMBED_ORIGIN` | YouTube 影片嵌入來源 | `https://www.youtube.com/embed` |
| `VITE_BILIBILI_EMBED_ORIGIN` | Bilibili 影片嵌入來源 | `https://player.bilibili.com/player.html` |
| `VITE_UMAMI_SECONDARY_WEBSITE_ID` | (選填) commons Umami 網站追蹤 ID；本機開發可留空 | 無 |
| `VITE_UMAMI_SECONDARY_HOST_URL` | (選填) commons Umami 追蹤主機網址；本機開發可留空 | 無 |
| `VITE_UMAMI_SECONDARY_BASE_SCRIPT` | (選填) commons Umami 腳本基底路徑 | `/commons` |

### 後端環境變數 (`backend/.env`)
| 變數名稱 | 說明 | 預設值 |
|---|---|---|
| `PORT` | 伺服器運行的連接埠 | `5010` |
| `NODE_ENV` | 運行環境 (`development` / `production`) | `development` |
| `ALLOWED_ORIGINS` | 允許的 CORS 來源（以逗號分隔） | `localhost` 相關 |
| `SESSION_SECRET` | Express session 簽名金鑰；`production` 必填，否則後端不會啟動 | 無 |
| `ADMIN_PASSWORD` | 管理後台登入密碼 (⚠️**生產環境強烈建議修改**) | `zutomayo` |
| `EXPECTED_ORIGIN` | WebAuthn (通行密鑰) 驗證的來源域名 (需與前端一致) | `http://localhost:5173` |
| `RP_ID` | WebAuthn 依賴方 ID (通常為網站主網域，不含 http) | 解析自 `EXPECTED_ORIGIN` |
| `IMGPROXY_URL` | Imgproxy 伺服器位址 | `https://img.ztmr.club` |
| `IMGPROXY_KEY` | Imgproxy 簽名用的 Hex 金鑰 | 無 |
| `IMGPROXY_SALT` | Imgproxy 簽名用的 Hex 鹽值 | 無 |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL 連線設定（主資料庫） | 參考 `backend/.env.example` |
| `R2_*` / `MEILI_*` / `REDIS_*` / `TWITTER_*` | (選填) 進階功能配置（圖床/搜尋/快取/爬蟲/通知） | 參考 `backend/.env.example` |

---

## 部署指南

### ⚠️ 部署注意事項與優化建議
1. **密碼安全性**：務必在後端環境變數中修改 `ADMIN_PASSWORD`，否則後台會有被未授權存取的風險。
2. **Session 金鑰**：如果後端以 `production` 啟動，請務必設定 `SESSION_SECRET`，否則服務會在啟動時直接退出。
3. **通行密鑰 (Passkeys)**：專案引入了 `@simplewebauthn`。如果要使用生物辨識或通行密鑰登入，必須正確設定 `EXPECTED_ORIGIN`（例如 `https://gallery.ztmy.com`）與 `RP_ID`（例如 `gallery.ztmy.com`），並且**必須在 HTTPS 環境下**運行。
4. **資料持久化 (Data Persistence)**：主資料庫為 PostgreSQL，請確保資料庫本身具備持久化（例如使用受管 DB 或自行配置磁碟/Volume）。`backend/data/` 主要用於快取與遺留資料（如 ip2region、SQLite 舊資料、備份檔等），不作為主資料庫。
5. **CORS 設定**：前端若部署於 Vercel / Netlify 等平台，後端部署於另一台主機，請記得在後端設定 `ALLOWED_ORIGINS=https://你的前端網址.com`。
6. **原生套件編譯**：後端依賴 `better-sqlite3` 與 `bcrypt`（native addon）。Linux 伺服器需具備基本編譯工具鏈（常見為 `python3` / `make` / `g++`）。本專案的 `deploy.sh` 會自動 `rebuild` 相關套件。

### 部署方式參考

**選項 A：自動化部署腳本 (推薦伺服器使用)**
本專案提供了一個互動式的部署腳本 `deploy.sh`，支援安裝依賴、編譯前端、透過 PM2 啟動/重啟後端服務，並內建前端靜態檔案與後端資料庫的自動備份機制。

1. 在伺服器上執行腳本：
   ```bash
   ./deploy.sh
   ```
2. 首次執行會產生 `deploy.conf` 設定檔，請修改裡面的路徑：
   - `FRONTEND_DEPLOY_PATH`：Nginx 等 Web 伺服器的靜態網站目錄。
   - `FRONTEND_BACKUP_PATH`：部署前的檔案與資料庫備份目錄。
3. 再次執行腳本，選擇要部署的項目（前端、後端、或兩者皆是），腳本將自動完成剩餘工作。
4. 若為首次部署或有資料表結構變更，請在伺服器上補跑 migrations：
   ```bash
   cd backend && npm run migrate
   ```

**選項 B：線上增量更新腳本 (推薦日常更新)**
本專案提供 `update.sh`，會自動 `git pull`、安裝依賴、build、執行 migrations 並重啟 PM2：
```bash
./update.sh
```

**選項 C：手動分離部署**
- **前端**：執行 `npm run build:frontend`，將 `frontend/dist` 的靜態檔案部署至 Vercel、Netlify 或 GitHub Pages。
- **後端**：將 `backend` 上傳至 Node.js 伺服器 (如 VPS、Render 等)，確保 PostgreSQL 可連線並設定 `DB_*` 環境變數；再執行：
  ```bash
  cd backend
  npm install
  npm run build
  npm run migrate
  npm start
  ```

**選項 D：整合部署 (使用 Nginx)**
1. 前端編譯出 `dist`，由 Nginx 提供靜態文件服務。
2. Nginx 配置 `/api` 路徑反向代理 (Reverse Proxy) 至本地後端 `http://localhost:5010`。
3. 後端可使用 `pm2` 或 `systemd` 常駐運行。

---

## License

本專案僅供粉絲交流學習之用，無任何商業用途。

ZUTOMAYO 所有內容版權歸原作者所有。
