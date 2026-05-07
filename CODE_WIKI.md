# ZUTOMAYO Gallery - 專案 Code Wiki

這份文件是 `zutomayo-gallery` 的廣角導覽，用來快速理解目前專案的整體結構、模組職責與主要資料流。

注意：

- 這份文件不是最高優先的真相來源。
- 若本文與實際代碼、`package.json`、migration、API 定義或更聚焦的文檔衝突，請以高優先級來源為準。
- 新對話與新任務應先依照 `AGENTS.md`、`memory.md`、`docs-index.md` 的閱讀策略建立上下文。

## 1. 專案整體架構

本專案是一個展示 ZUTOMAYO MV、設定圖、相關媒體與二創內容的網站，同時提供管理後台與投稿相關能力。

目前架構為前後端分離，另有一個可選的獨立圖床子應用：

- 前端：`frontend/`
  - React 18 + TypeScript + Vite
  - Tailwind CSS 4 + shadcn/ui
  - 負責公開畫廊、MV 詳情、管理後台頁面、國際化、PWA 與客戶端互動
- 後端：`backend/`
  - Express + TypeScript
  - PostgreSQL + Sequelize + Umzug
  - 負責 MV、媒體、投稿、認證、權限、系統設定與管理 API
- 可選子應用：`image-hosting/`
  - Next.js 應用
  - 主要服務獨立圖床、儲存與管理場景

目前的主資料庫是 PostgreSQL。`better-sqlite3` 仍存在，但主要用於遺留資料恢復、遷移腳本或備份讀取，不是現行主存儲。

## 2. 專案目錄結構

```text
zutomayo-gallery/
├── frontend/                      # React + Vite 前端應用
│   ├── src/
│   │   ├── components/            # 共用 React 組件與 UI 元件
│   │   ├── pages/                 # 頁面組件
│   │   ├── hooks/                 # 自定義 Hooks
│   │   ├── lib/                   # 客戶端工具、API 與型別
│   │   ├── config/                # 前端設定
│   │   ├── locales/               # i18n 語系檔
│   │   ├── debug/                 # 除錯與實驗頁面
│   │   ├── App.tsx                # 前端主路由、輕量佈局容器（hooks + 子組件組合）
│   │   └── main.tsx               # 啟動點
│   ├── docs/                      # 前端專屬設計說明
│   └── package.json
│
├── backend/                       # Express API 與資料維護邏輯
│   ├── src/
│   │   ├── controllers/           # Request/Response 邏輯
│   │   ├── routes/                # 路由掛載
│   │   ├── services/              # 業務邏輯與外部整合
│   │   ├── models/                # Sequelize 模型與關聯
│   │   ├── validators/            # Zod 驗證
│   │   ├── middleware/            # Auth、快取、錯誤處理等
│   │   ├── migrations/            # Umzug migrations
│   │   └── scripts/               # 維運、遷移、恢復腳本
│   ├── API_DOCS.md                # API 參考文檔
│   └── package.json
│
├── docs/                          # 跨模組設計文檔
├── image-hosting/                 # 可選獨立圖床服務
├── review-app/                    # 獨立 Framework7 React 前端（行動裝置審核用）
├── AGENTS.md                      # AI 協作入口規則
├── memory.md                      # 跨端共享記憶
├── docs-index.md                  # 任務導向文檔索引
└── CODE_WIKI.md                   # 廣角導覽
```

## 3. 主要模組職責

### 前端

- `frontend/src/App.tsx`
  - 公開站主入口，輕量佈局容器（~993 行）
  - 組合 8 個 custom hooks（過濾、收藏、無限滾動、吸頂、PWA、載入轉場、滾動位置、動畫暫停）與 13 個抽取組件（AppHeader、FilterBar、GalleryGrid、ControlHub、FeedbackDrawer、AppFooter 等）
  - 仍保留路由狀態派生、Modal 渲染、Analytics effects
  - 使用 `useSWR` 請求 MV 資料、metadata 與 system status
- `frontend/src/pages/AdminPage.tsx`
  - 管理後台主頁之一
  - 體量很大，承載資料編輯、維護工具與多種管理入口
- `frontend/src/components/FancyboxViewer.tsx`
  - 處理正式站燈箱瀏覽
- `frontend/src/components/MVDetailsModal.tsx`
  - 顯示 MV 詳情、媒體與外部影片播放入口
