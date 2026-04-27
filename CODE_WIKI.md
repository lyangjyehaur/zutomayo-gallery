# ZUTOMAYO Gallery - 專案 Code Wiki

這份文件提供了 `zutomayo-gallery` 專案的全面技術解析，涵蓋了整體架構、目錄結構、模組職責、關鍵函數與資料流。

## 1. 專案整體架構 (Overall Architecture)

本專案是一個展示 ZUTOMAYO (永遠是深夜有多好。) MV 設定圖的線上畫廊，並附帶強大的後台管理系統。
專案採用**前後端分離 (Client-Server Architecture)** 的設計：

*   **前端 (Frontend)**: 基於 React 18 + TypeScript，使用 Vite 作為建構工具。UI 樣式使用 Tailwind CSS 4.0 搭配 shadcn/ui 打造獨特的 Neobrutalism（新粗野主義）風格。具備 PWA 支援、多語言 (i18n)、以及複雜的瀑布流畫廊與燈箱展示功能。
*   **後端 (Backend)**: 基於 Node.js + Express + TypeScript。使用 `better-sqlite3` 作為本地資料庫引擎，並實作了基於記憶體的 Runtime Cache 提升讀取效能。支援 WebAuthn (Passkeys / 通行密鑰) 無密碼登入。
*   **部署模式**: 支援靜態分離部署 (如前端部署於 Vercel，後端部署於 VPS)，或透過 Nginx 反向代理的整合部署。

---

## 2. 專案目錄結構 (Project Structure)

```text
zutomayo-gallery/
├── frontend/                      # 前端 React 應用程式
│   ├── src/
│   │   ├── components/            # React 共用組件 (含 shadcn/ui)
│   │   │   ├── ui/                # 基礎 UI 元件庫
│   │   │   ├── MVCard.tsx         # 畫廊列表的單一 MV 卡片
│   │   │   └── MVDetailsModal.tsx # MV 詳情與影片播放彈窗
│   │   ├── config/                # 靜態設定檔 (如相簿分類、Storage Key)
│   │   ├── hooks/                 # 自定義 React Hooks (如 useLazyImage)
│   │   ├── lib/                   # 工具函數 (Image Proxy, Geo, 類型定義)
│   │   ├── locales/               # i18n 多國語言翻譯檔
│   │   ├── pages/                 # 獨立頁面 (AdminPage, NotFoundPage)
│   │   ├── App.tsx                # 主應用程式與路由佈局
│   │   └── main.tsx               # 前端程式進入點
│   ├── index.html                 # HTML 模板
│   └── vite.config.js             # Vite 建構設定
│
├── backend/                       # 後端 Node.js 應用程式
│   ├── data/                      # SQLite 資料庫存放位置 (database.sqlite)
│   ├── src/
│   │   ├── controllers/           # API 路由控制器 (處理 Request/Response)
│   │   ├── middleware/            # Express 中介軟體 (限流、錯誤處理)
│   │   ├── routes/                # Express 路由定義
│   │   ├── services/              # 核心業務邏輯 (資料庫存取、認證)
│   │   ├── validators/            # Zod 資料驗證器
│   │   └── index.ts               # 後端程式進入點
│   └── package.json               # 後端依賴管理
│
└── deploy.sh                      # 伺服器自動化部署腳本
```

---

## 3. 主要模組職責 (Main Modules & Responsibilities)

### 🎨 前端模組 (Frontend)

*   **核心佈局與路由 (`App.tsx`)**: 
    作為應用的主入口，負責獲取資料、管理全局狀態（搜尋關鍵字、過濾條件、排序方式）。透過 `IntersectionObserver` 實作無限滾動 (Infinite Scroll) 來渲染 MV 卡片。
*   **畫廊與燈箱展示 (`FancyboxViewer.tsx`, `MVDetailsModal.tsx`)**:
    *   `MVDetailsModal`: 點擊 MV 卡片後彈出的 Modal，整合了 YouTube / Bilibili 雙平台的影片 iframe 播放器，並能根據客戶端 IP (中國大陸與否) 自動切換預設播放源。
    *   `FancyboxViewer`: 負責將 MV 的「設定圖/插畫」以瀑布流 (Masonry) 佈局呈現，點擊圖片會啟動全螢幕燈箱。
*   **特效元件 (`CoverCarousel` in `MVCard.tsx`)**:
    為了解決列表圖片單調的問題，實作了包含 Glitch (故障)、VHS、Scan-wipe (掃描線擦除) 等隨機過場特效的圖片輪播元件。
*   **資料獲取與快取**: 
    使用 `useSWR` 進行 API 資料的請求與客戶端快取，避免頻繁發送網路請求。
*   **國際化 (i18n)**:
    整合 `react-i18next`，根據 URL 路由 (例如 `/zh-TW/`, `/ja/`) 或瀏覽器語言自動切換介面文字。

### ⚙️ 後端模組 (Backend)

*   **MV 資料管理 (`mv.controller.ts`, `mv.service.ts`)**:
    負責處理前端的資料請求。`MVService` 實作了一層 Runtime Cache (將 SQLite 資料預先載入記憶體)，大幅提升讀取效能。支援全量更新與部分更新，並自動將 JSON 陣列與 SQLite 的字串欄位進行序列化/反序列化。
*   **無密碼認證 (`auth.controller.ts`, `auth.service.ts`)**:
    整合 `@simplewebauthn/server`，允許管理員使用裝置的生物辨識或通行密鑰 (Passkeys) 進行登入，無需輸入傳統密碼。
*   **資料庫服務 (`db.service.ts`)**:
    封裝 `better-sqlite3`。負責初始化 SQLite 檔案，並具備**自動遷移 (Auto-migration)** 能力：啟動時若發現 `mvs` 表缺少欄位，會自動執行 `ALTER TABLE` 補齊。
