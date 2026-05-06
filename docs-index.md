# Docs Index

## Purpose

- 這份文件用來把 new chats / new tasks 導向最小必要的 document set。
- Default goal：在不重讀整個 repo 的前提下，取得足夠 context 來正確行動。

## Documentation Layout

- Root local working docs：`memory.md`、`frontend-memory.md`、`backend-memory.md`。
- Root shared docs：`docs-index.md`、`CODE_WIKI.md`、各種 project `README`。
- `docs/`：跨模組的 design / architecture docs。
- `frontend/docs/`：frontend-only 的 architecture / UI behavior docs。
- `backend/API_DOCS.md`：backend API reference。
- `.trae/`：tool-specific plans、specs、workflow artifacts；視為 local planning context，不是 shared product docs。

## Default Reading Strategy

- Always start with `AGENTS.md`。
- 接著讀 `memory.md`。
- 再根據 task type，選讀 `frontend-memory.md`、`backend-memory.md`，或 cross-stack 時兩者都讀。
- 然後用這份文件決定最小必要的 task-specific docs。
- 在相信 broad explanatory docs 之前，先讀任務附近的 code 和 config。
- 若 task 不清楚，或還存在重要的 product / implementation decision，先問用戶。
- 不要猜 API details 或 business rules；先查最可靠的 source，仍不確定再問。
- code 改完後，要同步更新這裡列出的對應文檔。
- 功能改完後，要先驗證，再向用戶確認滿意度，再關閉 task。

## Source Priority

- Tier 1：current code、config、migrations、package files、active API definitions。
- Tier 2：`AGENTS.md`、`memory.md`、`frontend-memory.md`、`backend-memory.md`、`docs-index.md`。
- Tier 3：focused docs，例如 `backend/API_DOCS.md`、`docs/`、`frontend/docs/`。
- Tier 4：`CODE_WIKI.md`，作為 broad orientation 與 terminology map。
- Tier 5：`.trae/` 內的 planning / spec files，只作 historical or workflow context。

## Documentation Update Matrix

- Changes in `backend/src/models/`、migrations、persistence contracts：
  - 更新 `docs/DB_SCHEMA.md`
  - 若 stable backend constraints / data responsibilities 有變，更 `backend-memory.md`
  - 若 high-level data model / flow 有變，更 `CODE_WIKI.md`

- Changes in `backend/src/controllers/`、`backend/src/routes/`、`backend/src/validators/`、auth flows：
  - 更新 `backend/API_DOCS.md`
  - 若 stable API / auth behavior 有變，更 `backend-memory.md`
  - 若 high-level request flow 有變，更 `CODE_WIKI.md`

- Changes in `backend/src/services/mv.service.ts`、`backend/src/services/v2_mapper.ts`、media orchestration、read/write flow：
  - 更新 `CODE_WIKI.md`
  - flow semantics 有變時，更新 `docs/MEDIA_FLOW.md` 或 `docs/MEDIA_PROCESSING_ARCHITECTURE.md`
  - 若 backend working model / boundary 有變，更 `backend-memory.md`

- Changes in `frontend/src/App.tsx`、routing、shared page flow、public-site loading behavior：
  - 更新 `frontend-memory.md`
  - 若 broad frontend architecture 有變，更 `CODE_WIKI.md`

- Changes in `frontend/src/components/`、gallery UX、lightbox、masonry、image rendering behavior：
  - 若 architecture / behavior 有變，更新 `frontend/docs/fancybox-masonry-architecture.md`
  - 若 stable frontend constraints / decisions 有變，更 `frontend-memory.md`

- Changes in submission、moderation、fanart、media-group、crawler workflows：
  - 更新 `docs/` 下對應文檔，如 `docs/FANART_SUBMISSION_SYSTEM.md`、`docs/MEDIA_FLOW.md`、`docs/TWITTER_CRAWLER_SYSTEM.md`
  - 若 broad system map 有變，更 `CODE_WIKI.md`

- Changes in shared reading strategy、doc routing、collaboration conventions：
  - 更新 `memory.md`
  - 更新 `docs-index.md`
  - 若 AI entry protocol 有變，更新 `AGENTS.md`

## Delivery Rules

- 在引入新實作前，先 reuse 現有 project patterns。
- 未經用戶明確要求，不要 push。
- 主專案 version 的 single source 是根目錄 `package.json`。
- 不要手改 `frontend/package.json`、`backend/package.json`、各自 lockfile、README version badge；它們都屬於 derived metadata。
- 若用戶明確要求 push，預設只升 patch version；除非明確要求 major / minor bump。
- 版本更新時，從 repo root 執行 `npm run release:patch`、`npm run release:minor`、`npm run release:major`，或 `npm version <exact-version> --no-git-tag-version`；`version` lifecycle 會自動同步衍生檔案。
- 可用 `npm run version:check` 檢查 version drift；若失配再執行 `npm run version:sync`。
- `frontend/public/version.json` 是 build/runtime artifact，frontend build 時會重新產生；不作為手動改版入口。
- `image-hosting/package.json` 目前維持獨立版本，不在主專案自動同步範圍內。
- 若 requested push 包含 version bump，要在相關 memory file 記錄版本，方便之後整理 changelog。
- 對 layout、styling、animation、interaction 類改動，應在 browser 中測試；必要時向用戶索取 edge-case test scenarios。

