# 圖片代理與壓縮策略 (Image Proxy Strategy)

本文檔說明了專案中圖片處理、畫質降級、壓縮與防封鎖（反代）的核心機制。

## 1. 核心原則

為降低伺服器 CPU 消耗與網路流量，所有圖片存取皆依循「**最小成本獲取可用畫質**」原則，且「**只有在必要時才經過 imgproxy**」。

### 什麼情況「不走」 imgproxy？
1. **影片檔案**：imgproxy 無法處理影片，因此一律直連或走 Nginx 簡單反代。
2. **YouTube 縮圖**：透過正規表達式直接修改 YouTube 參數 (如 `maxresdefault.jpg` 改為 `sddefault.jpg`)，直接向 YouTube CDN 請求。
3. **Apple Music 圖片**：直接修改 Apple 官方 CDN 網址中的尺寸參數 (如 `1200x1200bf-60.jpg` 改為 `300x300bf-60.webp`)，不走 imgproxy。
4. **海外用戶看 Twitter 圖片**：直連推特，並加上 `?name=small` 參數，由推特伺服器處理縮圖。
5. **大陸用戶看 Twitter 圖片**：透過 Nginx 進行簡單反向代理（繞過防火牆），並加上 `?name=small` 讓推特壓縮。
6. **海外用戶下載無檔名要求之原圖 (`raw`)**：直接提供原圖網址，不走代理。
7. **非已知圖床之網址**：一律直連，以防 imgproxy 無法拉取而回傳 500 錯誤。
8. **R2 燈箱大圖 (`full`)**：使用者點開燈箱查看大圖時，不論海內外，一律直連 Cloudflare R2，不經過壓縮。

### 什麼情況「必須走」 imgproxy？
1. **Cloudflare R2 的縮圖 (`thumb`, `small`, `hq`, `sd`)**：因為 R2 無法自帶壓縮功能，如果直接載入會導致前端讀取數 MB 的原圖。因此無論海內外，R2 縮圖必須經過 imgproxy 壓縮成 WebP。
2. **所有需要自訂檔名的下載行為 (`raw`)**：因為跨域下載時，HTML5 `<a download="自訂檔名">` 屬性會被瀏覽器安全機制忽略。為了讓使用者下載的圖片有正確名稱（例如 `[MV名稱]_1.jpg` 而非推特亂碼），**無論海內外**，只要帶有自訂檔名需求的下載，一律走 imgproxy 並透過其注入 `Content-Disposition: attachment; filename="xxx"` 標頭。

---

## 2. 畫質級別定義 (ProxyMode)

系統定義了 6 種畫質需求場景，針對不同圖床會有不同行為：

- `thumb` (預設)：首頁瀑布流小圖。
  - YouTube：`hqdefault.jpg`
  - Apple Music：`300x300`
  - R2：交由 imgproxy 壓縮寬度 400px
- `hq`：首頁卡片高品質。
  - YouTube：`hqdefault.jpg`
  - 其他同 `thumb`。
- `small` / `sd`：畫廊預覽或 Modal 播放器背景。
  - YouTube：`sddefault.jpg`
  - Apple Music：`600x600`
  - R2：交由 imgproxy 壓縮寬度 600px
- `full`：燈箱點開查看的大圖。
  - 盡可能直連原圖 (包含 R2 原圖)，不經過壓縮。
- `raw`：使用者點擊「下載圖片」按鈕。
  - 無論海內外，只要需要自訂檔名，一律走 imgproxy 代理下載並注入 Content-Disposition 標頭與語意化檔名。

---

## 3. R2 圖床角色

在此專案中，Cloudflare R2 主要作為 **「原圖連結失效的降級備份手段」**。

當推特原圖被刪除，或 YouTube 影片轉為私享時，後端會將這些資源備份到 R2 並將資料庫網址替換為 R2 連結。由於 R2 存放的是原始大檔，因此前端在展示縮圖時，**必須依賴 imgproxy 來進行即時壓縮**。但點開燈箱查看大圖 (`full`) 或純下載時，因為 R2 在中國大陸並未被全面封鎖，因此可以直接存取。