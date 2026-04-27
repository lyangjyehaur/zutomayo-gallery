# Tasks
- [x] Task 1: 設計與建立資料庫暫存表
  - [x] SubTask 1.1: 新增暫存資料表 (如 `StagingFanart`) 的 Schema (包含推文 ID、原始媒體連結、R2 備份連結、媒體類型、爬取時間、狀態、來源標記(爬蟲或 RSS) 等欄位)。
  - [x] SubTask 1.2: 執行資料庫遷移，更新資料庫結構。
- [x] Task 2: 實作 Cloudflare R2 上傳功能
  - [x] SubTask 2.1: 在後端建立將下載的媒體檔案串流 (Buffer/Stream) 上傳至 R2 的 Utility 函式。
  - [x] SubTask 2.2: 確認上傳後能正確回傳對應的 R2 公開或可存取網址。
- [x] Task 3: 實作 Twitter 歷史資料爬蟲腳本
  - [x] SubTask 3.1: 實作獲取 @zutomayo_art 歷史推文 (過往所有推文) 的邏輯，支援分頁與日期過濾。
  - [x] SubTask 3.2: 實作分批次抓取與進度紀錄機制 (如紀錄最早/最晚的 tweet id 或時間戳記，以確保能完整回溯)。
  - [x] SubTask 3.3: 實作錯誤處理與重試機制 (針對 Rate limit 或連線失敗)，不求快，確保資料穩健寫入。
  - [x] SubTask 3.4: 將解析到的圖片與影片下載並呼叫 Task 2 上傳至 R2，隨後寫入 Task 1 的資料庫暫存表中。
- [x] Task 4: 實作 Admin 審核介面與 API
  - [x] SubTask 4.1: 後端建立 API，以分頁形式獲取暫存表中的待審核資料。
  - [x] SubTask 4.2: 後端建立 API，提供核准 (將資料移轉至正式 fanart 表) 與拒絕 (刪除暫存與 R2 檔案) 的功能。
  - [x] SubTask 4.3: 前端 Admin 頁面新增「待審核 Fanart」介面，串接前述 API。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 1]
