# 瀑布流與 Fancybox 燈箱系統架構與重構指南

這份文件詳細記錄了 `FancyboxViewer.tsx` 中關於響應式瀑布流（Masonry Layout）與燈箱（Fancybox）的核心邏輯與歷史重構原因。在開發或維護這塊功能時，請務必先閱讀此文件，避免踩到常見的效能與排版地雷（特別是 Safari 上的 Bug）。

## 1. 為什麼不使用純 CSS (column-count) 實作瀑布流？

在一般的瀑布流實作中，使用純 CSS 的 `column-count` 是最簡單的。但我們 **不能** 這麼做。

**原因：**
純 CSS 的 `column-count` 排列順序是 **「從上到下，再從左到右」**（直向閱讀）。
然而，當使用者點擊圖片打開 Fancybox 燈箱時，燈箱內的切換順序（上一張 / 下一張）是基於陣列索引，也就是 **「從左到右，再從上到下」** 的時間軸順序。
如果使用 CSS 分欄，使用者在網格上看到的圖片順序，會與燈箱內左右滑動的順序**完全對不上**。

**解法：**
我們必須透過 JavaScript（在 `distributeChildren` 中）將圖片陣列依照 `index % columnCount` 的規則，手動分發到不同的「欄位 (Column)」陣列中，以保證視覺順序與底層陣列順序完全一致。

---

## 2. 佈局撐爆 (Blowout) 問題與 Grid 鎖死防護

當我們使用 JS 將圖片分發到多個欄位時，最外層容器的寬度計算就變得極其重要。

**過去的慘痛教訓：**
過去使用 Flexbox (`flex-1`) 來分配每欄寬度。但在 Modal 剛打開、圖片原始尺寸（可能高達 2000px）尚未完全載入時，Flexbox 會試圖根據圖片的「內生寬度 (Intrinsic Width)」給予該欄位更多空間。這會導致在 Safari 與 Chrome 剛開啟 Modal 的瞬間，整個彈窗被無限撐寬，直到觸發滾動或重繪才會縮回正常尺寸。

**終極防護架構（現在的實作）：**
我們改用 **CSS Grid** 來強制接管並鎖死寬度分配，完全切斷子元素對欄位寬度的影響。

```tsx
// 核心防護代碼
<div 
  className={`grid items-start gap-2 md:gap-3 ${className}`}
  style={{ gridTemplateColumns: `repeat(${columnCount || 1}, minmax(0, 1fr))` }}
>
  {columns.map((columnChildren, index) => (
    <div key={index} className="flex flex-col gap-2 md:gap-3 min-w-0 w-full overflow-hidden">
      {columnChildren}
    </div>
  ))}
</div>
```

**關鍵防護點：**
1. `gridTemplateColumns: repeat(N, minmax(0, 1fr))`：`minmax(0, 1fr)` 裡的 `0` 是精髓，它允許欄位寬度收縮到 0，強制所有欄位絕對等寬，不受內部超大圖片影響。
2. `items-start`：阻止不同高度的欄位互相拉扯撐高（覆蓋 `stretch` 預設值）。
3. `min-w-0 w-full overflow-hidden`：在每一個 Column 加上這層束縛，強制截斷任何試圖突破欄位寬度的圖片。

---

## 3. 視窗縮放 (Resize) 與重排效能優化

當視窗寬度改變觸發分欄數變更時（例如從 4 欄變成 3 欄），React 會將圖片元件從舊的 Column 卸載並重新掛載 (Remount) 到新的 Column 裡。

為了避免這個過程造成嚴重的效能問題與畫面閃爍，我們做了以下優化：

### A. 全域快取 (`loadedImagesCache` & `dimensionCache`)
- 圖片重新掛載時，不需要重新觸發 `onLoad` 與動畫。
- 元件初始化時會檢查快取，如果圖片已經載入過，會直接以 `isLoaded: true` 與已知長寬比渲染，防止網格高度塌陷。

### B. 動畫隔離 (`isNewItem`)
- 只有「新載入 (Load More)」的圖片才會有 `animate-in slide-in-from-bottom` 飛入動畫。
- 已經在畫面上的圖片在因為 resize 重排時，不會再次觸發飛入動畫，保持視覺穩定。

