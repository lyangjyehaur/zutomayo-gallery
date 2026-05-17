# ZUTOMAYO Gallery

一个用于展示 ZUTOMAYO MV 设定图的在线画廊，同时提供后台管理界面用于数据维护。

[繁體中文](README.md) | [简体中文](README.zh-Hans.md) | [English](README.en.md) | [日本語](README.ja.md)

![Version](https://img.shields.io/badge/version-3.6.17-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

修订日期：2026-05-08

---

## 目录

- [简介](#简介)
- [特色功能](#特色功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [部署指南](#部署指南)

---

## 简介

本项目是一个用于浏览 ZUTOMAYO MV 设定图的在线画廊，同时提供后台管理系统与移动审核前端用于数据维护。主前端使用 React + TypeScript 构建；后端采用 Express + TypeScript，主数据库为 PostgreSQL（Sequelize + Umzug migrations）；另有一个 `review-app/` 子应用使用 Framework7 React，负责手机上的暂存 / 投稿 / FanArt / Group repair 工作流。正式环境的灯箱目前使用 Fancybox；LightGallery 仅保留在调试页面中。

---

## 特色功能

- 沉浸式画廊体验：正式功能使用 Fancybox，LightGallery 仅保留用于调试/测试页面
- 瀑布流布局：响应式、适合不同图片尺寸的展示方式
- 现代化安全登录：支持 WebAuthn / Passkeys 的后台登录
- 管理与权限：提供 RBAC 与多种后台 API
- 移动审核工作流：`review-app/` 已承接首页摘要、暂存、投稿、FanArt、Repair 与设置等手机 / 平板审核流程
- 数据查看与编辑：内置 Monaco Editor 管理工具
- 互动留言系统：整合 Waline，支持自定义 Emoji、Reaction 与 Pageview 统计
- 性能优化：React memo、懒加载与 Vite Chunk 拆分

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|---|---:|---|
| [React](https://react.dev/) | 18.3 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 类型安全 |
| [Vite](https://vitejs.dev/) | 5.4.2 | 构建工具 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | 样式 |
| [shadcn/ui](https://ui.shadcn.com/) | 4.2 | UI 组件库 |
| [Neobrutalism](https://www.neobrutalism.dev/) | - | 设计风格与主题 |
| [Fancybox](https://fancyapps.com/fancybox/) | 6.1 | 灯箱 |
| [LightGallery](https://www.lightgalleryjs.com/) | 2.9 | 灯箱（仅调试/测试用） |
| [Masonry](https://masonry.desandro.com/) | 4.2 | 瀑布流布局 |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7 | 代码编辑器 |
| [Waline](https://waline.js.org/) | 3.5.0 | 评论系统 |
| [Umami](https://umami.is/) | - | 网站分析 |
| [React Router](https://reactrouter.com/) | 6.22 | 路由 |
| [SWR](https://swr.vercel.app/) | 2.4 | 数据获取 |
| [Framework7 React](https://framework7.io/react/) | 9.0 | `review-app` 移动审核 UI |

### 后端

| 技术 | 版本 | 用途 |
|---|---:|---|
| [Express](https://expressjs.com/) | 4.19 | Web 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | 类型安全 |
| [PostgreSQL](https://www.postgresql.org/) | - | 主数据库 |
| [Sequelize](https://sequelize.org/) | 6.37.8 | ORM |
| [Umzug](https://github.com/sequelize/umzug) | 3.8.0 | 数据库 migrations |
| [Zod](https://zod.dev/) | 3.22 | 输入校验 |
| [probe-image-size](https://github.com/nodeca/probe-image-size) | 7.2 | 图片尺寸检测 |
| [Helmet](https://helmetjs.github.io/) | 7.1.0 | 安全 headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.1.5 | 限流 |
| [CORS](https://github.com/expressjs/cors) | 2.8.5 | 跨域支持 |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0.0 | 密码哈希 |
| [Redis](https://redis.io/) | - | Session / 限流 / 队列等（选配） |
| [BullMQ](https://docs.bullmq.io/) | 5.76.2 | 任务队列（选配） |
| [Meilisearch](https://www.meilisearch.com/) | 0.57.0 | 搜索（选配） |
| [@simplewebauthn/server](https://simplewebauthn.dev/) | 13.3 | WebAuthn (Passkeys) |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.9 | SQLite（遗留数据 / 迁移脚本用途） |

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
│   │   │   ├── MVCard.tsx       # MV 卡片
│   │   │   ├── MVDetailsModal.tsx # MV 详情弹窗
│   │   │   └── WalineComments.tsx # 评论组件
│   │   ├── pages/               # 页面组件 (AdminPage, DebugGallery 等)
│   │   ├── lib/                 # 工具函数与类型定义
│   │   ├── config/              # 配置文件
│   │   ├── hooks/               # 自定义 Hooks
│   │   └── debug/               # 开发调试组件
│   └── package.json
│
├── backend/                     # 后端 API (Node.js)
│   ├── data/                    # 本地数据/缓存/遗留数据（ip2region、SQLite 旧文件等）
│   ├── src/
│   │   ├── controllers/         # 路由控制器
│   │   ├── routes/              # API 路由
│   │   ├── services/            # 业务逻辑
│   │   ├── validators/          # Zod 验证器
│   │   ├── middleware/          # Express 中间件
│   │   └── index.ts             # 入口文件
│   └── package.json
│
├── image-hosting/               # (可选) 独立 Next.js 图床/上传服务
│   └── package.json
│
├── review-app/                  # 移动审核前端 (Framework7 React)
│   ├── src/pages/               # 总览 / 暂存 / 投稿 / FanArt / Repair / 设置
│   ├── src/components/          # AppNavbar、MvSheet、ReviewStateBlock 等
│   └── README.md
│
├── package.json                 # 根目录 workspace 配置
├── deploy.sh                    # 服务器自动化部署脚本
└── README.md
```

---

## 快速开始

### 一键启动

**Windows 用户**
- 双击 `start.bat`
- 或双击 `launch.bat`（会做更多检查）

**Linux / Mac 用户**
- 在终端中运行 `./start.sh`
- 或运行 `npm run dev`

**命令行用户**
- `npm run dev` 同时启动主前端与后端
- `npm run dev:review` 同时启动 `review-app` 与后端
- `npm run dev:all` 同时启动主前端、`review-app` 与后端
- `npm run start:frontend` 只启动主前端
- `npm run start:review-app` 只启动 `review-app`
- `npm run start:backend` 只启动后端

### 前置需求

- Node.js 20 LTS（项目提供 `.nvmrc`；当前支持 `>=20 <26`）
- npm 10+
- Git
- PostgreSQL（主数据库）
- Redis / Meilisearch（可选；未配置时部分功能会自动降级或停用）

### 安装

```bash
# 1. 获取代码
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery

# 2. 方式一：一键安装主站依赖（推荐：root + frontend + backend + review-app）
npm run install:all

# CI / 纯净环境可使用 lockfile 安装
npm run ci:all

# 3. 方式二：分别安装
# 根依赖
npm install

# 前端依赖
npm --prefix frontend install --legacy-peer-deps

# 后端依赖
npm --prefix backend install

# review-app 依赖
npm --prefix review-app install

# 可选：安装独立图床服务依赖
npm run install:optional
```

### 开发模式

```bash
# 推荐方式
npm run dev
# 主前端：http://localhost:5173
# 后端：  http://localhost:5010

# review-app + 后端
npm run dev:review
# review-app：http://localhost:5183
# 后端：    http://localhost:5010

# 同时启动主前端 + review-app + 后端
npm run dev:all

# 分别启动
npm run start:frontend
npm run start:review-app
npm run start:backend

# 构建 + 测试
npm run verify
```

### 生产构建

```bash
# 前端构建
cd frontend && npm run build

# review-app 构建
cd ../review-app && npm run build

# 后端构建
cd ../backend && npm run build

# 或使用 workspace 命令
cd ..
npm run build:review-app
npm run build:all
```

---

## 环境变量配置

请先复制模板文件：

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp review-app/.env.example review-app/.env
```

### 前端 (`frontend/.env`)

| 名称 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_URL` | 后端 API 地址；前后端分离部署时请明确配置 | `/api/mvs` |
| `VITE_TWITTER_IMG_PROXY` | 可选图片代理 / 加速服务 | `https://img.ztmr.club` |
| `VITE_R2_DOMAIN` | 可选 Cloudflare R2 自定义域名 | `https://r2.dan.tw` |
| `VITE_WALINE_SERVER_URL` | 保留变量。当前代码固定使用 `https://comments.ztmr.club` | `https://wl.danndann.cn` |
| `VITE_UMAMI_SECONDARY_WEBSITE_ID` | 可选 commons Umami 网站 ID | 无 |
| `VITE_UMAMI_SECONDARY_HOST_URL` | 可选 commons Umami 主机地址 | `https://gallery.ztmr.club/commons` |
| `VITE_UMAMI_SECONDARY_BASE_SCRIPT` | 可选 commons Umami 基础脚本路径 | `/commons` |

### 移动审核前端 (`review-app/.env`)

| 名称 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_ORIGIN` | 可选 API Origin；未设置时由 `review-app/src/lib/api.ts` 自动推导 | 无 |
| `VITE_API_ROOT` | 开发环境常用 API root；本机通常设为 `/api` 配合 Vite proxy | `/api` |
| `VITE_API_URL` | 完整 API base URL；需要覆盖默认推导时使用 | 无 |

### 后端 (`backend/.env`)

| 名称 | 说明 | 默认值 |
|---|---|---|
| `PORT` | 服务端口 | `5010` |
| `NODE_ENV` | 运行环境 (`development` / `production`) | `development` |
| `ALLOWED_ORIGINS` | 允许的 CORS 来源，逗号分隔 | localhost 相关 |
| `SESSION_SECRET` | Express session 签名密钥。`production` 必填，否则后端不会启动 | 无 |
| `ADMIN_PASSWORD` | 管理后台密码（生产环境强烈建议修改） | `zutomayo` |
| `EXPECTED_ORIGIN` | WebAuthn 来源，必须与前端一致 | `http://localhost:5173` |
| `RP_ID` | WebAuthn 依赖方 ID，通常为站点域名，不含协议 | 从 `EXPECTED_ORIGIN` 推导 |
| `IMGPROXY_URL` | Imgproxy 服务器地址 | `https://img.ztmr.club` |
| `IMGPROXY_KEY` | Imgproxy 签名用 Hex Key | 无 |
| `IMGPROXY_SALT` | Imgproxy 签名用 Hex Salt | 无 |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL 连接配置 | 参考 `backend/.env.example` |
| `R2_*` / `MEILI_*` / `REDIS_*` / `TWITTER_*` | 进阶功能配置（图床 / 搜索 / 缓存 / 爬虫 / 通知） | 参考 `backend/.env.example` |

---

## 部署指南

### 部署注意事项

1. 请务必修改后端环境变量中的 `ADMIN_PASSWORD`，否则后台存在未授权访问风险。
2. 如果后端以 `production` 启动，请先设置 `SESSION_SECRET`，否则服务会在启动时退出。
3. 如果启用 Passkeys，需要正确设置 `EXPECTED_ORIGIN` 与 `RP_ID`，且必须在 HTTPS 环境中运行。
4. PostgreSQL 是主数据库，请确保具备持久化存储。`backend/data/` 主要用于缓存和遗留文件。
5. 若前端部署在 Vercel / Netlify，后端部署在其他主机，请正确配置 `ALLOWED_ORIGINS`。
6. 后端依赖 `better-sqlite3` 与 `bcrypt` 等原生模块，Linux 服务器需要 `python3` / `make` / `g++` 等编译工具链。

### 选项 A：`deploy.sh`（推荐服务器使用）

`deploy.sh` 是一个交互式部署脚本，支持安装依赖、构建前端、通过 PM2 启动/重启后端，并包含前端静态文件与后端数据的自动备份。

1. 在服务器上运行脚本：
   ```bash
   ./deploy.sh
   ```
2. 首次运行会生成 `deploy.conf`，请修改以下路径：
   - `FRONTEND_DEPLOY_PATH`：Nginx 等 Web 服务器的静态站点目录
   - `FRONTEND_BACKUP_PATH`：部署前备份目录
3. 再次运行脚本并选择部署内容（前端 / 后端 / 两者都部署），脚本会自动完成剩余步骤。
4. 如果是首次部署或数据库结构有变更，请在服务器上执行 migrations：
   ```bash
   cd backend && npm run migrate
   ```

### 选项 B：`update.sh`（推荐日常更新）

`update.sh` 会自动执行 `git pull`、安装依赖、构建项目、运行 migrations，并重启 PM2：

```bash
./update.sh
```

### 选项 C：手动拆分部署

- 前端：执行 `npm run build:frontend`，将 `frontend/dist` 部署到 Vercel、Netlify 或 GitHub Pages
- 后端：将 `backend` 部署到 Node.js 服务器（如 VPS、Render），确保 PostgreSQL 可连接并配置 `DB_*`，然后执行：
  ```bash
  cd backend
  npm install
  npm run build
  npm run migrate
  npm start
  ```

### 选项 D：Nginx 集成部署

1. 前端构建 `dist` 后由 Nginx 提供静态文件服务。
2. 将 Nginx 的 `/api` 路径反向代理到本地后端 `http://localhost:5010`。
3. 后端可使用 `pm2` 或 `systemd` 常驻运行。

---

## License

本项目仅供粉丝交流学习之用，无任何商业用途。

ZUTOMAYO 相关内容与版权归原作者所有。
