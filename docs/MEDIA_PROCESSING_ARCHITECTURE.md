# ZUTOMAYO Gallery 媒體資源處理架構 (Media Processing Architecture)

本文檔詳細說明了 ZUTOMAYO Gallery 在引入 Cloudflare R2 後，從後端資源抓取、儲存，到前端智慧分流、動態壓縮與渲染的完整生命週期。

---

## 1. 核心設計理念

*   **永久保存**：推特連結隨時可能失效，所有高畫質原圖與影片必須無損備份至 Cloudflare R2。
*   **智慧分流**：根據訪客地理位置（中國大陸/海外）與資源類型（圖片/影片），動態選擇最快且不會被牆的載入路徑。
*   **效能極致**：瀑布流只載入 WebP 縮圖，點擊後載入高畫質大圖，下載時提供帶有正確檔名的原圖。
*   **避免崩潰**：動態圖片處理服務 (`imgproxy`) 僅能處理圖片，所有影片資源必須精準繞過，直接透過 Nginx 代理傳輸。

---

## 2. 後端：資源獲取與 R2 備份流程

### 2.1 觸發時機
*   系統定時執行推特爬蟲 (`twitter-monitor.service.ts`)。
*   管理員在後台手動同步或執行全庫重建 (`r2_rebuild.ts`)。

### 2.2 處理邏輯
1.  **網址正規化**：
    *   推特圖片：強制移除所有參數，附加 `?name=orig`，確保下載最高畫質原圖。
    *   推特影片：保留 `video.twimg.com` 連結，並連同其預覽圖 (`thumbnail`) 一併抓取。
2.  **Hash 命名與防撞**：
    *   根據原始網址計算 MD5 Hash，結合自動判斷的副檔名（支援 `jpg, png, webp, mp4` 等），生成 R2 儲存路徑。
    *   MV 圖片：`mvs/{mv_id}/<hash>.<ext>`
    *   Fanart 圖片：`fanarts/<hash>.<ext>`
    *   Fanart 影片：`fanarts/videos/<hash>.mp4`
3.  **上傳與 Metadata**：
    *   將檔案無損上傳至 R2 (`zutomayo-gallery-archive`)。
    *   同步寫入 S3 Metadata（包含 `fanart-id`, `source-tweet`, `author-handle`），作為未來的備用資料庫。
4.  **資料庫更新**：
    *   將 PostgreSQL 中對應紀錄的 `url` 替換為 `https://r2.dan.tw/...`，並保留 `original_url` 以供溯源。

---

## 3. 前端：`getProxyImgUrl` 智慧分流引擎