### C. 降頻與非阻塞事件 (`requestAnimationFrame` + `passive`)
- 視窗的 `resize` 事件監聽器標記為 `{ passive: true }`，確保不阻塞瀏覽器原生滾動與繪製。
- 結合 `setTimeout` (150ms 防抖) 與 `requestAnimationFrame`，確保 React 的重排運算完美對齊瀏覽器的下一次繪製週期，消除畫面撕裂。

### D. 無效更新阻斷 (State Bailout)
- 在無限滾動加載圖片合併陣列時，如果新加載的圖片已經存在於陣列中，直接 `return prev`。
- 這會觸發 React 的 Bailout 機制，中斷整個瀑布流的 Re-render，節省巨量虛擬 DOM 比對成本。

---

## 4. 動態 Breakpoint 解析

不要在 `getColumnCount` 裡寫死 `1024`, `768` 等斷點。
現在的邏輯會動態提取傳入的 `breakpointColumns` 物件的 keys，自動排序並比對 `window.innerWidth`，確保任何自訂的響應式設定都能精準生效。

---

## 5. Fancybox 的特殊處理
- **Native Caption 關閉**：我們透過 `Caption: false` 完全停用了 Fancybox 原生的說明文字系統，改用自訂的 `FancyboxCaptionOverlay`（React Portal），以支援多語系、自訂 UI（Cyberpunk 風格）與富文本渲染。
- **Z-Index 戰爭**：請注意 `.fancybox__container` 的 z-index 設定為 `100000 !important`，以確保它能覆蓋全站包含 MV Modal 的所有層級。
- **影片與圖片混排**：透過動態判斷網址後綴或網域，將 `type` 動態設定為 `'html5video'` 或 `'image'`，讓 Fancybox 能夠無縫處理影片的直接播放。

## 6. 外部資料載入（Server-side Pagination）

FancyboxViewer 支援從外部伺服器分頁載入資料，主要用於 FanArt 畫廊等大量圖片場景。

**相關 Props：**
- `externalHasMore`：伺服器是否還有更多資料
- `onExternalLoadMore`：外部載入更多的回呼函數
- `total`：伺服器回傳的總數，用於「載入更多」按鈕顯示（如 `20 / 500`）

**外部載入流程：**
1. 當 `processedImages` 全部顯示完畢（`!hasMore`）但 `externalHasMore` 為 true 時，點擊「載入更多」會呼叫 `onExternalLoadMore()`
2. 呼叫後透過 `displayedCountRef` 檢查已顯示數量是否小於 `processedImagesRef.current.length`
3. 若已顯示數量 ≥ 當前 processedImages 長度（新資料尚未到達），透過 `externalDataReadyRef` 註冊一個 Promise resolve，等待 `processedImages.length` 變化時由 `useEffect` 觸發 resolve（最長等待 5 秒超時）
4. 等待完成後，使用 `getPhotosFromRangeRef.current` 從新資料中載入下一批圖片並更新 `hasMore`
5. 所有載入操作都有去重保險（以 `originalUrl` 或 `full` 為 key），避免重複顯示

**為什麼需要 `externalDataReadyRef`：**
`onExternalLoadMore()` 是非同步的，呼叫後 `processedImages` 不會立即更新。如果直接嘗試讀取新圖片，會拿到舊資料導致顯示空白。透過 ref + `useEffect` 監聽 `processedImages.length` 變化的機制，確保新資料到達後才進行渲染。相比舊的 `pendingExternalLoadRef` 輪詢方案，新方案使用事件驅動的方式，更可靠且不會因 React 批處理時序問題而遺漏更新。

**閉包穩定性設計（v2 修復）：**
`loadMore` 函數使用 `loadingMoreRef` 和 `hasMoreRef` 進行守衛檢查，而非直接讀取 `loadingMore` / `hasMore` state。這是因為：
- `loadMore` 在執行過程中會呼叫 `setLoadingMore(true)`，如果 `loadingMore` 在依賴數組中，會導致函數立即重建，可能使用過時的閉包值
- `hasMore` 在外部載入路徑中會被更新，如果作為依賴項，也會導致不必要的函數重建和 IntersectionObserver 重啟
- 改用 ref 追蹤最新值，state 僅用於 UI 渲染（按鈕狀態、載入指示器），確保邏輯控制不受 React 重渲染影響
- 依賴數組從 `[externalHasMore, getPhotosFromRange, hasMore, itemsPerPage, loadingMore, onExternalLoadMore, processedImages.length]` 精簡為 `[externalHasMore, getPhotosFromRange, itemsPerPage, onExternalLoadMore, processedImages.length]`

