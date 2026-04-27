# 爬取 @zutomayo_art 歷史推文與媒體資源 Spec

## Why
為了豐富 fanart 頁面的內容，我們需要一個穩定、可重試的後台任務（或腳本），專門爬取 Twitter 上 @zutomayo_art 帳號發布的**歷史推文**。
（註：新發布的推文將由另外的 RSS 服務負責抓取，此爬蟲僅專注於回溯與抓取過往的歷史資料。）
並解析其中的圖片與影片，以便後續由管理員篩選發布。

## What Changes
- 建立一張新的資料庫暫存表（Staging Table），用於儲存解析出來的推文與媒體中繼資料。
- 實作支援分批爬取與失敗重試機制的 Twitter 歷史資料爬蟲腳本。
- 整合 Cloudflare R2，將爬取到的原始圖片與影片備份儲存至 R2。
- 在 Admin 頁面新增介面，供管理員預覽暫存表中的媒體，並挑選核准最終顯示於 fanart 頁面的作品。

## Impact
- Affected specs: Fanart 顯示邏輯、歷史資料回溯、後台管理員審核流程。
- Affected code: 後端資料庫 Schema (建立暫存表)、歷史資料回溯腳本、R2 儲存服務整合、後端 API 與前端 Admin 審核頁面。

## ADDED Requirements
### Requirement: 歷史媒體爬取與備份
系統應能穩定地分批次獲取 @zutomayo_art 的歷史推文，解析媒體連結並備份至 R2，最後將紀錄存入暫存表。

#### Scenario: 成功爬取歷史推文並備份
- **WHEN** 歷史爬蟲任務觸發並成功取得過往的推文資料
- **THEN** 解析媒體網址，下載並上傳至 R2，並在資料庫暫存表中新增一筆待審核紀錄。

#### Scenario: 爬取失敗重試
- **WHEN** 網路不穩定或觸發 API 限制導致失敗
- **THEN** 系統會記錄進度並在後續批次或重試機制中接續爬取，確保不漏歷史資料。

### Requirement: 管理員審核
系統應提供管理員審核暫存區媒體的介面。

#### Scenario: 審核通過
- **WHEN** 管理員在 Admin 頁面選擇一張暫存圖並點擊「核准」
- **THEN** 該圖片的中繼資料將移轉至正式 fanart 資料表，並展示於前台。

## MODIFIED Requirements
無

## REMOVED Requirements
無
