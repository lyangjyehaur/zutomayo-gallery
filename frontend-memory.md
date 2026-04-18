# Frontend Memory

這個檔案用於記錄跨對話的前端專案狀態、技術細節與待辦事項。請在每次新的對話開始時，指示 AI 讀取此檔案以獲取上下文。

## 🛠️ 技術棧 (Tech Stack)
- **核心框架**: React 18 + Vite + TypeScript
- **路由管理**: React Router v6
- **樣式與 UI**: 
  - Tailwind CSS v4
  - shadcn/ui (Radix UI 基礎) + `tailwindcss-animate`
- **資料獲取與狀態**: SWR
- **特色功能套件**:
  - 畫廊/燈箱: `@fancyapps/ui` (Fancybox), `lightgallery`
  - 瀑布流排版: `react-masonry-css`, `masonry-layout`
  - 評論系統: `@waline/client`
  - 密碼學/認證: `@simplewebauthn/browser`
  - PWA 支援: `vite-plugin-pwa`, `workbox-window`
- **測試**: Vitest + React Testing Library

## 📂 核心目錄結構 (Directory Structure)
- `frontend/src/components/ui/` - shadcn/ui 基礎通用元件
- `frontend/src/components/` - 業務邏輯元件 (如 `MVCard`, `FancyboxViewer` 等)
- `frontend/src/pages/` - 路由對應的頁面視圖 (如 `AdminPage`, `DebugGallery` 等)
- `frontend/src/hooks/` - 自定義 Hooks (如 `useGeoLabel`, `useLazyImage`)
- `frontend/src/lib/` - 工具函式 (如 `utils.ts`, `image.ts`, `geo.ts`)
- `frontend/src/config/` - 專案靜態設定檔 (`albums.ts`, `storage.ts` 等)

## 🆕 最近更新 (Recent Updates)
- **篩選列響應式優化**: 修正篩選列的響應式斷點 (Layout breakpoints)，確保不同螢幕尺寸下顯示正常。
- **動畫效能修復**: 解決瀏覽器分頁切換至背景 (Tab inactive) 時導致的動畫堆疊問題。
- **Waline 留言板樣式**: 自訂並覆寫 Waline 留言板樣式，使其無縫融入專案主題。
- **Modal 路由與滾動狀態**: 修復 Modal 的路由攔截機制以及開關時的頁面滾動狀態 (Scroll state) 異常問題。

## 📌 目前開發狀態與已知問題 (Current Status & Known Issues)
*(在此記錄目前正在進行的開發任務、尚未解決的 Bug 或遇到的技術瓶頸)*
- [待補充]

## 📝 開發規範 (Guidelines)
1. **型別安全**: 優先使用 TypeScript，避免使用 `any`，並確保 Props 與 State 有明確定義。
2. **UI 構建**: 優先使用 `src/components/ui` 中的 shadcn 元件以及 Tailwind CSS 進行樣式設計。
3. **效能優化**: 圖片相關渲染應注意使用 Lazy Loading（搭配 `useLazyImage`）以優化載入效能。
4. **狀態管理**: API 請求優先使用 `SWR` 以利用其快取與重新驗證機制。

## ✅ 待辦事項 (TODOs)
*(在此記錄接下來計畫開發的功能或重構目標)*
- [ ] [待補充]
评论样式覆盖 
caption最大高度
燈箱樣式覆蓋
mono字體 
model 標題 收藏
modal 關鍵字
- [x] 報錯界面按鈕 (已修正重試按鈕的 Hover 抬起問題，改為按壓效果)
- [x] 躍遷tooltip (已修正移動端 footer geo 標籤的 touch 事件呼出 tooltip，不影響桌面端 hover)
星級調查反饋
select lang