- `frontend/src/lib/`
  - 放置 API 存取、管理端工具、共用型別與客戶端工具函數
  - `useBackendErrorStream` hook 連接後端 SSE 端點，即時接收後端異常並顯示 toast

### 後端

- `backend/src/controllers/mv.controller.ts`
  - 提供 MV 讀取、更新、探測圖片尺寸與 metadata 相關 API
- `backend/src/services/notification.service.ts`
  - `NotificationService` 統一通知入口，`send({ type, title, body, url })` 同時觸發 Bark + Web Push + Telegram
- `backend/src/services/push.service.ts`
  - `PushService` 管理 Web Push 訂閱與 VAPID 加密推播
- `backend/src/services/telegram-bot.service.ts`
  - `TelegramBotService` 發送 Telegram Bot 通知
- `backend/src/services/mv.service.ts`
  - 管理 MV 讀取與更新流程
  - 使用運行時快取 `runtimeData`
  - 寫入成功後可背景同步至 Meilisearch
- `backend/src/services/v2_mapper.ts`
  - 在 PostgreSQL 關聯式模型與前端仍使用的相容 JSON 結構之間做映射
  - `getMVsFromDB()` 將關聯式資料轉成前端可直接使用的結構
  - `saveMVsToDB()` 將編輯資料拆回 MV、Artist、Album、Keyword、Media 等表
- `backend/src/models/index.ts`
  - 定義目前主系統使用的 Sequelize 模型與關聯
  - 包含 MV、Media、Artist、Album、Keyword、MediaGroup、PublicUser、AdminUser 等核心實體
- `backend/src/controllers/auth.controller.ts` + `backend/src/services/auth.service.ts`
  - 管理員登入、Passkey 註冊與驗證
  - 採 session-based auth，並支援 WebAuthn / Passkeys
- `backend/src/controllers/media-groups.controller.ts`
  - 管理媒體分組、推文來源媒體與維護流程
- `backend/src/controllers/fanart.controller.ts`
  - 提供 fanart 展示與相關彙整資料
- `backend/src/controllers/admin-submissions.controller.ts`
  - 管理投稿審核、媒體搬運與後續整理流程
- `backend/src/services/error-events.service.ts`
  - `ErrorEventEmitter` 單例，捕獲所有後端異常並持久化至 `backend_error_logs` 表
  - 透過 SSE 即時推送錯誤事件給已連接的管理員前端

### Review App (`review-app/`)

- 獨立的 Framework7 React 前端應用，專為行動裝置上的媒體審核場景設計
- 使用 Framework7 React v9，支援 auto theme（iOS/MD 自動切換）與 auto dark mode
- 連接同一後端 API，透過 session-based auth 與主站共享管理員認證
- `src/index.css` 提供統一的 `review-*` 視覺語彙，涵蓋 navbar、card、list、panel、sheet、popup 與行動端深色主題
- `src/components/ReviewStateBlock.tsx` 統一空狀態、錯誤狀態與載入狀態，避免各頁各自拼裝 inline UI
- `src/lib/moderation-boundaries.ts` 集中維護 review-app 與桌面 admin 的接管邊界，會列出每個工作區對應主前端頁面、直接接管能力、桌面 fallback 情境與已知限制
- 主要頁面：
  - `LoginPage` — 管理員登入
  - `HomePage` — 總覽、同步狀態、快捷入口與近期工作區
  - `StagingPage` — 爬蟲暫存審核、批次操作、crawler trigger
  - `SubmissionsPage` — 投稿審核、詳情、退回原因
  - `FanartPage` — FanArt 整理、assign / sync / discard / restore / parse-save
  - `RepairPage` — group repair、merge、unassign、reparse preview / apply
  - `SettingsPage` — 推播、通知偏好、接管邊界入口
  - `SettingsBoundariesPage` — 集中查看各工作區接管邊界、限制與 API
- 接管現況：
  - `StagingPage`、`SubmissionsPage`、`FanartPage`、`RepairPage` 都已可直接完成核心審核 / 整理 / 修復流程
  - 桌面 admin 目前主要保留作為大螢幕高密度盤點、多視窗比對與鍵盤密集操作的備援入口，而不是功能必經路徑
