# ZUTOMAYO MV Gallery

一個 ZUTOMAYO MV 資料庫。

![Version](https://img.shields.io/badge/version-3.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

---

## 目錄

- [簡介](#簡介)
- [技術棧](#技術棧)
- [專案結構](#專案結構)
- [快速開始](#快速開始)

---

## 簡介

本專案是一個展示 ZUTOMAYO MV 設定圖的線上畫廊，同時提供管理後台用於資料維護。前端使用 React + TypeScript 構建，後端採用 Express + Node.js。

---

## 技術棧

### 前端

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| TypeScript | 5.3 | 類型安全 |
| Vite | 5.4 | 建構工具 |
| Tailwind CSS | 4.0 | 樣式框架 |
| shadcn/ui | - | UI 組件庫 |
| LightGallery | 2.9 | 燈箱組件 |
| PhotoSwipe | 5.4 | 圖片瀏覽 |
| Monaco Editor | 4.7 | 代碼編輯器 |
| Waline | 3.5 | 留言系統 |
| React Router | 6.22 | 路由管理 |

### 後端

| 技術 | 版本 | 用途 |
|------|------|------|
| Express | 4.19 | Web 框架 |
| TypeScript | 5.3 | 類型安全 |
| Zod | 3.22 | 輸入驗證 |
| probe-image-size | 7.2 | 圖片尺寸偵測 |
| Helmet | 7.1 | 安全 headers |
| express-rate-limit | 7.1 | 請求限流 |
| CORS | 2.8 | 跨域支援 |

---

## 專案結構

```
zutomayo-gallery/
├── frontend/                    # 前端應用
│   ├── src/
│   │   ├── components/          # React 組件
│   │   │   ├── ui/             # shadcn/ui 組件
│   │   │   ├── MVCard.tsx      # MV 卡片
│   │   │   ├── MVDetailsModal  # MV 詳情彈窗
│   │   │   └── LightGalleryViewer  # 燈箱組件
│   │   ├── pages/
│   │   │   └── AdminPage.tsx   # 管理後台
│   │   ├── lib/
│   │   │   └── types.ts        # 類型定義
│   │   ├── config/             # 配置檔案
│   │   ├── hooks/              # 自定義 Hooks
│   │   └── assets/             # 靜態資源
│   └── package.json
│
├── backend/                     # 後端 API
│   ├── src/
│   │   ├── controllers/        # 路由控制器
│   │   ├── services/           # 業務邏輯
│   │   ├── validators/         # Zod 驗證器
│   │   ├── middleware/         # Express 中間件
│   │   ├── assets/js/          # MV 數據文件
│   │   └── index.ts            # 入口文件
│   └── package.json
│
├── server/                      # SSR 服務（可選）
├── package.json                 # 根目錄 workspace 配置
└── README.md
```

---

## 快速開始

### 🚀 一键启动（最简单的方式）

**Windows 用户**：
- 双击 `start.bat` 文件（最简单）
- 或双击 `launch.bat` 文件（有更多检查）

**Linux/Mac 用户**：
- 在终端运行 `./start.sh`
- 或运行 `npm run dev`

**命令行用户**：
- 运行 `npm run dev` 启动前后端
- 运行 `npm run start:frontend` 只启动前端
- 运行 `npm run start:backend` 只启动后端

### 前置需求

- Node.js >= 18
- npm 或 pnpm

### 安裝

```bash
# 方法一：一鍵安裝所有依賴（推薦）
npm run install:all

# 方法二：分別安裝
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




## License

本專案僅供粉絲交流學習之用，無任何商業用途。

ZUTOMAYO 所有內容版權歸原作者所有。