**使用場景與影響範圍：**
FancyboxViewer 在以下場景中使用，修改均向後相容：
- **FanArtPage**：使用 `externalHasMore` + `onExternalLoadMore`，走外部載入路徑（本次修復的核心場景）
- **MVDetailsModal**：僅使用內部載入路徑（`autoLoadMore` 由 Admin 控制），不受外部載入邏輯影響
- **IllustratorDetailsModal**：僅使用內部載入路徑（`autoLoadMore=false`），不受影響
- **DebugFancyboxMasonry**：僅使用內部載入路徑，不受影響

---

## 7. 圖片文本標注系統 (Image Annotation System)

### A. 技術選型：手動 DOMMatrix 坐標變換

Fancybox 的 `@fancyapps/ui` 套件內建 **Pins 插件**，但經實測發現 Fancybox 內部在建立 Panzoom 實例時，**不會將第三個 `plugins` 參數傳遞給 Panzoom 建構式**，因此 `Pins: true` 配置無法生效。

**解決方案：** 採用手動實現 Pins 插件的核心算法——直接複製其 `DOMMatrix` + `DOMPoint` 坐標變換邏輯，監聽 Panzoom 的 `render` 事件來更新 pin 位置。

**核心優勢：**
- **零額外依賴**：僅使用瀏覽器原生 `DOMMatrix` / `DOMPoint` API
- **精確坐標變換**：與 Pins 插件使用完全相同的算法，確保在任意縮放比例與平移偏移下，標注點都能精準定位
- **完全可控**：不受 Fancybox 內部 Panzoom 初始化流程的限制

### B. 整合方式

**手動注入 Pin 元素 + 監聽 render 事件：**

1. 在 Fancybox 的 `ready` 事件中，對初始 slide 執行 `injectAnnotationPins`
2. 在 Carousel 的 `change` 事件中，對切換後的新 slide 執行 `injectAnnotationPins`
3. `injectAnnotationPins` 內部會：
   - 清理舊 pin 元素及其事件監聽器
   - 為每個標注創建 `.f-panzoom__pin` DOM 元素並注入到 Panzoom wrapper
   - 監聽 Panzoom 的 `render` 事件，在每次縮放/平移後重新計算 pin 位置
4. 在 Fancybox 的 `close` 事件中提前移除所有 pin 元素，避免關閉動畫期間 pin 跟著縮放位移

```tsx
// render 事件回調中更新 pin 位置
const renderFn = () => renderPins(slide.panzoomRef, pins);
slide.panzoomRef.on('render', renderFn);
```

**清理策略：**
- Slide 切換時：移除舊 pin 元素，用 `cloneNode` 替換帶事件監聽器的子元素以釋放閉包引用
- Fancybox `close` 事件：提前移除所有 pin，避免關閉動畫中 pin 異常位移
- Fancybox `destroy` 事件：保險性清理，確保無殘留

### C. 坐標系統

標注坐標使用 **百分比坐標系 (0%–100%)**，具有以下特性：

- **左上角為原點 (0%, 0%)**，右下角為 (100%, 100%)
- **與圖片解析度無關**：無論圖片原始尺寸或顯示尺寸如何變化，百分比坐標始終指向相同的相對位置
- 這與 Pins 插件內部的坐標變換機制完全一致，`DOMMatrix` + `DOMPoint` 的計算基於元素的相對比例而非絕對像素

### D. 標注 UI

標注的視覺設計分為兩個部分：**標記點 (dot)** 與 **文本標籤 (label)**。

**DOM 結構：**
```
.f-panzoom__pin.ztmy-annotation-pin (pointer-events: none)
└── .ztmy-annotation-marker (pointer-events: none)
    ├── .ztmy-annotation-dot (pointer-events: auto, cursor: help, data-annotation)
    │   └── ::before (擴大點擊熱區至 32×32px)
    └── .ztmy-annotation-label (pointer-events: auto, cursor: help, data-annotation)
```

