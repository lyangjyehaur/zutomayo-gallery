# 垂直時間軸進度條同步實作計畫

## 1. 狀態分析 (Current State Analysis)
目前在 `AppleMusicTimeline.tsx` 中，已經有垂直背景線與進度線的 DOM 結構，且有透過 `scroll` 事件計算進度並寫入 `--scroll-percent` 的邏輯。
但目前的計算方式存在偏差：
- `scrolled` 與 `totalHeight` 是基於外層 `containerRef` 的 `getBoundingClientRect()` 計算。
- 外層容器帶有 `py-12` (上下各 48px 的 padding)，且背景線段本身有 `bottom-12` 的位移。
- 這導致進度條的最大高度與外層容器的高度不一致，進度 100% 時無法精準對齊，且進度線的尖端無法完美貼合畫面的基準點（畫面中央）。

## 2. 實作步驟 (Proposed Changes)
我們將修正進度計算邏輯，讓進度線精準貼合背景線的實際物理高度，從而實現完美的實時同步效果：

1. **加入精準的參考點 (Ref)**
   - 在 `AppleMusicTimeline` 元件中，為底層深色背景線（軌道）加上 `lineRef`。
   - 將 `lineRef` 作為 props 傳遞給 `TimelineOverlay` 元件。

2. **修正滾動計算邏輯 (Scroll Calculation)**
   - 在 `TimelineOverlay` 的 `handleScroll` 函數中，改用 `lineRef.current.getBoundingClientRect()` 來取得線條的精準位置與高度。
   - `lineMaxHeight = lineRect.height` 作為總可捲動高度。
   - `scrolled = startOffset - lineRect.top` 作為已捲動高度（`startOffset` 維持 `viewportHeight * 0.5`，即畫面中央）。
   - 計算 `progress = Math.max(0, Math.min(1, scrolled / lineMaxHeight))`。

3. **視覺表現維持與強化 (Visual Presentation)**
   - 維持使用 `transform: scaleY(var(--scroll-percent, 0))` 來達到 0% 到 100% 的平滑高度變化。
   - 確保進度線 (`bg-main`) 與背景線的長度、位置完全一致（皆有 `top-0` 與 `bottom-12` 等屬性），讓 `scaleY` 的縮放比例完美對應。

## 3. 預期效果 (Acceptance Criteria)
- 當使用者向下捲動時，進度線（主題色）會精準地從頂部開始向下延伸。
- 進度線的下緣（尖端）將始終精準對齊畫面正中央（`viewportHeight * 0.5`），完美對應到剛進入畫面中央的年份節點，達到真正的「實時進度同步」。
- 當捲動到底部時，進度線將剛好達到 100% 填滿整個背景軌道。