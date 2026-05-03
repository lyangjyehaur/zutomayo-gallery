# ZUTOMAYO Gallery

An online gallery and admin dashboard for maintaining a ZUTOMAYO MV illustration database.

[繁體中文](README.md) | [简体中文](README.zh-Hans.md) | English | [日本語](README.ja.md)

![Version](https://img.shields.io/badge/version-3.6.2-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac)

Last updated: 2026-05-03

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

This project provides a responsive MV illustration gallery with an admin panel for data maintenance. The frontend is built with React + TypeScript. The backend is an Express + TypeScript API backed by PostgreSQL (Sequelize + Umzug migrations). The production lightbox currently uses Fancybox; LightGallery is only kept for debug/testing pages.

---

## Features

- Immersive gallery: Fancybox lightbox (LightGallery is kept for debug/testing pages)
- Masonry layout: responsive, image-size friendly
- Admin authentication: WebAuthn (Passkeys)
- Admin & permissions: RBAC and various admin APIs
- Comments: Waline with custom emoji, reactions and pageview counter
- Performance: component memoization, lazy loading and Vite chunk splitting

---

## Tech Stack

### Frontend

| Tech | Version | Notes |
|---|---:|---|
| React | 18.3 | UI framework |
| TypeScript | 5.3 | Type safety |
| Vite | 5.4.2 | Build tool |
| Tailwind CSS | 4.0 | Styling |
| shadcn/ui | 4.2 | UI components |
| Fancybox | 6.1 | Lightbox |
| LightGallery | 2.9 | Lightbox (debug/testing only) |
| Masonry | 4.2 | Grid layout |
| Monaco Editor | 4.7 | Admin editor |
| Waline | 3.5.0 | Comment system |
| React Router | 6.22 | Routing |
| SWR | 2.4 | Data fetching |

### Backend

| Tech | Version | Notes |
|---|---:|---|
| Express | 4.19.2 | Web framework |
| TypeScript | 5.3.3 | Type safety |
| PostgreSQL | - | Primary database |
| Sequelize | 6.37.8 | ORM |
| Umzug | 3.8.0 | Migrations |
| Zod | 3.22.4 | Validation |
| Helmet | 7.1.0 | Security headers |
| express-rate-limit | 7.1.5 | Rate limiting |
| bcrypt | 6.0.0 | Password hashing |
| Redis | - | Optional (session/ratelimit/queue) |
| BullMQ | 5.76.2 | Optional job queue |
| Meilisearch | 0.57.0 | Optional search |
| @simplewebauthn/server | 13.3 | WebAuthn (Passkeys) |
| better-sqlite3 | 12.9 | Legacy/migration scripts |

---

## Project Structure

```text
zutomayo-gallery/
├── frontend/                    # Vite + React app
├── backend/                     # Express API (PostgreSQL)
│   ├── data/                    # local cache/legacy data (ip2region, sqlite backups, etc.)
│   └── src/
├── image-hosting/               # (optional) independent Next.js image hosting service
├── deploy.sh                    # interactive deploy script for VPS
├── update.sh                    # incremental update script (pull/build/migrate/reload)
└── README.md
```

---

## Quick Start

### Requirements

- Node.js >= 18
- npm or pnpm
- Git
- PostgreSQL (primary DB)
- Redis / Meilisearch (optional; features degrade/disable when not configured)

### Install

```bash
git clone https://github.com/lyangjyehaur/zutomayo-gallery.git
cd zutomayo-gallery
npm run install:all
```

### Development

```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5010
```

---

## Environment Variables

Copy example env files:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### Frontend (`frontend/.env`)

| Name | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API URL including `/api/mvs` (or leave default when using reverse proxy) | `/api/mvs` |
| `VITE_TWITTER_IMG_PROXY` | Optional image proxy | `https://img.ztmr.club` |
| `VITE_R2_DOMAIN` | Optional Cloudflare R2 custom domain | `https://r2.dan.tw` |
| `VITE_WALINE_SERVER_URL` | Reserved; current code uses `https://comments.ztmr.club` | `https://wl.danndann.cn` |

### Backend (`backend/.env`)

| Name | Description | Default |
|---|---|---|
| `PORT` | Server port | `5010` |
| `ADMIN_PASSWORD` | Admin password (change in production) | `zutomayo` |
| `ALLOWED_ORIGINS` | CORS allow list | localhost values |
| `EXPECTED_ORIGIN` / `RP_ID` | WebAuthn settings | dev defaults |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL connection | see `backend/.env.example` |
| `R2_*` / `MEILI_*` / `REDIS_*` / `TWITTER_*` | Optional advanced features | see `backend/.env.example` |

---

## Deployment

### Option A: `deploy.sh` (VPS recommended)

```bash
./deploy.sh
```

After the first run it creates `deploy.conf` for paths like `FRONTEND_DEPLOY_PATH` and `FRONTEND_BACKUP_PATH`.

If you deploy for the first time or schema changed, run migrations:

```bash
cd backend && npm run migrate
```

### Option B: `update.sh` (daily update)

```bash
./update.sh
```

---

## License

For fan use and learning only. No commercial use.