**標記點 (dot)：**
- 主題色圓點 + 霓虹光暈效果（`box-shadow` + `color-mix` 實現）
- 使用 `::before` 偽元素擴大可點擊熱區（視覺 12px，熱區 32px）
- label 隱藏時加入 `--pulse` class，觸發發光閃爍動畫提示用戶可點擊恢復

**文本標籤 (label)：**
- 黑底白字樣式，支援換行（`white-space: pre-line`）
- 後台使用 Textarea 輸入，前台保留換行顯示
- 使用 `clip-path: inset(0 100% 0 0)` 實現收起動畫（不影響佈局）

**交互行為：**
- 點擊 dot：切換 label 顯示/隱藏
- 點擊 label：隱藏 label
- label 隱藏後：dot 開始閃爍動畫，提示用戶可點擊恢復
- label 隱藏後：label 和 marker 區域的 pointer-events 穿透到 panzoom 層，游標正確顯示為 Move

**自定義游標整合：**
- dot 和 label 設有 `data-annotation` 屬性
- CustomCursor 組件中優先檢查 `[data-annotation]`，映射為 Help 游標
- 此判斷優先級高於 Fancybox 的 Move 游標攔截

**Cover 圖片過濾：**
- 標注功能僅針對畫廊圖片（`usage !== 'cover'`）
- 後台 AdminAnnotationsPage 的 `mediaItems` 和 `loadAnnotations` 均已過濾 cover 圖片
- 前台 MVDetailsModal 的 `galleryImages` 已過濾 cover 圖片，標注不會出現在封面圖上

### E. 數據流

標注數據從後端到前端渲染的完整流動路徑：

```
後端 MV API (v2_mapper: MediaAnnotationModel include with separate: true)
  → MVMedia.annotations
    → PhotoData.annotations
      → annotationsMap (Map<number, MediaAnnotation[]>)
        → injectAnnotationPins(fancybox, annMap)
```

**`annotationsMap` 的設計：**
- 類型為 `Map<number, MediaAnnotation[]>`
- Key 為 slide index（對應 Fancybox Carousel 中的 slide 索引）
- 在 Fancybox 開啟前由前端根據 `PhotoData.annotations` 建構完成
- 切換 slide 時，以 O(1) 查詢當前 slide 的標注數據

### F. 效能考量

- **單張圖片標注數量預計不超過 10-20 個**，DOM 開銷極小
- `renderPins` 使用 `DOMMatrix` + `DOMPoint` 原生 API 計算，效能優秀
- 採用懶載入策略：僅載入當前可見 slide 的標注 pin 元素
- 事件監聽器在 slide 切換時通過 `cloneNode` 替換方式清理，避免閉包引用導致的記憶體洩漏
- `annotationsMap` 使用 `useMemo` 快取，僅在 `displayedPhotos` 變更時重建

### G. 注意事項

- **影片 slide 不渲染標注**：`injectAnnotationPins` 會跳過 `type === 'html5video'` 的 slide
- **無標注數據時行為不變**：`annotationsMap.get(slideIndex)` 回傳空陣列時直接 return
- **Pins: true 配置無效**：Fancybox 不傳遞 `plugins` 參數給 Panzoom 建構式，必須手動實現坐標變換
- **PostgreSQL DECIMAL 返回字串**：後端 `x`/`y` 欄位為 DECIMAL 類型，Sequelize 返回字串，前端需用 `Number()` 轉換
- **MVService 記憶體快取**：標注寫入時需同時清除 Redis 快取和 `mvService.clearCache()`，否則前台無法即時看到更新

---

## 8. 圖片分享與 URL Hash 系統

### A. 概述

每張圖片在 Fancybox 燈箱中都可透過點擊「分享」按鈕複製一個帶有 hash 錨點的唯一 URL。其他使用者造訪該 URL 時，系統會自動解析 hash、定位對應圖片並打開燈箱。

URL 格式：`https://zutomayo.com/mv/{mv-slug}#img-{photoId}`

### B. 技術實現

**Hash 寫入（Carousel.change）：**
當使用者在燈箱中切換圖片時，`Carousel.ready Carousel.change` 事件處理器會讀取當前 slide 的 `mediaId`（即 `photo.id`），並透過 `window.history.replaceState` 更新 URL hash。不使用 `pushState` 以避免產生大量瀏覽器歷史記錄。

