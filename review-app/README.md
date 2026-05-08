# review-app

`review-app/` 是給手機與平板使用的獨立審核前端，採用 Framework7 React + React 19 + TypeScript + Vite，與主站共用後端 API 與 admin session。

目前它不再只是首頁殼層，而是直接承接以下工作流：

- `HomePage`：審核總覽、同步進度、工作區摘要與行動端精簡入口
- `StagingPage`：crawler 暫存清單、批次 approve / reject / restore、crawler trigger、頁內 push 詳情檢視
- `SubmissionsPage`：投稿審核、搜尋、詳情、approve、退回原因填寫
- `FanartPage`：未整理 / 已丟棄 / 舊資料 / 已組織 / 手動解析視圖，含 assign / sync / discard / restore / parse-save
- `RepairPage`：group repair 搜尋、推斷來源、edit / merge / unassign、reparse preview / apply（支援欄位級勾選更新）
- `SettingsPage`：推播訂閱、通知偏好、接管邊界入口
- `SettingsBoundariesPage`：集中查看各工作區接管範圍、限制與對應 API

## 能力對照

### `StagingPage` <-> `frontend/src/pages/AdminStagingFanartPage.tsx`

- 對應主前端頁面：`/admin/staging-fanarts`
- 已接管能力：pending / approved / rejected 切換、搜尋、單筆 approve / reject / restore、批次 approve / reject / restore、MV / Tag 關聯、crawler trigger、同步進度、詳情 push view
- 未覆蓋項目：目前沒有明確缺少的核心 API 或審核步驟
- 已知限制：列表優先最佳化手機卡片瀏覽與單欄操作；若需要大螢幕並排比對多筆詳情，桌面 admin 仍較適合

### `SubmissionsPage` <-> `frontend/src/pages/AdminSubmissionsPage.tsx`

- 對應主前端頁面：`/admin/submissions`
- 已接管能力：pending / approved / rejected 切換、搜尋、詳情 Popup、媒體預覽、作者資訊、approve、帶原因 reject、統計卡片
- 未覆蓋項目：目前沒有明確缺少的核心 API 或審核步驟
- 已知限制：退回原因改為行動端 Sheet 流程，而非桌面版逐列 inline 編輯；若要長時間交叉比對多筆投稿，桌面 admin 的資訊密度仍較高

### `FanartPage` <-> `frontend/src/pages/AdminFanArtPage.tsx`

- 對應主前端頁面：`/admin/fanart`
- 已接管能力：未整理、已丟棄、舊資料、已組織、手動解析五種主視圖；assign、sync、discard、restore、parse-save；依特殊 Tag / MV 切入已組織 FanArt
- 未覆蓋項目：目前沒有明確缺少的核心整理 API；不再是只有入口與統計的半接管狀態
- 已知限制：清單與詳情優先服務觸控單筆處理，不追求桌面版一次顯示大量縮圖的高密度盤點；大批量長時間整理時，桌面 admin 仍可作為備援

### `RepairPage` <-> `frontend/src/pages/AdminMediaGroupRepairPage.tsx`

- 對應主前端頁面：`/admin/system/group-repair`
- 已接管能力：repair 清單搜尋、分頁、來源推斷、only inferable 過濾、補 source_url、edit、merge、unassign、單筆 / 批次 reparse preview / apply
- 未覆蓋項目：目前沒有明確缺少的核心修復 API 或操作鏈路
- 已知限制：merge / edit / reparse 以 Sheet / Popup 流程呈現，較適合手機逐步確認；大量結果交叉排查、鍵盤密集輸入或多視窗修復時，桌面 admin 仍較有效率

## 開發指令

```bash
cd review-app
npm install
npm run dev
```

其他常用指令：

```bash
npm run lint
npm run build
npm run preview
```

## 環境變數

`review-app` 目前主要使用以下 Vite 變數：

- `VITE_API_ORIGIN`
- `VITE_API_ROOT`
- `VITE_API_URL`

實際 API base 由 `src/lib/api.ts` 組合：

- 未設定 `VITE_API_URL` 時，會以 `VITE_API_ORIGIN + VITE_API_ROOT` 組合 API base
- `VITE_API_URL` 若有設定，會直接視為完整 API base URL 使用
- 開發環境未設定 `VITE_API_ORIGIN` 時，預設走相對路徑 `/api`
- production fallback 為 `https://api.ztmr.club/api`
- 所有請求固定帶 `credentials: 'include'`，以共用 admin session

## 結構摘要

```text
review-app/
├── src/
│   ├── components/
│   │   ├── AppNavbar.tsx
│   │   ├── Button.tsx
│   │   ├── MvSheet.tsx
│   │   ├── ReviewSummaryPanel.tsx
│   │   ├── ReviewStateBlock.tsx
│   │   └── Segmented.tsx
│   ├── contexts/
│   │   ├── AuthProvider.tsx
│   │   └── WorkspaceContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePushSubscription.ts
│   │   └── useWorkspace.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── media.ts
│   │   ├── moderation-boundaries.ts
│   │   └── workspaces.ts
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── StagingPage.tsx
│   │   ├── StagingDetailPage.tsx
│   │   ├── SubmissionsPage.tsx
│   │   ├── FanartPage.tsx
│   │   ├── FanartMediaDetailPage.tsx
│   │   ├── FanartGroupDetailPage.tsx
│   │   ├── RepairPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SettingsBoundariesPage.tsx
│   │   └── LoginPage.tsx
│   ├── App.tsx
│   ├── index.css
│   └── routes.ts
└── README.md
```

