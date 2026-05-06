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
2. 呼叫後檢查 `processedImages.length` 是否已增加（React 可能在 await 期間完成狀態更新）
3. 若已增加，直接從新資料中載入下一批圖片並更新 `hasMore`
4. 若尚未增加，透過 `externalDataReadyRef` 註冊一個 Promise resolve，等待 `processedImages.length` 變化時由 `useEffect` 觸發 resolve（最長等待 3 秒超時）
5. 所有載入操作都有去重保險（以 `originalUrl` 或 `full` 為 key），避免重複顯示

**為什麼需要 `externalDataReadyRef`：**
`onExternalLoadMore()` 是非同步的，呼叫後 `processedImages` 不會立即更新。如果直接嘗試讀取新圖片，會拿到舊資料導致顯示空白。透過 ref + `useEffect` 監聽 `processedImages.length` 變化的機制，確保新資料到達後才進行渲染。相比舊的 `pendingExternalLoadRef` 輪詢方案，新方案使用事件驅動的方式，更可靠且不會因 React 批處理時序問題而遺漏更新。

---
*備註：如果你在維護時發現排版又被撐開了，請優先檢查是否有新的外掛或組件（例如 Waline 評論）在最外層使用了 `flex` 且沒有加上 `min-w-0` 的束縛。*
