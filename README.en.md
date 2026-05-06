# ZUTOMAYO Gallery

An online gallery for ZUTOMAYO MV illustration assets, with an admin panel for data maintenance.

[繁體中文](README.md) | [简体中文](README.zh-Hans.md) | [English](README.en.md) | [日本語](README.ja.md)

![Version](https://img.shields.io/badge/version-3.6.6-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

Last updated: 2026-05-05

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

This project is a gallery for viewing ZUTOMAYO MV illustration assets, with an admin backend for data maintenance. The frontend is built with React + TypeScript. The backend uses Express + TypeScript, and the primary database is PostgreSQL with Sequelize + Umzug migrations. The production lightbox currently uses Fancybox; LightGallery is only kept on debug pages.

---

## Features

- Immersive gallery experience: Fancybox for the production lightbox, with LightGallery kept only for debug/testing pages
- Masonry layout: responsive and image-size friendly
- Modern secure login: WebAuthn / Passkeys for admin access
- Administration and permissions: RBAC and various admin APIs
- Data viewing and editing: Monaco Editor-based admin tooling
- Interactive comments: Waline with custom emoji, reactions, and pageview stats
- Performance tuning: React memoization, lazy loading, and Vite chunk splitting

---

## Tech Stack

### Frontend

| Tech | Version | Purpose |
|---|---:|---|
| [React](https://react.dev/) | 18.3 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | Type safety |
| [Vite](https://vitejs.dev/) | 5.4.2 | Build tool |
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | Styling |
| [shadcn/ui](https://ui.shadcn.com/) | 4.2 | UI component library |
| [Neobrutalism](https://www.neobrutalism.dev/) | - | Design style and theme |
| [Fancybox](https://fancyapps.com/fancybox/) | 6.1 | Lightbox |
| [LightGallery](https://www.lightgalleryjs.com/) | 2.9 | Lightbox (debug/testing only) |
| [Masonry](https://masonry.desandro.com/) | 4.2 | Grid layout |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 4.7 | Code editor |
| [Waline](https://waline.js.org/) | 3.5.0 | Comment system |
| [Umami](https://umami.is/) | - | Analytics |
| [React Router](https://reactrouter.com/) | 6.22 | Routing |
| [SWR](https://swr.vercel.app/) | 2.4 | Data fetching |

### Backend

| Tech | Version | Purpose |
|---|---:|---|
| [Express](https://expressjs.com/) | 4.19 | Web framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | Type safety |
| [PostgreSQL](https://www.postgresql.org/) | - | Primary database |
| [Sequelize](https://sequelize.org/) | 6.37.8 | ORM |
| [Umzug](https://github.com/sequelize/umzug) | 3.8.0 | Database migrations |
| [Zod](https://zod.dev/) | 3.22 | Input validation |
| [probe-image-size](https://github.com/nodeca/probe-image-size) | 7.2 | Image dimension detection |
| [Helmet](https://helmetjs.github.io/) | 7.1.0 | Security headers |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.1.5 | Rate limiting |
| [CORS](https://github.com/expressjs/cors) | 2.8.5 | Cross-origin support |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0.0 | Password hashing |
| [Redis](https://redis.io/) | - | Session / rate limit / queue support (optional) |
| [BullMQ](https://docs.bullmq.io/) | 5.76.2 | Job queue (optional) |
| [Meilisearch](https://www.meilisearch.com/) | 0.57.0 | Search (optional) |
| [@simplewebauthn/server](https://simplewebauthn.dev/) | 13.3 | WebAuthn (Passkeys) |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.9 | SQLite for legacy data / migration scripts |

---

## Project Structure

```text
zutomayo-gallery/
├── frontend/                    # Frontend application (React)
│   ├── public/                  # Static assets & legacy Vanilla JS implementation
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── FancyboxViewer.tsx # Fancybox lightbox component
│   │   │   ├── MVCard.tsx       # MV card
│   │   │   ├── MVDetailsModal.tsx # MV details modal
│   │   │   └── WalineComments.tsx # Comment widget
│   │   ├── pages/               # Page components (AdminPage, DebugGallery, etc.)
│   │   ├── lib/                 # Utilities and type definitions
│   │   ├── config/              # Configuration files
│   │   ├── hooks/               # Custom hooks
│   │   └── debug/               # Development/debug components
│   └── package.json
│
├── backend/                     # Backend API (Node.js)
│   ├── data/                    # Local data/cache/legacy data (ip2region, SQLite legacy files, etc.)
│   ├── src/
│   │   ├── controllers/         # Route controllers
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   ├── validators/          # Zod validators
│   │   ├── middleware/          # Express middleware
│   │   └── index.ts             # Entry point
│   └── package.json
│
├── image-hosting/               # (optional) independent Next.js image hosting service
│   └── package.json
│
├── package.json                 # Root workspace config
├── deploy.sh                    # Server automation deploy script
└── README.md
```

---

## Quick Start

### One-Click Start

**Windows**
- Double-click `start.bat`
- Or double-click `launch.bat` for extra checks

**Linux / Mac**
- Run `./start.sh` in a terminal
- Or run `npm run dev`

**Command-line**
- `npm run dev` starts both frontend and backend
- `npm run start:frontend` starts only the frontend
- `npm run start:backend` starts only the backend

### Requirements

- Node.js 20 LTS (the project includes `.nvmrc`; supported range is `>=20 <26`)
- npm 10+
- Git
- PostgreSQL (primary database)
- Redis / Meilisearch (optional; features degrade or disable when not configured)

### Install

```bash
# 1. Get the code
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery

# 2. Option A: install the main site dependencies (recommended: root + frontend + backend)
npm run install:all

# CI / clean environments can use lockfile-based installs
npm run ci:all

# 3. Option B: install separately
# Root dependencies
npm install

# Frontend dependencies
npm --prefix frontend install --legacy-peer-deps

# Backend dependencies
npm --prefix backend install

# Optional: install the independent image-hosting service dependencies
npm run install:optional
```

### Development

```bash
# Recommended
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5010

# Start separately
npm run start:frontend
npm run start:backend

# Build + test
npm run verify
```

### Production Build

```bash
# Frontend build
cd frontend && npm run build

# Backend build
cd backend && npm run build
```

---

## Environment Variables

Copy the example env files:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### Frontend (`frontend/.env`)

| Name | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API server URL; set it explicitly when the frontend and backend are deployed separately | `/api/mvs` |
| `VITE_TWITTER_IMG_PROXY` | Optional image proxy / acceleration service | `https://img.ztmr.club` |
| `VITE_R2_DOMAIN` | Optional Cloudflare R2 custom domain | `https://r2.dan.tw` |
| `VITE_WALINE_SERVER_URL` | Reserved. The code currently uses `https://comments.ztmr.club`; this env var is kept for future replacement | `https://wl.danndann.cn` |
| `VITE_UMAMI_SECONDARY_WEBSITE_ID` | Optional commons Umami website ID | none |
| `VITE_UMAMI_SECONDARY_HOST_URL` | Optional commons Umami host URL | `https://gallery.ztmr.club/commons` |
| `VITE_UMAMI_SECONDARY_BASE_SCRIPT` | Optional commons Umami base script path | `/commons` |

### Backend (`backend/.env`)

| Name | Description | Default |
|---|---|---|
| `PORT` | Server port | `5010` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `ALLOWED_ORIGINS` | Allowed CORS origins, comma-separated | localhost values |
| `SESSION_SECRET` | Express session signing key; required in `production`, or the backend will refuse to start | none |
| `ADMIN_PASSWORD` | Admin login password (strongly recommended to change in production) | `zutomayo` |
| `EXPECTED_ORIGIN` | WebAuthn origin, must match the frontend | `http://localhost:5173` |
| `RP_ID` | WebAuthn relying party ID, usually the site domain without protocol | derived from `EXPECTED_ORIGIN` |
| `IMGPROXY_URL` | Imgproxy server URL | `https://img.ztmr.club` |
| `IMGPROXY_KEY` | Imgproxy signing key in hex | none |
| `IMGPROXY_SALT` | Imgproxy signing salt in hex | none |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL connection settings | see `backend/.env.example` |
| `R2_*` / `MEILI_*` / `REDIS_*` / `TWITTER_*` | Optional advanced settings (image hosting / search / cache / crawler / notifications) | see `backend/.env.example` |

---

## Deployment

### Deployment Notes

1. Change `ADMIN_PASSWORD` in the backend environment variables. Leaving the default password creates an unauthorized access risk.
2. Set `SESSION_SECRET` before starting the backend in `production`; otherwise the server will exit on boot.
3. Passkeys require correct `EXPECTED_ORIGIN` and `RP_ID` values, plus HTTPS.
4. PostgreSQL is the primary database. Make sure it has persistent storage. `backend/data/` is for cache and legacy files only.
5. If the frontend is deployed on Vercel / Netlify and the backend is on another host, set `ALLOWED_ORIGINS` accordingly.
6. The backend depends on `better-sqlite3` and `bcrypt`, which are native addons. Linux servers need a working build toolchain such as `python3`, `make`, and `g++`.

### Option A: `deploy.sh` (recommended for servers)

The interactive `deploy.sh` script supports dependency installation, frontend builds, PM2 backend restart/start, and automatic backups for static assets and backend data.

1. Run the script on the server:
   ```bash
   ./deploy.sh
   ```
2. The first run generates `deploy.conf`. Update these paths:
   - `FRONTEND_DEPLOY_PATH`: static site directory for Nginx or similar web servers
   - `FRONTEND_BACKUP_PATH`: backup directory for files before deployment
3. Run the script again and choose what to deploy (frontend, backend, or both). The script will handle the rest.
4. If this is the first deployment or the schema changed, run migrations on the server:
   ```bash
   cd backend && npm run migrate
   ```

### Option B: `update.sh` (recommended for routine updates)

`update.sh` performs `git pull`, installs dependencies, builds the project, runs migrations, and restarts PM2:

```bash
./update.sh
```

### Option C: Manual split deployment

- Frontend: run `npm run build:frontend` and deploy `frontend/dist` to Vercel, Netlify, or GitHub Pages
- Backend: upload `backend` to a Node.js server such as a VPS or Render, ensure PostgreSQL access and `DB_*` environment variables, then run:
  ```bash
  cd backend
  npm install
  npm run build
  npm run migrate
  npm start
  ```

### Option D: Integrated deployment with Nginx

1. Build the frontend `dist` files and let Nginx serve them statically.
2. Configure Nginx to reverse proxy `/api` to the local backend at `http://localhost:5010`.
3. Keep the backend process alive with `pm2` or `systemd`.

---

## License

For fan use and learning only. No commercial use.

ZUTOMAYO content and rights belong to the original author.