- 關鍵組件：
  - `AppNavbar` — 手機導覽列與工作區切換入口
  - `MvSheet` — MV/標籤選擇的左側 floating Panel
  - `ReviewStateBlock` — 頁面內狀態區塊

## 4. 目前資料模型重點

目前不是單表 JSON 存儲模型，而是以 PostgreSQL 關聯式模型為主：

- `mvs`
  - MV 核心資訊，如標題、年份、日期、YouTube、Bilibili、描述
- `media`
  - 所有媒體資源，包括 cover、official、fanart 等
- `artists`
  - 創作者資料
- `albums`
  - 專輯資料
- `keywords`
  - 搜尋與分類標籤
- 關聯表
  - `mv_media`
  - `mv_artists`
  - `mv_albums`
  - `mv_keywords`
- 補充表
  - `media_groups`
  - `sys_configs`
  - `sys_announcements`
  - `staging_fanarts`
  - `public_users`
  - `auth_passkeys`
  - `backend_error_logs`
  - `push_subscriptions`

前端仍消費近似舊版的聚合 JSON 結構，因此後端透過 `v2_mapper.ts` 做雙向轉換，讓前端暫時不必直接承擔完整關聯式資料模型。

## 5. 關鍵類別與函數

### 前端

- `RootApp()` in `frontend/src/App.tsx`
  - 以 `useSWR` 同時讀取 MV 資料、metadata 與系統維護狀態
  - 根據路由與系統狀態決定是否顯示公開站、管理頁或維護頁
- `App()` in `frontend/src/App.tsx`
  - 輕量佈局容器，組合 hooks 與子組件
  - Custom hooks：`useMVFilters`、`useFavorites`、`useInfiniteScroll`、`useStickyFilterBar`、`usePWA`、`useLoadingTransition`、`useScrollPosition`、`useAnimationPause`
  - 抽取組件：`AppHeader`、`FilterBar`、`GalleryGrid`、`ControlHub`、`FeedbackDrawer`、`AppFooter`、`LoadingScreen`、`NetworkWarningScreen`、`ErrorScreen`、`PWAInstallDrawer`、`PWARecoverDrawer`、`AboutDialog`、`AnimatedMVCardItem`
- `useLazyImage()` in `frontend/src/hooks/useLazyImage.ts`
  - 以 `IntersectionObserver` 處理延遲載入與進場時機
- `CoverCarousel` in `frontend/src/components/MVCard.tsx`
  - 處理卡片封面輪播與視覺特效

### 後端

- `sequelize` in `backend/src/services/pg.service.ts`
  - PostgreSQL 主連線
- `getMVsFromDB()` in `backend/src/services/v2_mapper.ts`
  - 從關聯模型讀出資料並格式化為前端可用結構
- `saveMVsToDB()` in `backend/src/services/v2_mapper.ts`
  - 將編輯結果拆解並寫入 MV 與多個關聯表
- `MVService.getAllMVs()` / `MVService.updateAllMVs()` in `backend/src/services/mv.service.ts`
  - 負責 MV 快取、部分更新、全量更新與同步流程
- `updateMVs()` / `probeImage()` in `backend/src/controllers/mv.controller.ts`
  - 提供管理端更新入口與圖片尺寸探測
- `generateAuthOptions()` / `verifyAuth()` in `backend/src/controllers/auth.controller.ts`
  - 管理員 Passkey 認證主流程
- `migrate` in `backend/src/scripts/migrate.ts`
  - 執行 Umzug migrations

## 6. 依賴關係

### 前端

- UI 與路由：`react`, `react-dom`, `react-router-dom`
- 資料讀取：`swr`, `@tanstack/react-query`, `@refinedev/*`
- 樣式與組件：`tailwindcss`, `@radix-ui/*`, `shadcn`
- 視覺展示：`@fancyapps/ui`, `masonry-layout`, `lightgallery`（主要保留 debug 用途）
- 編輯與整合：`@monaco-editor/react`, `@simplewebauthn/browser`, `@waline/client`
- 多語系：`i18next`, `react-i18next`

### 後端

- API 與安全：`express`, `cors`, `helmet`, `express-session`, `express-rate-limit`
- 資料庫：`pg`, `sequelize`, `umzug`
- 驗證與認證：`zod`, `bcrypt`, `@simplewebauthn/server`
- 快取與搜尋：`redis`, `ioredis`, `bullmq`, `meilisearch`
- 媒體與外部服務：`probe-image-size`, `@aws-sdk/client-s3`, `rss-parser`, `apify-client`
- 遺留與維護：`better-sqlite3` 僅用於遷移、恢復與舊資料處理

