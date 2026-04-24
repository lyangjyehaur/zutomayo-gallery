# ZUTOMAYO Gallery Database Refactoring Plan

## 1. 現狀分析 (Current State)
目前專案使用 PostgreSQL，但核心資料表 `mvs` 採用了 NoSQL 的設計思維：
- `artist` (JSONB)
- `album` (JSONB)
- `coverImages` (JSONB)
- `keywords` (JSONB)
- `images` (JSONB) - 包含了官方 MV 圖片與二創 (FanArt) 圖片

`fanarts` 表則獨立用於記錄推特監聽資料，但當管理員審核通過後，圖片資料會被**拷貝**進 `mvs.images` 中。這導致了資料重複、缺乏正規化 (Normalization)，以及難以獨立查詢特定圖片。

## 2. 目標架構 (Target Schema)
我們將從 NoSQL 的 JSONB 結構轉向傳統關聯式資料庫 (Relational Database) 結構。

### 2.1 `mvs` (MV 基本資訊)
保留基本資訊，移除大型 JSONB 陣列。
- `id` (VARCHAR, PK)
- `title` (VARCHAR)
- `year` (VARCHAR(4))
- `date` (DATE)
- `youtube` (VARCHAR)
- `bilibili` (VARCHAR)
- `description` (TEXT)

### 2.2 `images` (圖片資源核心表)
所有圖片 (包含 MV Cover、MV 截圖、官方視覺圖、FanArt) 統一存放在這裡。
- `id` (UUID, PK) - 唯一識別碼
- `type` (VARCHAR) - 'cover', 'official', 'fanart', 'screenshot'
- `url` (VARCHAR) - R2 網址或代理網址
- `original_url` (VARCHAR) - 原始推特網址
- `thumbnail_url` (VARCHAR) - 影片縮圖或特殊縮圖
- `width` (INTEGER)
- `height` (INTEGER)
- `caption` (TEXT)
- `group_id` (VARCHAR) - 用於群組多張推特圖片
- `created_at` (TIMESTAMP)

### 2.3 `artists` (畫師與創作者)
獨立的創作者表，取代原本的 `MetaArtist` 和 JSONB，用來統一管理畫師資訊。
- `id` (UUID, PK)
- `name` (VARCHAR) - 畫師名稱
- `sns_id` (VARCHAR) - 社交平台 ID (如推特 Handle)
- `profile_url` (VARCHAR) - 頭像網址
- `bio` (TEXT)
- `instagram`, `youtube`, `pixiv`, `tiktok`, `website` (VARCHAR)

### 2.4 `artist_images` (多對多關聯表)
用來關聯畫師與他們的作品 (包含官方合作圖與 FanArt)。
- `artist_id` (UUID, PK, FK -> artists.id)
- `image_id` (UUID, PK, FK -> images.id)

### 2.5 `mv_images` (多對多關聯表)
一張圖片可以屬於多個 MV (特別是綜合插畫 FanArt，或者一張圖既是 A MV 的截圖也是 B MV 的客串)。
- `mv_id` (VARCHAR, PK, FK -> mvs.id)
- `image_id` (UUID, PK, FK -> images.id)
- `usage` (VARCHAR) - 'cover', 'gallery' (用來區分這張圖在這個 MV 裡是當封面還是當畫廊展示)
- `order_index` (INTEGER) - 排序用

### 2.6 系統與權限表 (System & Auth)
這些表結構已經足夠正規化，保持現狀即可，但會將名稱統一規範。
- `settings` (原 MetaSetting)
  - `key` (VARCHAR, PK)
  - `value` (TEXT)
- `auth_passkeys`
  - `id` (VARCHAR, PK)
  - `public_key` (TEXT)
  - `counter` (INTEGER)
  - `transports` (JSONB)
  - `name` (VARCHAR)
  - `created_at` (TIMESTAMP)
- `auth_settings`
  - `key` (VARCHAR, PK)
  - `value` (TEXT)

### 2.7 `fanart_metadata` (FanArt 專屬資訊)
只有 type='fanart' 的圖片才會關聯到這張表。
- `image_id` (UUID, PK, FK -> images.id)
- `tweet_url` (VARCHAR)
- `tweet_text` (TEXT)
- `tweet_author` (VARCHAR)
- `tweet_handle` (VARCHAR)
- `tweet_date` (DATE)
- `status` (VARCHAR) - 'unorganized', 'organized', 'rejected'

### 2.8 `albums` (專輯資訊)
用來取代 `MetaAlbum`，統一管理所有的專輯發行資訊。
- `id` (UUID, PK)
- `name` (VARCHAR) - 專輯名稱
- `release_date` (DATE) - 發行日期
- `cover_image_url` (VARCHAR) - 專輯封面 (可選)
- `hide_date` (BOOLEAN) - 是否在 UI 上隱藏日期

### 2.9 `mv_albums` (多對多關聯表)
一個 MV 可以收錄在多個專輯中 (例如單曲先發，後來又收錄在精選輯中)。
- `mv_id` (VARCHAR, PK, FK -> mvs.id)
- `album_id` (UUID, PK, FK -> albums.id)
- `track_number` (INTEGER) - 該 MV 在專輯中的曲目順序 (可選)

### 2.10 `keywords` (關鍵字與標籤)
用來取代 `mvs.keywords`，統一管理所有的標籤 (如: 演唱會、周邊、角色名稱等)。
- `id` (UUID, PK)
- `name` (VARCHAR) - 標籤名稱

### 2.11 `mv_keywords` (多對多關聯表)
- `mv_id` (VARCHAR, PK, FK -> mvs.id)
- `keyword_id` (UUID, PK, FK -> keywords.id)

### 2.12 `mv_artists` (多對多關聯表)
用來取代 `mvs.artist`，記錄哪位畫師/創作者參與了哪部 MV 的製作。
- `mv_id` (VARCHAR, PK, FK -> mvs.id)
- `artist_id` (UUID, PK, FK -> artists.id)
- `role` (VARCHAR) - 擔任的角色 (如: 'director', 'illustrator', 'animator' 等，預留擴充)

## 3. 遷移步驟 (Migration Steps)

1. **建立新資料表**：使用 Sequelize 建立 `images`, `fanart_metadata`, `mv_images` 模型。
2. **資料遷移腳本 (Migration Script)**：
   - 遍歷現有 `mvs` 表，將 `images` JSONB 拆解。
   - 為每張圖片生成 UUID，存入 `images` 表。
   - 如果是 fanart，將推特資訊存入 `fanart_metadata`。
   - 建立 `mv_images` 關聯紀錄。
3. **更新後端 API**：
   - 修改 `/mvs` 查詢 API，使用 `JOIN` (`include` in Sequelize) 取代直接返回 JSONB。
   - 修改 Admin 保存邏輯，改為寫入 `images` 和 `mv_images`。
4. **更新前端**：
   - 修改 `MVItem` 介面，適應新的 API 回傳格式 (可能需要將關聯資料重新組裝成前端熟悉的結構，減少前端改動)。
5. **清理舊欄位**：確認無誤後，移除 `mvs.images` 欄位。

## 4. 預期效益
- **單一真相來源 (Single Source of Truth)**：一張 FanArt 圖片在資料庫中只有一筆紀錄，關聯多個 MV 只是多筆關聯紀錄，徹底解決重複問題。
- **擴展性**：未來要增加「圖片點讚」、「圖片留言」、「圖片標籤」功能時，可以直接關聯到 `images.id`。
- **查詢效能**：可以輕易下達「查詢 2023 年的所有 FanArt」或「查詢特定畫師的所有作品」等 SQL 語法。