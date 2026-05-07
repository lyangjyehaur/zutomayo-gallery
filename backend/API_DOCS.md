# Zutomayo Gallery - 後端 API 說明文檔

這份文件詳細記錄了 `zutomayo-gallery` 後端系統 (基於 Express.js + PostgreSQL) 的所有 API 路由與功能。

## 目錄 (Table of Contents)
1. [系統與基礎設定 (System & Core)](#1-系統與基礎設定-system--core)
2. [身份驗證 (Authentication)](#2-身份驗證-authentication)
3. [音樂錄影帶 (MVs)](#3-音樂錄影帶-mvs)
4. [專輯管理 (Albums)](#4-專輯管理-albums)
5. [二創與社群 (Fanarts & Webhooks)](#5-二創與社群-fanarts--webhooks)
6. [SEO 與網站地圖 (Sitemap)](#6-seo-與網站地圖-sitemap)
7. [後端錯誤日誌 (Backend Error Logs)](#7-後端錯誤日誌-backend-error-logs)

## 通用說明
- **Base URL**: `/api`
- **Request Format**: `application/json`
- **Response Format**: 預設返回 `application/json` (Sitemap 除外)
- **資料壓縮**: 所有大型 JSON 回應皆預設啟用 Gzip/Brotli 壓縮。
- **認證方式**: 標示為 **[管理員]** 的 API，請求時必須攜帶有效的 Auth Cookie/Token (由 Auth API 登入後簽發)。

### 錯誤回應格式
當 API 發生錯誤時，會回傳統一的 JSON envelope：

```json
{
  "success": false,
  "error": "VISIBLE_MESSAGE",
  "code": "MACHINE_CODE",
  "statusCode": 400,
  "requestId": "req-xxx",
  "details": []
}
```

- `error`：給前端顯示的主要訊息。
- `code`：機器可讀的錯誤代碼，預設與 `AppError` 訊息相同。
- `statusCode`：HTTP status code，方便前端與除錯工具使用。
- `requestId`：追查後端 log 用的請求識別碼。
- `details`：驗證錯誤或額外 context，只有在需要時才回傳。

---

## 1. 系統與基礎設定 (System & Core)
*(路徑: `/api/system`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/status` | 公開 | 取得目前系統狀態（例如是否處於維護模式 `maintenance`）。 |
| **GET** | `/geo` | 公開 | 根據客戶端 IP 取得地理位置資訊 (GeoIP)，用於多語系或地區限制。 |
| **PUT** | `/maintenance` | 管理員 | 切換系統的維護模式狀態。<br>Body: `{ "enabled": true/false }` |
| **GET** | `/dicts` | 公開 | 取得系統設定字典檔 (例如過濾清單、關鍵字列表等)。 |
| **POST** | `/dicts` | 管理員 | 更新系統設定字典檔。 |
| **POST** | `/r2-sync` | 管理員/Token | 觸發將推特圖片同步至 Cloudflare R2 儲存桶的背景任務。可接受 `x-r2-sync-token` 作為自動化腳本的驗證。 |
| **POST** | `/r2-rebuild` | 管理員/Token | 重建 Cloudflare R2 圖片緩存庫。 |
| **POST** | `/survey` | 公開 | 提交訪問質量調查問卷（多維度評分 + 自動效能數據）。<br>Body: `{ "ratingSpeed": 4.5, "ratingExperience": 5, "ratingImageQuality": 4, "ratingUi": 5, "ratingSearch": 4.5, "comment": "...", "url": "...", "userAgent": "...", "connectionType": "4g", "downlink": 10, "rtt": 50, "saveData": false, "lcp": 1200, "fid": 15, "cls": 0.05, "fcp": 800, "ttfb": 200, "imageLoadAvg": 350, "imageLoadCount": 12 }` |
| **GET** | `/errors/stream` | 管理員 | **SSE 即時推送**：後端異常事件串流。管理員連接後可即時接收後端運行時產生的錯誤事件，包含歷史錯誤與即時錯誤。 |
| **GET** | `/errors` | 管理員 | 查詢後端錯誤日誌（分頁）。支援多種篩選條件。 |
| **PATCH** | `/errors/:id/resolve` | 管理員 | 標記或取消標記指定錯誤為已解決。Body: `{ "resolved": true/false }` |
| **POST** | `/errors/batch-resolve` | 管理員 | 批次標記多筆錯誤為已解決。Body: `{ "ids": ["id1", "id2", ...] }` |

---

## 2. 身份驗證 (Authentication)
*(路徑: `/api/auth`)*  
*系統採用 WebAuthn (Passkey) 無密碼登入機制，並保留一組密碼作為備用登入手段。*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/generate-auth-options` | 公開 | 產生 Passkey 登入驗證所需的挑戰碼 (Challenge)。 |
| **POST** | `/verify-auth` | 公開 | 驗證 Passkey 登入簽章或傳統密碼，成功後伺服器會寫入 `Set-Cookie` 發送驗證憑證。 |
| **GET** | `/generate-reg-options` | 管理員 | 產生註冊新 Passkey (新裝置/指紋) 所需的挑戰碼。 |
| **POST** | `/verify-reg` | 管理員 | 驗證並綁定新的 Passkey 裝置至伺服器。 |
| **GET** | `/passkeys` | 管理員 | 列出所有已綁定的 Passkey 裝置清單與資訊。 |
| **DELETE** | `/passkeys/:id` | 管理員 | 刪除指定的 Passkey 裝置。 |
| **POST** | `/change-password` | 管理員 | 更改備用的傳統登入密碼。 |

---

## 3. 音樂錄影帶 (MVs)
*(路徑: `/api/mvs`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | 公開 | 取得所有 MV 的完整列表 (包含封面、畫廊圖片、畫師、專輯與關鍵字等)。回傳資料會扁平化處理以相容前端。 |
| **GET** | `/:id` | 公開 | 根據 MV ID 取得單一 MV 的詳細資料。 |
| **POST** | `/update` | 管理員 | 批次更新或新增 MV 資料 (包含關聯的圖片與 metadata)。<br>Body: `{ "data": MVItem[] }` |
| **GET** | `/metadata` | 公開 | 取得全域的元資料 (例如所有獨立畫師清單等)。 |
| **POST** | `/metadata` | 管理員 | 更新全域的元資料。 |
| **POST** | `/probe` | 管理員 | 探測指定圖片網址的原始尺寸 (`width` 與 `height`)。<br>Body: `{ "url": "https://..." }` |
| **POST** | `/twitter-resolve` | 管理員 | 解析 Twitter 貼文網址，自動提取出推文內的圖片直連網址與畫師文字資訊。<br>Body: `{ "url": "https://x.com/..." }` |
| **POST** | `/verify-admin` | 管理員 | 檢查目前登入的管理員是否仍在使用不安全的系統預設密碼。 |

---

## 4. 專輯管理 (Albums)
*(路徑: `/api/album`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | 公開 | 取得所有專輯的清單與發行日期等資訊。 |
| **POST** | `/` | 管理員 | 批次更新或新增專輯資料。 |

---

## 5. 二創與社群 (Fanarts & Webhooks)
*(路徑: `/api/fanarts` 及 `/api/webhook`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/fanarts/gallery` | 公開 | 取得 FanArt 畫廊資料（分頁）。支援篩選與多種排序方式。 |
| **GET** | `/api/fanarts/gallery/summary` | 公開 | 取得 FanArt 畫廊的篩選統計資料（標籤計數、MV 計數）。 |
| **GET** | `/api/fanarts/unorganized` | 管理員 | 取得爬蟲抓取但尚未被分類或整理的 Twitter 二創圖片 (Fanart) 列表。 |
| **POST** | `/api/fanarts/:id/status` | 管理員 | 更新指定二創圖片的狀態 (例如標記為 `organized` 或 `rejected`)。<br>Body: `{ "status": "organized" }` |
| **POST** | `/api/webhook/waline` | 公開 | 接收 Waline 留言系統的 Webhook 推播，可用於觸發網站快取更新或社群通知。 |

### GET `/api/fanarts/gallery` - FanArt 畫廊查詢

**Query Parameters:**

| 參數 | 類型 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `limit` | number | 200 | 每頁筆數 (1~500) |
| `offset` | number | 0 | 分頁偏移量 |
| `withTotal` | string | - | 設為 `1` 時回傳總數 |
| `all` | string | - | 設為 `1` 時回傳全部資料（不分頁） |
| `tags` | string | - | 逗號分隔的標籤篩選 (如 `tag:acane,tag:real`) |
| `mvIds` | string | - | 逗號分隔的 MV ID 篩選 |
| `onlyCollab` | string | - | 設為 `1` 時只顯示合作標籤作品 |
| `source` | string | - | 來源篩選 (如 `submission`) |
| `sort` | enum | `random` | 排序方式：`random`（隨機）、`date_desc`（最新）、`date_asc`（最舊）、`likes`（按讚數） |
| `seed` | string | - | 隨機排序種子 (1~32 位字母數字)，僅 `sort=random` 時生效。相同 seed 產生相同排序，確保分頁不重複 |

**排序行為說明：**
- 所有排序方式皆以 group 為單位排序，同一 group 的 media 不會被拆散
- `random`：使用 `md5(group_id || seed)` 進行確定性隨機排序；未提供 seed 時 fallback 為日期降序
- `date_desc`：按 group 的 `post_date` 降序（最新優先）
- `date_asc`：按 group 的 `post_date` 升序（最舊優先）
- `likes`：按 group 的 `like_count` 降序（最多讚優先）

**分頁與 MV 關聯查詢優化：**
- MV 關聯資料使用 `separate: true` 在獨立查詢中載入，避免 BelongsToMany JOIN 導致主查詢行數膨脹（一個 Media 關聯多個 MV 時，JOIN 會產生多行，使 LIMIT 作用於合併後的行數而非唯一 Media 數量）
- MV ID 篩選使用 `WHERE id IN (SELECT media_id FROM mv_media WHERE mv_id IN (...))` 子查詢，而非 `include.where + required: true` 的 JOIN 方式，確保主查詢的 LIMIT/OFFSET 正確作用於唯一 Media 記錄
- `count()` 查詢不包含 MV include，因為 MV 篩選條件已通過 WHERE 子句實現

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "limit": 48,
    "offset": 0,
    "total": 500,
    "hasMore": true
  }
}
```

---

## 6. SEO 與網站地圖 (Sitemap)
*(路徑: `/api/sitemap.xml`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/sitemap.xml` | 公開 | 動態產生 XML 格式的 Sitemap。包含所有 MV 詳細頁、Fanart 頁面以及**圖片節點 (`<image:image>`)**。並支援多語系 (zh, ja, en) 索引，專供 Googlebot 等搜尋引擎爬蟲抓取以提升 SEO 排名。 |

---

## 7. 後端錯誤日誌 (Backend Error Logs)
*(路徑: `/api/system/errors`)*

後端運行時產生的所有異常（包含請求錯誤、未捕獲異常、未處理的 Promise Rejection 等）都會自動記錄至 `backend_error_logs` 資料表，並透過 SSE 即時推送給已連接的管理員前端。

### 7.1. SSE 即時推送

**GET `/api/system/errors/stream`**

此端點使用 Server-Sent Events (SSE) 協議，管理員連接後可即時接收後端異常事件。

**事件格式：**

| 事件類型 | 說明 |
| :--- | :--- |
| `connected` | 連接成功，包含 `timestamp` |
| `history` | 連接時推送的歷史錯誤（記憶體中最近 200 筆），包含 `events` 陣列 |
| `error` | 即時錯誤事件，包含完整的 `event` 物件 |

**錯誤事件欄位：**

| 欄位 | 類型 | 說明 |
| :--- | :--- | :--- |
| `id` | string | 錯誤唯一識別碼 |
| `timestamp` | string | ISO 8601 時間戳 |
| `source` | string | 錯誤來源：`request` / `uncaught` / `unhandled_rejection` / `cron` / `queue` |
| `message` | string | 錯誤訊息 |
| `stack` | string? | 堆疊追蹤 |
| `statusCode` | number? | HTTP 狀態碼 |
| `code` | string? | 錯誤代碼 |
| `method` | string? | HTTP 方法 |
| `url` | string? | 請求 URL |
| `requestId` | string? | 請求 ID |
| `ip` | string? | 客戶端 IP |
| `details` | any? | 額外詳情 |

**連線保持：** 每 15 秒發送心跳 (`:heartbeat`)，防止連線超時。

### 7.2. 查詢錯誤日誌

**GET `/api/system/errors`**

**Query Parameters:**

| 參數 | 類型 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `page` | number | 1 | 頁碼 |
| `limit` | number | 50 | 每頁筆數 (1~200) |
| `source` | string | - | 依來源篩選：`request` / `uncaught` / `unhandled_rejection` / `cron` / `queue` |
| `severity` | string | - | 依嚴重程度篩選：`server`（僅 5xx+ 及非請求來源）/ `client`（僅 4xx 請求錯誤）/ `all`（不篩選） |
| `resolved` | string | - | 依解決狀態篩選：`true` / `false` |
| `error_code` | string | - | 依錯誤代碼篩選 |
| `status_code` | number | - | 依 HTTP 狀態碼篩選 |
| `search` | string | - | 全文搜尋（匹配 message、stack、url、request_id） |
| `start_date` | string | - | 起始日期 (ISO 8601) |
| `end_date` | string | - | 結束日期 (ISO 8601) |

**Response:**
```json
{
  "success": true,
  "data": {
    "rows": [...],
    "total": 120,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### 7.3. 標記錯誤解決

**PATCH `/api/system/errors/:id/resolve`**

```json
// Request
{ "resolved": true }

// Response
{ "success": true, "data": { ...updated log } }
```

### 7.4. 批次標記解決

**POST `/api/system/errors/batch-resolve`**

```json
// Request
{ "ids": ["id1", "id2", "id3"] }

// Response
{ "success": true, "data": { "updated": 3 } }
```