## 7. 主要資料流

### 1. 公開站讀取流程

1. 使用者訪問網站，前端載入 `frontend/src/App.tsx`。
2. `useSWR` 請求 MV API、metadata API 與 system status API。
3. 後端 `mv.controller.ts` 呼叫 `MVService`。
4. `MVService` 先檢查運行時快取 `runtimeData`。
5. 若快取不存在或需要重建，則透過 `getMVsFromDB()` 從 PostgreSQL 讀取 MV、Artist、Album、Keyword、Media 等關聯資料。
6. `v2_mapper.ts` 將關聯式資料轉為前端相容結構並回傳。
7. 前端再做本地搜尋、篩選、排序與畫面渲染。

### 2. 管理後台更新流程

1. 管理員進入 `/admin/*`，先通過登入與權限檢查。
2. 管理頁提交更新資料到後端，例如 MV 編輯或維護操作。
3. 後端 controller 使用 Zod 驗證輸入。
4. `MVService.updateAllMVs()` 決定全量更新、部分更新與刪除清單。
5. `saveMVsToDB()` 在 transaction 中重建 MV 與相關 metadata / media 關聯。
6. 寫入成功後更新 `runtimeData`，並清理 API 快取。
7. 若有啟用搜尋服務，背景同步到 Meilisearch。

### 3. 管理員認證流程

1. 管理員可使用密碼登入，並可在登入後註冊 Passkey。
2. Passkey 認證由前端呼叫後端的 options / verify API。
3. 後端使用 session 保存 challenge 與暫存認證上下文。
4. 驗證成功後將管理員身份寫入 session，供後續管理 API 使用。

### 4. 媒體與外部資源流程

- 圖片來源可能是 Twitter、YouTube、R2 或其他外部來源。
- 部分媒體會經過 proxy 或 R2 備份，以解決展示、穩定性與維護需求。
- 媒體分組、投稿媒體與 MV cover 有不同維護邊界，不能混成同一條流程。
- `MV` cover 維護必須與 tweet-source media、orphan media、fanart 管理分開處理。

### 5. 後端錯誤監控流程

1. 後端任何異常（請求錯誤、未捕獲異常、未處理 Promise Rejection、BullMQ 任務失敗、背景任務失敗、啟動/遷移失敗）觸發 `ErrorEventEmitter.emitError()`。
2. `ErrorEventEmitter` 將錯誤寫入 `backend_error_logs` 資料表，並透過 Node.js EventEmitter 廣播。
3. SSE 端點 (`/api/system/errors/stream`) 監聽廣播，即時推送給已連接的管理員前端。
4. 前端 `useBackendErrorStream` hook 接收 SSE 事件，彈出 toast 通知並更新 header 錯誤計數徽章。
5. 管理員可至 `/admin/system/errors` 錯誤日誌頁面查詢、篩選、搜尋與標記解決。
6. 前端預設以 `severity=server` 篩選，隱藏 4xx 客戶端錯誤，僅顯示 5xx+ 及非請求來源異常；管理員可切換至「全部」查看完整記錄。
7. Sequelize 關聯使用 `constraints: false` 避免 `sync({ alter: true })` 因缺少 FK constraint 而報錯。

## 8. 與其他文檔的關係

- 若要快速判斷先讀哪些文檔，先看 `docs-index.md`
- 若要看跨端共享背景，讀 `memory.md`
- 若要看前端穩定約束，讀 `frontend-memory.md`
- 若要看後端穩定約束，讀 `backend-memory.md`
- 若要看 API 細節，讀 `backend/API_DOCS.md`
- 若要看資料庫與媒體設計，讀 `docs/DB_SCHEMA.md`、`docs/MEDIA_FLOW.md`、`docs/MEDIA_PROCESSING_ARCHITECTURE.md`

## 9. 維護原則

- 修改程式碼時，若影響架構、資料流、API、資料模型或維運方式，應同步更新對應文檔。
- `CODE_WIKI.md` 應保持在「快速導覽」層級，不要變成重複維護所有細節的唯一文檔。
- 更細的準確說明應放在專門文檔，再由 `docs-index.md` 與 memory 文檔負責導流。