## Framework7 元件映射

- `Views`、`Toolbar/Tabbar`、`Panel`：提供手機與平板一致的工作區切換，不依賴主前端桌面 sidebar
- `Card`、`List`、`ListItem`、`Searchbar`：承載行動端高頻審核清單與篩選
- `Panel`、`Popup`、`Sheet`、頁內 route page：承接 MV / Tag 關聯、詳情、退回原因、crawler 參數、merge / edit / reparse 等需要完整上下文的操作
- `Toast`、頁內 `ReviewStateBlock`：分別處理即時操作回饋與可見的載入 / 空狀態 / 錯誤狀態
- `ReviewSummaryPanel`：壓縮各工作區頁面頂部狀態卡，減少行動端首屏占位
- `src/lib/moderation-boundaries.ts`：集中維護 review-app 與桌面 admin 的能力邊界，設定頁與跨專案文件都以此為基準同步描述

## UI / 狀態約定

- 全域樣式集中在 `src/index.css`
- 導覽列、卡片、列表、Panel、Sheet、Popup 採統一的 `review-*` class 命名
- 空狀態、錯誤狀態、載入狀態統一用 `src/components/ReviewStateBlock.tsx`
- `src/components/Button.tsx` 與 `src/components/Segmented.tsx` 是平台樣式包裝層：iOS 預設 round，MD / Android 維持普通樣式
- `src/lib/media.ts` 會優先選用 `twimg` 原始媒體網址，避免列表與詳情混用縮圖 / R2 造成來源不一致
- 多選清單優先使用 Framework7 官方 `ListItem checkbox`，避免把 checkbox 手工塞進 media slot
- 需要同列兼容勾選與查看詳情時，詳情入口統一放在右側 `詳情` 按鈕，不再依賴整列點擊
- `MvSheet` 以 Framework7 官方 iOS `left floating Panel` 呈現；取消時只關閉 panel，不改動原本列表或詳情頁的 router 狀態
- `StagingPage`、`FanartPage` 的詳情優先採頁內 push view；需要短流程補充輸入時再使用 `Popup` 或 `Sheet`
- `FanartPage` 主列表的 title / subtitle / chips / footer 有固定資訊層級：名字與 handle 同列、時間用小字短格式、MV 以 chips 顯示、長 URL 必須可斷行
- 登入頁、loading、tabbar、sheet header 盡量對齊 Framework7 v9 官方寫法，例如 `LoginScreen`、`dialog.preloader(...)`、`ToolbarPane`
- 各頁仍可保留 toast 作為即時回饋，但首次載入失敗或無資料時要顯示可見的頁面內狀態區塊
- 工作區切換與各頁篩選條件由 `WorkspaceProvider` 寫入 localStorage，鍵值為 `ztmr-review-workspace`
- `src/lib/moderation-boundaries.ts` 需要與 `CODE_WIKI.md`、`frontend-memory.md`、`docs-index.md`、`.trae/specs/companion-review-app/` 中的描述一起維護，避免接管邊界失真

## PWA 快取與自動更新策略

- 採用 `vite-plugin-pwa` + `injectManifest` 策略，自訂 `src/sw.ts`
- `registerType: 'autoUpdate'`：新版 SW 偵測到後自動 skipWaiting + 頁面 reload
- SW 內 `message` 事件監聽 `SKIP_WAITING` 訊息，是 autoUpdate 機制能正常運作的關鍵
- SW activate 時呼叫 `clientsClaim()`，確保新版 SW 立即接管所有頁面
- 每次頁面載入時透過 `registration.update()` 強制檢查 SW 更新（略過瀏覽器 24h 快取）
- `controllerchange` 事件觸發時自動 `window.location.reload()` 載入最新資源
- 快取分層：
  - precache（Workbox precache manifest）：JS/CSS/HTML/icon 等靜態資源
  - `twitter-images`（CacheFirst, 7 天, max 100 entries）：`pbs.twimg.com` 圖片
  - `api-cache`（NetworkFirst, 5 分鐘, max 50 entries）：後端 API 回應

## 互動驗證重點

- `Popup`、`Sheet`、`dialog.preloader(...)` 這類會改變遮罩與頁面狀態的互動，不能只看 build，需在瀏覽器實際點開再關閉一次
- `MvSheet` 相關鏈路至少要驗證 `列表或詳情 -> 關聯 / 更新關聯 -> 取消`，確認 panel 動畫、左側留白與返回狀態都正確
- `StagingPage` 的 `詳情 -> 通過並關聯 MV/Tag` 需驗證可只選特殊標籤、不選 MV 仍能完成通過
- `StagingPage`、`RepairPage` 的勾選清單要同時驗證 checkbox 可點、右側 `詳情` 可開、swipeout 操作不互相搶事件
- `SubmissionsPage`、`FanartPage` 等詳情型列表，需確認右側 `詳情` 按鈕不會污染 router / hash 狀態
- 若要在本機用 `localhost` 驗證登入流程，開發環境可配合 `VITE_API_ROOT=/api` 使用 `vite.config.ts` 內的 proxy 設定

## 驗證要求

對 `review-app` 的 UI / 互動改動，至少應執行：

```bash
npm run lint
npm run build
```

若改動牽涉 layout、狀態切換、Panel / Sheet / Popup / push view、列表滾動或行動端互動，建議再用瀏覽器做一次實際點擊驗證。