這是整個前端圖片渲染的心臟。所有圖片與影片在進入 DOM 之前，都必須經過 [image.ts](file:///Users/lyangjyehaur/Projects/zutomayo-gallery/frontend/src/lib/image.ts) 中的 `getProxyImgUrl` 進行處理。

### 3.1 請求模式 (Proxy Mode)
*   `thumb`：瀑布流縮圖（預設，寬度約 400px，轉 WebP）。
*   `small`：中等縮圖（寬度約 600px，轉 WebP）。
*   `full`：燈箱展示用大圖（轉 WebP 或直連 R2 原圖）。
*   `raw`：使用者點擊下載時，必須回傳無損原圖，並透過 Header 注入使用者友好的檔名（例如 `勘冴えて悔しいわ_1.jpg`，而非 Hash 亂碼）。

### 3.2 分流決策樹 (Decision Tree)

```mermaid
graph TD
    Start([前端請求 getProxyImgUrl]) --> CheckVideo{1. 是影片嗎?}
    
    CheckVideo -- 是 (mp4/video.twimg.com) --> HandleVideo[影片處理邏輯]
    HandleVideo -->|R2 影片 (大陸)| NginxR2[回傳 assets.ztmr.club/r2/...]
    HandleVideo -->|R2 影片 (海外)| DirectR2[直連 r2.dan.tw]
    HandleVideo -->|Twitter 影片 (大陸)| NginxTV[回傳 assets.ztmr.club/tv/...]
    HandleVideo -->|Twitter 影片 (海外)| DirectTV[直連 video.twimg.com]
    NginxR2 --> EndVideo([結束: 影片不過 imgproxy])
    DirectR2 --> EndVideo
    NginxTV --> EndVideo
    DirectTV --> EndVideo
    
    CheckVideo -- 否 (靜態圖片) --> CheckOverseas{2. 是海外用戶且非下載模式?}
    
    CheckOverseas -- 是 --> HandleOverseas[海外直連優化]
    HandleOverseas -->|推特圖片| TwimgDirect[補上 name=small/large 直連 pbs.twimg.com]
    HandleOverseas -->|R2 大圖 (full)| DirectR2_2[直連 r2.dan.tw 節省流量]
    HandleOverseas -->|R2 縮圖 (thumb)| CheckMainland[進入大陸代理邏輯]
    TwimgDirect --> EndOverseas([結束: 圖片直連])
    DirectR2_2 --> EndOverseas
    
    CheckOverseas -- 否 (大陸用戶/需要代理/下載模式) --> CheckMainland{3. 國內代理邏輯}
    
    CheckMainland -->|Twitter 原生縮圖 (非 raw)| NginxTI[回傳 assets.ztmr.club/ti/... 節省 CPU]
    NginxTI --> EndMainland([結束: Nginx 反代推特])
    
    CheckMainland -->|R2 大圖展示 (full)| NginxR2_3[回傳 assets.ztmr.club/r2/... 避免 imgproxy 處理大圖]
    NginxR2_3 --> EndMainland2([結束: Nginx 反代 R2 原圖])
    
    CheckMainland -->|需要產生縮圖 (thumb/small) 或 下載注入檔名 (raw)| ImgProxy[4. 統一送交 imgproxy]
    
    ImgProxy --> ProcessImgProxy[轉 Base64, 附加 rs:fit 或 filename 標頭]
    ProcessImgProxy --> EndImgProxy([結束: 回傳 img.ztmr.club/...])
```

---

## 4. 基礎設施：Nginx (OpenResty) 與 Imgproxy

### 4.1 Nginx 代理層 (`assets.ztmr.club`)
作為前端直連與被牆資源之間的橋樑，處理以下任務：
*   **`/r2/` (代理 Cloudflare R2)**：
    *   解決 Cloudflare 原生網域無 CORS 的問題（注入 `Access-Control-Allow-Origin: "*"`）。
    *   加上 `proxy_ssl_server_name on;` 與 `proxy_ssl_name r2.dan.tw;` 解決 SNI 握手導致的 502 Bad Gateway 錯誤。
    *   設定 `valid_referers` 防盜連，並特別放行 `localhost` 以利本地開發。
*   **`/ti/` (代理 Twitter 圖片)**：轉發至 `pbs.twimg.com`。
*   **`/tv/` (代理 Twitter 影片)**：轉發至 `video.twimg.com`。

### 4.2 動態影像處理 (`imgproxy` / `img.ztmr.club`)
專注於處理需要耗費 CPU 計算的圖片操作：
*   將 R2 中的 10MB 高畫質原圖，即時壓縮成 400px 的 WebP 縮圖，供瀑布流使用。
*   在 `raw` 下載模式時，不改變圖片畫質，但透過參數（如 `filename:XXX`）在 HTTP 回應中注入 `Content-Disposition: attachment; filename="XXX.jpg"`，讓瀏覽器下載時自動使用正確的自訂檔名。
*   **安全機制**：可透過設定 `IMGPROXY_KEY` 與 `IMGPROXY_SALT` 啟用簽名機制。若啟用，前端會透過後端的 `/api/system/image/proxy` 路由動態生成已簽名的 URL，並透過 302 導向至 imgproxy，避免被惡意呼叫與節省前端效能。

---

## 5. 異常處理與降級機制 (Fallback)

1.  **SVG 骨架圖**：
    *   在 [FancyboxViewer.tsx](file:///Users/lyangjyehaur/Projects/zutomayo-gallery/frontend/src/components/FancyboxViewer.tsx) 中，當圖片因網路問題載入失敗 (`onError`) 時，會自動替換為極輕量的 Base64 SVG 佔位圖，避免畫面破版。
2.  **Fancybox DOM 防呆**：
    *   由於 `imgproxy` 處理過大或特殊圖片偶爾會失敗，前端元件會在 `<img>` 標籤上備用完整的 `alt` 屬性。
3.  **影片載入策略**：
    *   影片檔案不走 `imgproxy`，並在 Fancybox 啟動前，透過自訂的判斷邏輯（比對副檔名或後端標記 `isVideo`），強制將其 `type` 設為 `html5video`，以原生 `<video>` 標籤渲染，確保跨域播放順暢。