# Zutomayo Gallery - 後端 API 說明文檔

這份文件詳細記錄了 `zutomayo-gallery` 後端系統 (基於 Express.js + PostgreSQL) 的所有 API 路由與功能。

## 目錄 (Table of Contents)
1. [系統與基礎設定 (System & Core)](#1-系統與基礎設定-system--core)
2. [身份驗證 (Authentication)](#2-身份驗證-authentication)
3. [音樂錄影帶 (MVs)](#3-音樂錄影帶-mvs)
4. [專輯管理 (Albums)](#4-專輯管理-albums)
5. [二創與社群 (Fanarts & Webhooks)](#5-二創與社群-fanarts--webhooks)
6. [媒體標註 (Annotations)](#6-媒體標註-annotations)
7. [SEO 與網站地圖 (Sitemap)](#7-seo-與網站地圖-sitemap)
8. [後端錯誤日誌 (Backend Error Logs)](#8-後端錯誤日誌-backend-error-logs)

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
  "error": "帳號或密碼錯誤，請重新輸入",
  "code": "INVALID_CREDENTIALS",
  "statusCode": 401,
  "requestId": "req-xxx",
  "details": []
}
```

- `error`：給前端顯示的用戶友好訊息（繁體中文）。後端會自動將機器碼映射為可讀文案。
- `code`：機器可讀的錯誤碼（如 `INVALID_CREDENTIALS`、`TOKEN_EXPIRED`、`Forbidden`），供前端或外部工具判斷錯誤類型。
- `statusCode`：HTTP 狀態碼，方便前端與除錯工具使用。
- `requestId`：追查後端 log 用的請求識別碼。
- `details`：驗證錯誤或額外 context，只有在需要時才回傳。常見於 Zod 驗證失敗時，`details` 為一個陣列，每個元素包含 `field` 與 `message`。

### API 限流策略 (Rate Limiting)

後端對不同類型的 API 請求套用分層限流，全部以 IP 為單位計數（Redis 儲存，fallback 至 memory）：

| 限流器 | 配額 | 窗口 | 適用範圍 | 備註 |
|:---|:---|:---|:---|:---|
| `apiLimiter` | 1000 req | 15 分鐘 | `GET /api/*` 全域 | 一般讀取操作 |
| `writeLimiter` | 200 req | 15 分鐘 | `POST/PUT/DELETE /api/*` | 寫入操作（排除 `/probe`、`/twitter-resolve`） |
| `loginLimiter` | 10 req | 15 分鐘 | `POST /api/auth/login`、`/api/public-auth/*` | Session 登入防暴力破解（bcrypt 密集型） |
| `webauthnLimiter` | 30 req | 15 分鐘 | `POST /api/auth/generate-auth-options`、`POST /api/auth/verify-auth` | WebAuthn 認證（較寬容，因操作失誤率高） |

- `GET /api/auth/me`、`POST /api/auth/logout`、passkey 管理等已認證操作僅受 `apiLimiter` 約束，不套用登入限流。
- 觸發限流時回傳 HTTP `429 Too Many Requests`，body 為標準 error envelope，並附 `Retry-After` header。

### Session 與 Cookie 設定

| 參數 | 開發環境 | 生產環境 |
|:---|:---|:---|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true`（僅 HTTPS） |
| `sameSite` | `lax` | `none`（跨域架構，允許跨站攜帶 cookie） |
| `maxAge` | 7 天（可配置） | 7 天（可配置） |

- 生產環境採用 `SameSite=None; Secure` 是為了支援 `gallery.ztmr.club` → `api.ztmr.club` 的跨域請求攜帶 session cookie。
- 若生產環境改為同域部署（nginx proxy），可將 `sameSite` 設回 `lax` 以獲得更好的 CSRF 保護。
- 生產環境必須設定 `TRUST_PROXY=true`，使 Express 信任 nginx 反向代理層的 `X-Forwarded-Proto` 標頭，正確判斷 HTTPS。

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
| **GET** | `/errors` | 管理員 | 查詢後端錯誤日誌（分頁）。支援多種篩選條件。 |
| **PATCH** | `/errors/:id/resolve` | 管理員 | 標記或取消標記指定錯誤為已解決。Body: `{ "resolved": true/false }` |
| **POST** | `/errors/batch-resolve` | 管理員 | 批次標記多筆錯誤為已解決。Body: `{ "ids": ["id1", "id2", ...] }` |
| **GET** | `/hero-video/config` | 公開 | 取得 Hero Video 上傳配置資訊（支援格式、檔案大小限制）。 |
| **POST** | `/hero-video/upload` | 管理員 | 上傳 Hero Video 影片至 R2 儲存桶。需使用 `multipart/form-data` 格式。 |
| **DELETE** | `/hero-video` | 管理員 | 刪除 R2 中的 Hero Video 影片。Body: `{ "videoUrl": "https://..." }` |

### Media Groups 管理 (路徑: `/system/media/groups`)

需 `SYSTEM_MEDIA_GROUPS` 權限。

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/repair` | 管理員 | 列出待修復的 media groups（預設僅回傳 `source_url` 為空或 `post_date` 為空的 group）。<br>Query: `limit` (1-200, default 50), `offset`, `q` (搜尋 group id / 作者 / source_url), `all` (`true` 時回傳所有 twitter-sourced group，不限於不完整項目） |
| **POST** | `/reparse-twitter/preview` | 管理員 | 預覽 Twitter 推文重解析結果。Body: `{ "group_ids": ["id1"], "overwrite": false }`<br>回傳每個 group 的欄位 diff、media updates、可新增的 media。 |
| **POST** | `/reparse-twitter/apply` | 管理員 | 套用 Twitter 推文重解析。Body: `{ "group_ids": ["id1"], "overwrite": true, "include_new_media": false, "selected_group_fields": {"groupId": ["author_name", "post_date"]}, "selected_media_fields": {"mediaId": ["thumbnail_url"]}, "new_media_urls": ["https://..."] }`<br>`selected_group_fields` / `selected_media_fields` 支援欄位級選擇性更新，未勾選的欄位保留原值。單次最多 50 個 group。 |
| **PUT** | `/:id` | 管理員 | 更新指定 media group。 |
| **POST** | `/:id/merge` | 管理員 | 將指定 group 合併至目標 group。 |
| **POST** | `/:id/unassign` | 管理員 | 將指定 group 內所有 media 拆回 orphan 並刪除 group。 |

### Hero Video 管理 (路徑: `/system/hero-video`)

需 `MVS` 權限。

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/config` | 公開 | 取得 Hero Video 上傳配置資訊。 |
| **POST** | `/upload` | 管理員 | 上傳 Hero Video 影片至 R2 儲存桶。 |
| **DELETE** | `/` | 管理員 | 刪除 R2 中的 Hero Video 影片。 |

### GET `/api/system/hero-video/config` - 取得上傳配置

**Response:**
```json
{
  "success": true,
  "data": {
    "allowedFormats": ["mp4", "webm", "mov", "m4v", "avi"],
    "maxFileSize": 524288000,
    "maxFileSizeMB": 500
  }
}
```

### POST `/api/system/hero-video/upload` - 上傳影片

需使用 `multipart/form-data` 格式，包含以下欄位：
- `video` (必填): 影片檔案
- `mvId` (必填): 關聯的 MV ID

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://r2.dan.tw/hero-videos/mv-id/1234567890abcdef.mp4",
    "fileName": "original-video.mp4",
    "size": 104857600
  }
}
```

**錯誤回應:**
- `400`: 檔案格式不支援、檔案過大、缺少參數
- `500`: 伺服器錯誤或 R2 上傳失敗

### DELETE `/api/system/hero-video` - 刪除影片

**Request Body:**
```json
{
  "videoUrl": "https://r2.dan.tw/hero-videos/mv-id/1234567890abcdef.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "影片已成功刪除"
}
```

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
| **PUT** | `/me/notification-preferences` | 管理員 | 更新目前管理員的通知偏好設定。<br>Body: `{ "staging"?: boolean, "submission"?: boolean, "error"?: boolean, "crawler"?: boolean }`<br>僅更新提供的欄位，未提供的欄位保持不變。 |

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

### MVItem 資料結構

```typescript
interface MVItem {
  id: string;           // MV 唯一識別碼 (slug)
  title: string;        // MV 標題
  year: string;         // 發布年份 (YYYY)
  date: string;         // 發布日期
  youtube: string;      // YouTube 影片 ID
  bilibili: string;     // Bilibili BV 號
  description: string;   // 影片說明或備註
  heroVideo: string;     // Hero Video 影片網址 (R2 或外部 URL)
  creators: MVCreator[];  // 畫師/動畫師列表
  albums: MVAlbum[];      // 所屬專輯列表
  keywords: MVKeyword[];   // 關鍵字/標籤列表
  images: MVMedia[];       // 媒體圖片列表
}

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

---

## 5.5 Web Push 訂閱 (Push Subscriptions)
*(路徑: `/api/push`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **POST** | `/subscribe` | 管理員 | 註冊瀏覽器 Web Push 訂閱。<br>Body: `{ "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } }` |
| **DELETE** | `/unsubscribe` | 管理員 | 移除 Web Push 訂閱。<br>Body: `{ "endpoint": "https://..." }` |
| **GET** | `/public-key` | 公開 | 取得 VAPID 公鑰，前端用於註冊 Push 訂閱。回傳 `{ "publicKey": "..." }` |

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

## 6. 媒體標註 (Annotations)
*(路徑: `/api/annotations`)*

媒體標註功能用於在圖片上標記文字與位置，支援前端 Lightbox 顯示標註資訊。MV 詳細 API (`GET /api/mvs/:id`) 回傳的圖片資料中已自動包含 `annotations` 陣列。

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/media/:mediaId` | 公開 | 取得指定媒體的所有標註，按 `sort_order` 升序排列。 |
| **GET** | `/mv/:mvId` | 公開 | 取得指定 MV 下所有媒體的標註，回傳以 `media_id` 為 key 的物件。用於前端 Lightbox 一次載入整個 MV 的標註。 |
| **POST** | `/` | 管理員 | 建立新標註。 |
| **PUT** | `/:id` | 管理員 | 更新指定標註（支援部分更新）。 |
| **DELETE** | `/:id` | 管理員 | 刪除指定標註。 |

### POST `/api/annotations` - 建立標註

**Request Body:**
```json
{
  "media_id": "abc123",
  "label": "吉他手",
  "x": 25.5,
  "y": 60.0,
  "style": "default",
  "sort_order": 0
}
```

| 欄位 | 類型 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `media_id` | string | 是 | 關聯的媒體 ID |
| `label` | string | 是 | 標註文字 (1~500 字元) |
| `x` | number | 是 | X 軸百分比位置 (0~100) |
| `y` | number | 是 | Y 軸百分比位置 (0~100) |
| `style` | string | 否 | 標註樣式類型 (最長 50 字元，預設 `default`) |
| `sort_order` | integer | 否 | 排序權重 (預設 `0`) |

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "xyz789",
    "media_id": "abc123",
    "label": "吉他手",
    "x": 25.5,
    "y": 60.0,
    "style": "default",
    "sort_order": 0,
    "created_by": "admin_id",
    "created_at": "2026-05-08T12:00:00.000Z",
    "updated_at": "2026-05-08T12:00:00.000Z"
  }
}
```

### PUT `/api/annotations/:id` - 更新標註

**Request Body (部分更新):**
```json
{
  "label": "主唱",
  "x": 30.0
}
```

所有欄位皆為選填，僅更新提供的欄位。

### GET `/api/annotations/mv/:mvId` - 取得 MV 所有標註

**Response:**
```json
{
  "success": true,
  "data": {
    "media_id_1": [
      { "id": "...", "media_id": "media_id_1", "label": "...", "x": 25.5, "y": 60.0, "style": "default", "sort_order": 0, "created_by": "...", "created_at": "...", "updated_at": "..." }
    ],
    "media_id_2": [
      { "id": "...", "media_id": "media_id_2", "label": "...", "x": 50.0, "y": 30.0, "style": "default", "sort_order": 0, "created_by": "...", "created_at": "...", "updated_at": "..." }
    ]
  }
}
```

---

## 7. SEO 與網站地圖 (Sitemap)
*(路徑: `/api/sitemap.xml`)*

| 請求方法 | 端點路徑 | 權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/sitemap.xml` | 公開 | 動態產生 XML 格式的 Sitemap。包含所有 MV 詳細頁、Fanart 頁面以及**圖片節點 (`<image:image>`)**。並支援多語系 (zh, ja, en) 索引，專供 Googlebot 等搜尋引擎爬蟲抓取以提升 SEO 排名。 |

---

## 8. 後端錯誤日誌 (Backend Error Logs)
*(路徑: `/api/system/errors`)*

後端運行時產生的所有異常（包含請求錯誤、未捕獲異常、未處理的 Promise Rejection 等）都會自動記錄至 `backend_error_logs` 資料表。當錯誤數量在時間窗口內超過閾值時，系統會透過 `NotificationService` 發送警告通知（Bark + Web Push + Telegram）。

### 8.1. 查詢錯誤日誌

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

### 8.2. 標記錯誤解決

**PATCH `/api/system/errors/:id/resolve`**

```json
// Request
{ "resolved": true }

// Response
{ "success": true, "data": { ...updated log } }
```

### 8.3. 批次標記解決

**POST `/api/system/errors/batch-resolve`**

```json
// Request
{ "ids": ["id1", "id2", "id3"] }

// Response
{ "success": true, "data": { "updated": 3 } }
```
