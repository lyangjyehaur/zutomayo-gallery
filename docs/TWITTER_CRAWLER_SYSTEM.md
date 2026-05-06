# Twitter 爬蟲與暫存審核系統架構

本文件詳細說明 Zutomayo Gallery 中的 Twitter 爬蟲 (Crawler) 與暫存審核 (Staging System) 的技術架構、資料庫設計與核心流程。

## 1. 系統架構概覽 (Architecture Overview)

系統主要由以下幾個模組構成：
1. **即時監聽模組 (RSS Monitor)**: 透過 `TwitterMonitorService` 即時監聽 Twitter RSS，適合處理新發布的推文。
2. **歷史推文爬蟲 (Twitter API Crawler)**: 透過 `fetch-zutomayo-art-tweets.ts` 使用 Twitter API v2，大量爬取特定帳號（如 `@zutomayo_art`）的歷史推文。
3. **媒體下載與 R2 儲存**: 自動抓取最高畫質的圖片 (`name=orig`) 與影片，並將檔案上傳至 Cloudflare R2 以進行備份與加速。
4. **暫存審核機制 (Staging System)**: 爬蟲取得的資料會先進入「暫存區」，狀態標記為 `pending`，需經過管理員人工審核後，才會正式寫入系統的媒體庫 (`MediaGroup` / `Media`)。

## 2. 資料庫 Schema (Database Schema)

爬蟲與審核系統主要依賴以下兩個資料表，它們定義於 `models/index.ts` 中：

### 2.1 暫存資料表 (`staging_fanarts`)
用於儲存剛爬取下來、等待審核的二創圖或媒體。
- `id`: 唯一識別碼 (NanoID)
- `tweet_id`: 原始推文 ID
- `original_url`: 原始推文連結
- `media_url`: Twitter 上的原始媒體連結
- `r2_url`: 備份到 R2 的網址
- `media_type`: 媒體類型 (`image` / `video`)
- `crawled_at`: 爬取時間
- `status`: 處理狀態，包含 `pending` (待審核), `approved` (已核准), `rejected` (已拒絕)
- `source`: 資料來源 (如 `crawler` 或 `rss`)

### 2.2 爬蟲狀態表 (`crawler_states`)
用於儲存爬蟲的執行進度，確保程式中斷後能接續爬取，且避免重複。
- `username`: 爬蟲目標用戶名 (Primary Key，如 `zutomayo_art`)
- `pagination_token`: Twitter API v2 提供的分頁 Token，用於獲取下一頁
- `total_crawled`: 該帳號目前已爬取的總數量

## 3. 爬蟲機制、Rate Limit 與分頁處理

歷史推文爬蟲 (`runCrawler`) 是基於 `twitter-api-v2` 實作：

### 3.1 分頁處理 (Pagination)
- 每次呼叫 `roClient.v2.userTimeline` 取得推文，單次最大限制 (`max_results`) 設為 100 筆。
- 每次請求結束後，會從 `response.meta.next_token` 取得下一頁的 Token。
- 將 `next_token` 寫入 `CrawlerStateModel`，下次啟動爬蟲時會自動讀取並從上次中斷的地方繼續爬取。

### 3.2 API 速率限制 (Rate Limit) 處理
- **主動延遲**: 每完成一頁（100 筆）的請求與處理後，程式會主動休眠 (`sleep(3000)`) 3 秒，降低請求頻率。
- **被動重試 (HTTP 429)**: 當捕捉到 HTTP 429 Too Many Requests 錯誤時，系統會自動休眠 5 分鐘 (`sleep(5 * 60 * 1000)`)，等待 API 限制解除後繼續執行。

## 4. 檔案下載與 R2 儲存

為了確保系統儲存的圖片與影片是最高品質，爬蟲在下載檔案前會進行網址處理：
- **圖片**: 偵測到 `pbs.twimg.com` 網址時，會自動移除原有的解析度參數 (`name=...`) 並強制替換為 `name=orig`，以取得原圖。
- **影片**: 遍歷 `media.variants` 中 `content_type` 為 `video/mp4` 的格式，依據 `bit_rate` 由高至低排序，抓取最高碼率的影片。

**上傳流程**:
1. 使用 `fetch` 下載媒體檔案並轉換為 `Buffer`。
2. 計算檔案的 MD5 Hash 值，作為 R2 上的檔案名稱 (`crawler/{hash}.{ext}`)。
3. 呼叫 `uploadBufferToR2` 將檔案上傳至 Cloudflare R2。
4. 上傳時附加 metadata，包含 `original-url`, `tweet-id`, `source` 等資訊。

## 5. 後台審核流程 (Admin Approval Process)

審核流程由 `staging-fanart.controller.ts` 控制，提供給管理員介面使用：

1. **背景觸發與進度查詢**
   - `triggerCrawler`: 可透過 API 背景觸發爬蟲程式。
   - `getProgress`: 回傳目前的爬蟲進度 (`total_crawled`) 與各狀態的數量統計 (pending / approved / rejected)。

2. **取得待審核清單 (`getPendingStagingFanarts`)**
   - 支援分頁查詢 (`page`, `limit`)，按爬取時間 (`crawled_at`) 降冪排序，返回所有狀態為 `pending` 的資料。

3. **審核通過 (`approveStagingFanart`)**
   - 系統會確保該筆資料狀態為 `pending`。
   - 使用推文網址 (`original_url`) 查詢或建立對應的推文群組 (`MediaGroupModel`)，狀態標為 `unorganized`。
   - 在正式媒體庫 (`MediaModel`) 建立該圖片/影片的紀錄，綁定 R2 備份網址並關聯至該推文群組。
   - 將 `StagingFanartModel` 的狀態更新為 `approved`。

4. **審核拒絕 (`rejectStagingFanart`)**
   - 直接將該筆暫存資料的狀態更新為 `rejected`，不會建立正式資料。

## 6. 通知機制 (Notification)

爬蟲與 RSS 監聽系統整合了統一通知服務 `NotificationService`，在關鍵事件發生時自動推送通知給管理員：

### 6.1 通知觸發時機
- **RSS 監聯發現新推文**：`TwitterMonitorService` 偵測到新推文並寫入暫存區後，呼叫 `NotificationService.send()` 發送通知。
- **爬蟲任務完成**：歷史推文爬蟲 (`runCrawler`) 執行完畢後，觸發通知告知管理員。

### 6.2 通知渠道
`NotificationService.send({ type, title, body, url })` 為統一入口，會同時觸發以下三個渠道：
- **Bark**：推送到 iOS Bark App（原有的 inline Bark 邏輯已重構至此服務）
- **Web Push**：透過 `PushService` 發送 VAPID 加密的瀏覽器推播通知
- **Telegram**：透過 `TelegramBotService` 發送 Telegram Bot 訊息

### 6.3 重構說明
舊版在爬蟲流程中直接呼叫 Bark API 的 inline 邏輯，已重構為透過 `NotificationService` 統一發送，降低耦合度並擴展支援多渠道通知。
