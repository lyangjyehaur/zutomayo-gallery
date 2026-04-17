# ZUTOMAYO MV Gallery

一个 ZUTOMAYO MV 数据库。

[繁體中文 (Traditional Chinese)](README.md) | 简体中文 (Simplified Chinese)

![Version](https://img.shields.io/badge/version-3.2-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

---

## 目录

- [简介](#简介)
- [特色功能](#特色功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [部署指南 (V3.2)](#部署指南-v32)

---

## 简介

本项目是一个展示 ZUTOMAYO MV 设定图的在线画廊，同时提供管理后台用于数据维护。前端使用 React + TypeScript 构建，后端采用 Express + Node.js。支持多种灯箱展示模式（Fancybox、LightGallery）及瀑布流布局。

---

## 特色功能

- 🖼️ **沉浸式画廊体验**：支持 Fancybox 与 LightGallery 双灯箱模式切换，提供无缝的图片浏览体验。
- 🧱 **瀑布流布局**：采用高性能的 Masonry 瀑布流设计，自动适应不同尺寸的 MV 设定图。
- 🔐 **现代化安全登录**：支持 WebAuthn (通行密钥 / Passkeys) 与生物识别登录管理后台，无须记忆密码。
- 📊 **数据可视化与编辑**：内置 Monaco Editor 支持直接编辑 JSON 数据，并提供完善的数据库管理界面。
- 💬 **互动留言系统**：整合 Waline 留言板，支持自定义 Emoji 与实时互动。
- ⚡ **极致性能优化**：严格的 React.memo 渲染控制、组件懒加载与 Vite Chunk 拆分，确保页面加载如丝般顺滑。

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | 18.3 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 类型安全 |
| [Vite](https://vitejs.dev/) | 5.4 | 构建工具 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | 样式框架 |
| [shadcn/ui](https://ui.shadcn.com/) | 4.2 | UI 组件库 |
| [Neobrutalism](https://www.neobrutalism.dev/) | - | 设计风格与主题 |
| [Fancybox](https://fancyapps.com/fancybox/) | 6.1 | 灯箱组件 |
| [LightGallery](https://www.lightgalleryjs.com/) | 2.9 | 灯箱组件 (备用) |
| [Masonry](https://masonry.desandro.com/) | 4.2 | 瀑布流布局 |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7 | 代码编辑器 |
| [Waline](https://waline.js.org/) | 3.5 | 留言系统 |
| [Umami](https://umami.is/) | - | 网站数据分析 |
| [React Router](https://reactrouter.com/) | 6.22 | 路由管理 |
| [SWR](https://swr.vercel.app/) | 2.4 | 数据获取 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| [Express](https://expressjs.com/) | 4.19 | Web 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 类型安全 |
| [Zod](https://zod.dev/) | 3.22 | 输入验证 |
| [probe-image-size](https://github.com/nodeca/probe-image-size) | 7.2 | 图片尺寸检测 |
| [Helmet](https://helmetjs.github.io/) | 7.1 | 安全 headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.1 | 请求限流 |
| [CORS](https://github.com/expressjs/cors) | 2.8 | 跨域支持 |

---

## 项目结构

```text
zutomayo-gallery/
├── frontend/                    # 前端应用 (React)
│   ├── public/                  # 静态资源 & 旧版 Vanilla JS 实现
│   ├── src/
│   │   ├── components/          # React 组件
│   │   │   ├── ui/              # shadcn/ui 组件
│   │   │   ├── FancyboxViewer.tsx # Fancybox 灯箱组件
│   │   │   ├── LightGalleryViewer.tsx # LightGallery 灯箱组件
│   │   │   ├── MVCard.tsx       # MV 卡片
│   │   │   ├── MVDetailsModal.tsx # MV 详情弹窗
│   │   │   └── WalineComments.tsx # 留言板组件
│   │   ├── pages/               # 页面组件 (AdminPage, DebugGallery 等)
│   │   ├── lib/                 # 工具函数与类型定义
│   │   ├── config/              # 配置文件
│   │   ├── hooks/               # 自定义 Hooks
│   │   └── debug/               # 开发用调试组件
│   └── package.json
│
├── backend/                     # 后端 API (Node.js)
│   ├── data/
│   │   └── data.json            # MV 数据文件
│   ├── src/
│   │   ├── controllers/         # 路由控制器
│   │   ├── routes/              # API 路由
│   │   ├── services/            # 业务逻辑
│   │   ├── validators/          # Zod 验证器
│   │   ├── middleware/          # Express 中间件
│   │   └── index.ts             # 入口文件
│   └── package.json
│
├── package.json                 # 根目录 workspace 配置
├── deploy.sh                    # 服务器自动化部署脚本 (V3.2 新增)
└── README.md
```

---

## 快速开始

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
- Git

### 安装

```bash
# 1. 获取代码
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery

# 2. 方法一：一键安装所有依赖（推荐）
npm run install:all

# 3. 方法二：分别安装
# 安装根依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
```

### 开发模式

```bash
# 方法一：一键启动（推荐）
npm run dev
# 这个命令会同时启动前端（localhost:5173）和后端（localhost:5000）

# 方法二：分别启动
# 启动前端
npm run start:frontend

# 启动后端
npm run start:backend
```

### 生产构建

```bash
# 前端构建
cd frontend && npm run build

# 后端构建
cd backend && npm run build
```

---

## 环境变量配置

在部署或生产环境中，请根据实际情况设置环境变量（可在 `frontend/.env` 和 `backend/.env` 设置）：

### 前端环境变量 (`frontend/.env`)
| 变量名称 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_URL` | 后端 API 服务器地址，生产环境若为分离部署请务必设置 | `/api/mvs` |
| `VITE_WALINE_SERVER_URL` | Waline 留言板服务器地址 | `https://wl.danndann.cn` |
| `VITE_UMAMI_WEBSITE_ID` | (选填) Umami 网站追踪 ID | 无 |
| `VITE_UMAMI_SCRIPT_URL` | (选填) Umami 追踪脚本网址 | 无 |

### 后端环境变量 (`backend/.env`)
| 变量名称 | 说明 | 默认值 |
|---|---|---|
| `PORT` | 服务器运行的端口 | `5010` |
| `NODE_ENV` | 运行环境 (`development` / `production`) | `development` |
| `ALLOWED_ORIGINS` | 允许的 CORS 来源（以逗号分隔） | `localhost` 相关 |
| `ADMIN_PASSWORD` | 管理后台登录密码 (⚠️**生产环境强烈建议修改**) | `zutomayo` |
| `EXPECTED_ORIGIN` | WebAuthn (通行密钥) 验证的来源域名 (需与前端一致) | `http://localhost:5173` |
| `RP_ID` | WebAuthn 依赖方 ID (通常为网站主域名，不含 http) | 解析自 `EXPECTED_ORIGIN` |

---

## 部署指南 (V3.2)

### ⚠️ 部署注意事项与优化建议
1. **密码安全性**：务必在后端环境变量中修改 `ADMIN_PASSWORD`，否则后台会有被未授权访问的风险。
2. **通行密钥 (Passkeys)**：项目引入了 `@simplewebauthn`。如果要使用生物识别或通行密钥登录，必须正确设置 `EXPECTED_ORIGIN`（例如 `https://gallery.ztmy.com`）与 `RP_ID`（例如 `gallery.ztmy.com`），并且**必须在 HTTPS 环境下**运行。
3. **数据持久化 (Data Persistence)**：后端会在 `backend/data/` 产生 `.json` 文件及 SQLite 数据库文件。如果是使用 Docker 或无状态容器（如 Render / Railway）部署，**请务必挂载 Volume (磁盘空间)** 至 `backend/data/` 目录，避免每次重启后数据丢失。
4. **CORS 设置**：前端若部署于 Vercel / Netlify 等平台，后端部署于另一台主机，请记得在后端设置 `ALLOWED_ORIGINS=https://你的前端网址.com`。

### 部署方式参考

**选项 A：自动化部署脚本 (推荐服务器使用)**
本项目提供了一个交互式的部署脚本 `deploy.sh`，支持自动拉取代码、安装依赖、编译并透过 PM2 启动后端，同时内置前端静态文件与后端数据库的自动备份机制。

1. 在服务器上执行脚本：
   ```bash
   ./deploy.sh
   ```
2. 首次执行会产生 `deploy.conf` 配置文件，请修改里面的路径：
   - `FRONTEND_DEPLOY_PATH`：Nginx 等 Web 服务器的静态网站目录。
   - `FRONTEND_BACKUP_PATH`：部署前的文件与数据库备份目录。
3. 再次执行脚本，选择要部署的项目（前端、后端、或两者皆是），脚本将自动完成剩余工作。

**选项 B：手动分离部署**
- **前端**：执行 `npm run build:frontend`，将 `frontend/dist` 的静态文件部署至 Vercel、Netlify 或 GitHub Pages。
- **后端**：将 `backend` 文件夹上传至 Node.js 服务器 (如 VPS、Render 等)，执行 `npm install`、`npm run build`，并用 `npm start` 启动。记得设置上述环境变量及持久化 `data` 目录。

**选项 C：整合部署 (使用 Nginx)**
1. 前端编译出 `dist`，由 Nginx 提供静态文件服务。
2. Nginx 配置 `/api` 路径反向代理 (Reverse Proxy) 至本地后端 `http://localhost:5010`。
3. 后端可使用 `pm2` 或 `systemd` 常驻运行。

---

## License

本项目仅供粉丝交流学习之用，无任何商业用途。

ZUTOMAYO 所有内容版权归原作者所有。