*   **推文媒體解析 (`twitter.service.ts`)**:
    供管理後台使用的輔助功能，能解析 Twitter (X) 連結並自動提取其中的圖片與影片資源。

---

## 4. 關鍵類別與函數說明 (Key Classes & Functions)

### 前端關鍵函數
*   `useLazyImage()` (in `frontend/src/hooks/useLazyImage.ts`):
    自定義 Hook，透過 `IntersectionObserver` 偵測元素是否進入可視範圍。用於 MV 卡片的進場動畫與圖片的延遲加載 (Lazy Loading)，優化首屏渲染效能。
*   `CoverCarousel` (in `frontend/src/components/MVCard.tsx`):
    一個複雜的 React 記憶化元件 (`React.memo`)。內部使用了多個 `setTimeout` 與 `requestAnimationFrame` 來隨機觸發圖片切換與 CSS 濾鏡動畫，並監聽系統的 `prefers-reduced-motion` 屬性以適應無障礙需求。
*   `App.tsx` 內的 `filteredData` (useMemo):
    前端的核心過濾引擎。每次 `mvData`、搜尋字詞 (`search`)、或標籤 (`yearFilter`, `albumFilter`, `artistFilter`) 變更時，會重新計算並排序出應顯示的 MV 列表。

### 後端關鍵函數
*   `initDB()` (in `backend/src/services/db.service.ts`):
    建立 SQLite 連線並啟用 `WAL` (Write-Ahead Logging) 模式以提升併發效能。執行 `CREATE TABLE IF NOT EXISTS` 並動態檢查表結構 (`PRAGMA table_info`) 以進行結構同步。
*   `MVService.updateAllMVs()` (in `backend/src/services/mv.service.ts`):
    接收前端 Monaco Editor 送來的 JSON 資料，進行資料庫寫入。
    使用 `db.transaction()` 保證資料寫入的原子性。會自動將物件中的 `album`, `coverImages`, `keywords` 等陣列屬性 `JSON.stringify` 後存入 SQLite。寫入成功後，即時更新 `runtimeData` 記憶體快取。
*   `probeImage()` (in `backend/src/controllers/mv.controller.ts`):
    利用 `probe-image-size` 套件，在不下載完整圖片的情況下，讀取遠端圖片的標頭 (Header) 以獲取圖片的寬高尺寸。這對於前端瀑布流佈局的預先佔位非常重要。

---

## 5. 依賴關係 (Dependencies)

### 前端 (Frontend)
*   **UI 框架**: `react` (18.3.1), `react-dom`
*   **路由與狀態**: `react-router-dom` (6.22), `swr` (2.4)
*   **樣式與組件**: `tailwindcss` (4.0), `shadcn/ui` (Radix UI)
*   **視覺展示**: `@fancyapps/ui` (6.1), `lightgallery` (2.9), `masonry-layout`
*   **認證與編輯**: `@simplewebauthn/browser` (WebAuthn), `@monaco-editor/react` (程式碼編輯器)
*   **多語言**: `i18next`, `react-i18next`

### 後端 (Backend)
*   **伺服器框架**: `express` (4.19), `cors`, `helmet` (資安防護)
*   **資料庫**: `better-sqlite3` (12.9)
*   **認證與安全**: `@simplewebauthn/server` (13.3), `bcrypt`, `express-rate-limit` (防刷機制)
*   **資料驗證**: `zod`
*   **工具**: `probe-image-size` (獲取遠端圖片尺寸), `geoip-lite` (IP 地理位置解析)

---

## 6. 專案運作方式與資料流 (Data Flow)

### 1. 頁面初始化與資料讀取 (Read Flow)
1. 使用者訪問網站，React 載入並執行 `App.tsx`。
2. `useSWR` 發送 GET 請求至 `/api/mvs`。
3. 後端 `mv.controller.ts` 接收請求，呼叫 `MVService.getAllMVs()`。
4. `MVService` 檢查記憶體中是否有 `runtimeData` 快取。若有則直接返回；若無，則查詢 SQLite `mvs` 表，將字串反序列化為 JSON，存入快取並返回。
5. 前端接收資料後，經過本地過濾器，渲染出瀑布流卡片。

### 2. 後台資料更新 (Write Flow)
1. 管理員進入 `/admin/db`，系統會先呼叫 `/api/auth/generate-authentication-options` 進行 Passkey 驗證。
2. 驗證通過後，管理員在 Monaco Editor 中修改 JSON 資料，點擊儲存。
3. 前端發送 POST 請求至 `/api/mvs/update`。
4. 後端透過 `zod` 進行嚴格的格式驗證 (`validateMVs`)。
5. 驗證通過後，`MVService` 開啟 SQLite Transaction，執行 `DELETE` 與 `INSERT OR REPLACE`，完成資料持久化。
6. 更新 `runtimeData` 快取，並回傳成功訊息給前端。

### 3. 多媒體資源加載策略
*   本專案**不**直接在伺服器儲存大量的原圖檔案。圖片的 URL 大多指向外部圖床或社群媒體 (如 Twitter)。
*   為了解決跨域 (CORS) 或防盜鏈 (Hotlink protection) 的問題，前端使用了 `getProxyImgUrl` 函數，將圖片 URL 透過反向代理伺服器 (Image Proxy) 進行轉發載入。所有請求皆透過後端 `/api/system/image/proxy` 進行安全簽名。
*   影片播放則透過 YouTube 或 Bilibili 的官方 iframe API 進行嵌入，並根據使用者的 IP 自動選擇最適合的連線來源。