```tsx
const newHash = `#${FANCYBOX_HASH_PREFIX}${slideMediaId}`;
if (window.location.hash !== newHash) {
  window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
}
```

**Hash 解析（頁面載入時自動打開）：**
`FancyboxViewer` 掛載後，`useEffect` 會檢查 URL hash。若 hash 符合 `#img-{id}` 格式，會在 `displayedPhotos` 中搜尋對應圖片：
- 找到 → 自動打開燈箱並定位到該圖片
- 未找到 → 顯示「圖片不存在」toast，同時清除 URL hash

**Hash 清除（燈箱關閉）：**
Fancybox `close` 事件中清除 URL hash，恢復乾淨的頁面 URL。

### C. 複製到剪貼簿（`lib/clipboard.ts`）

分享按鈕點擊後，系統需要將完整 URL 複製到使用者剪貼簿。由於不同環境（HTTPS/HTTP、localhost/區域網IP、Mac/Windows）對剪貼簿 API 的支援差異極大，採用 **漸進式降級策略**：

```
Path 1: navigator.clipboard.writeText()  ← 安全上下文 (HTTPS/localhost)
  ↓ 不可用或失敗
Path 2: execCommand('copy')              ← 非安全上下文的 fallback
```

**Path 2 的關鍵設計（Windows 相容性）：**
早期實作使用 `<textarea>` + `document.body.appendChild`，但在 Fancybox 燈箱內無法正常工作。原因是 Fancybox 有焦點鎖定機制，附加到 `document.body`（燈箱外部）的元素會在 `focus()` 後被立即奪回焦點。Windows Chrome 對此更加嚴格，導致 `execCommand('copy')` 返回 `true` 但剪貼簿實際為空。

**最終方案：**
- 使用 `<div contentEditable>` 取代 `<textarea>`，內容透過 `textContent` 設置
- 元素掛載到 `.fancybox__container` 內部（燈箱焦點鎖定範圍內），fallback 為 `document.body`
- 使用 `Range.selectNodeContents()` + `Selection.addRange()` 精確控制選取範圍
- 元素樣式：`1px × 1px`、`opacity: 0.01`（技術上可見，滿足 execCommand 要求）、`z-index: 99999`、`pointer-events: none`

### D. 分享 URL 的路徑清理

分享的 URL 需要移除語言前綴（如 `/zh-TW/`），確保接收者以自己的語言偏好瀏覽：

```tsx
const pathParts = window.location.pathname.split('/');
if (pathParts.length > 1 && isSupportedLang(pathParts[1])) {
  cleanPath = '/' + pathParts.slice(2).join('/');
} else {
  cleanPath = window.location.pathname;
}
const url = window.location.origin + cleanPath + `#img-${photoId}`;
```

### E. 後端資料完整性（`metadata.service.ts`）

畫師頁面的「綜合插畫」（collaborations）圖片資料來自 `media` 表。早期後端 API 在組裝回應時遺漏了 `media.id` 欄位，導致前端 `photoId` 為 `undefined`，hash 無法生成。

**修復：** 在 `getMetadata()` 的 collaborations 映射中加入 `id: media.id`。

### F. 語言重定向時的 Hash 保留（`App.tsx`）

所有 `Navigate` 元件在執行語言重定向時，必須保留 `location.hash`，否則使用者在帶有 `#img-{id}` 的 URL 造訪時，hash 會在重定向過程中被丟棄：

```tsx
<Navigate replace to={`/${targetLng}${path}${location.hash}`} />
```

涉及 6 處 `Navigate` 呼叫。

### G. i18n 覆蓋

分享功能新增 5 個 i18n key，已涵蓋全部 8 個語言（zh-TW、zh-CN、zh-HK、ja、ko、en、es）：

| Key | 用途 |
|-----|------|
| `app.share_image` | 分享按鈕預設文字 |
| `app.copy_link_success` | 複製成功 toast |
| `app.copy_link_failed` | 複製失敗 toast |
| `app.image_not_found` | 圖片不存在 toast |
| `app.copied` | 分享按鈕複製成功後的文字 |

---
*備註：如果你在維護時發現排版又被撐開了，請優先檢查是否有新的外掛或組件（例如 Waline 評論）在最外層使用了 `flex` 且沒有加上 `min-w-0` 的束縛。*