## Git Tracking Policy

- Track shared docs：凡是定義 product behavior、architecture、API、data contract、AI reading strategy 的共享文檔都應進 git。
- Track：`docs-index.md`、`CODE_WIKI.md`、`docs/`、`frontend/docs/`、`backend/API_DOCS.md`、以及用來說明 shipped behavior 的 durable README docs。
- Ignore local-only AI/tool context：`AGENTS.md`、`memory.md`、`frontend-memory.md`、`backend-memory.md`。
- Ignore `.trae/` workflow artifacts、planning notes、specs，除非你明確決定要把它們 productize。
- Ignore deployment-local notes、machine-specific setup notes、scratch investigation docs。

## Minimal Read Sets

- New chat / unknown task：
  - `AGENTS.md`
  - `memory.md`
  - `docs-index.md`

- Frontend UI bug / component change：
  - `AGENTS.md`
  - `memory.md`
  - `frontend-memory.md`
  - relevant files in `frontend/src/`

- Frontend gallery / lightbox / masonry / image rendering：
  - `AGENTS.md`
  - `memory.md`
  - `frontend-memory.md`
  - `frontend/docs/fancybox-masonry-architecture.md`
  - relevant files in `frontend/src/components/`、`frontend/src/pages/`、`frontend/src/lib/`

- Backend API / auth / admin / validation / middleware：
  - `AGENTS.md`
  - `memory.md`
  - `backend-memory.md`
  - `backend/API_DOCS.md`
  - relevant files in `backend/src/controllers/`、`backend/src/services/`、`backend/src/routes/`、`backend/src/validators/`

- Database / schema / migration / persistence：
  - `AGENTS.md`
  - `memory.md`
  - `backend-memory.md`
  - `docs/DB_SCHEMA.md`
  - `docs/DATABASE_REFACTOR.md`
  - `backend/src/migrations/`
  - `backend/src/services/pg.service.ts`

- Media pipeline / proxy / upload / crawler / external assets：
  - `AGENTS.md`
  - `memory.md`
  - `backend-memory.md`
  - `docs/MEDIA_FLOW.md`
  - `docs/MEDIA_PROCESSING_ARCHITECTURE.md`
  - `docs/IMAGE_PROXY_STRATEGY.md`
  - `docs/TWITTER_CRAWLER_SYSTEM.md`

- Fanart submission / moderation：
  - `AGENTS.md`
  - `memory.md`
  - `backend-memory.md`
  - `docs/FANART_SUBMISSION_SYSTEM.md`
  - relevant files in `backend/src/controllers/`、`backend/src/services/`、`frontend/src/pages/`

- Email template / auth email change：
  - `AGENTS.md`
  - `memory.md`
  - `backend-memory.md`
  - `backend/email-templates/README.md`
  - relevant files in `backend/email-templates/`、`backend/src/services/mail.service.ts`

- Image hosting app work：
  - `AGENTS.md`
  - `memory.md`
  - relevant files in `image-hosting/`
  - package / config in `image-hosting/package.json`、`image-hosting/next.config.ts`、`image-hosting/prisma/schema.prisma`

- Review app work：
  - `AGENTS.md`
  - `memory.md`
  - relevant files in `review-app/`
  - `CODE_WIKI.md` (review-app section)

- Notification system (Web Push / Telegram / Bark)：
  - `AGENTS.md`
  - `memory.md`
  - `backend-memory.md`
  - `docs/TWITTER_CRAWLER_SYSTEM.md` (notification section)
  - `docs/FANART_SUBMISSION_SYSTEM.md` (notification section)
  - `docs/DB_SCHEMA.md` (push_subscriptions table)
  - `backend/API_DOCS.md` (push subscription endpoints)

## How To Use `CODE_WIKI.md`

- 當 new task 需要快速理解 modules、terminology、rough data flow 時再讀。
- 不要把它當成 implementation detail 的最終真相來源。
- 若 `CODE_WIKI.md` 與 current code 或更新的 focused docs 衝突，採用 higher-priority source。

## What Not To Read By Default

- 一般 coding tasks 不要把所有多語 `README` 全讀一遍。
- 不要一開始就把 `docs/` 裡所有檔案全讀完。
- 不要預設讀 `.trae/specs/` 或 `.trae/documents/`，除非 task 明確相關。
- 若 nearby code 已經回答問題，不要把長篇 prose docs 當成 mandatory read。
