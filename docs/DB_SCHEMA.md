# Zutomayo Gallery - Database Schema Documentation

本文檔詳細說明 Zutomayo Gallery V2 (PostgreSQL) 的資料表結構與關聯設計。
本系統採用 **實體-關聯模型 (Entity-Relationship Model)**，將 MV 相關的各項實體（圖片、畫師、專輯、關鍵字）拆分為獨立資料表，並透過中繼表 (Junction Tables) 建立多對多關聯。

---

## 1. 核心實體表 (Core Entities)

### 1.1. `mvs` (音樂影片主表)
系統的核心實體，儲存每部音樂影片的基本詮釋資料。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | MV 的唯一識別碼 (通常是英文 slug，如 `seigi`) |
| `title` | `VARCHAR(255)` | `NOT NULL` | MV 標題 |
| `year` | `VARCHAR(4)` | `NULL` | 發布年份 (如 `2020`) |
| `date` | `VARCHAR(20)` | `NULL` | 發布日期 (如 `2020/05/05`) |
| `youtube` | `VARCHAR(255)` | `NULL` | YouTube 影片 ID |
| `bilibili` | `VARCHAR(255)` | `NULL` | Bilibili 影片 ID (BV 號) |
| `description`| `TEXT` | `NULL` | 影片說明或備註 |
| `created_at` | `TIMESTAMP` | | 建立時間 |
| `updated_at` | `TIMESTAMP` | | 更新時間 |

### 1.2. `images` (統一圖片表)
儲存系統中所有的圖片資源，包含 MV 封面圖、官方設定資料圖、以及社群二創圖 (FanArt)。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 圖片的唯一識別碼 |
| `type` | `VARCHAR(50)` | `NOT NULL` | 圖片類型：`'cover'` (封面), `'official'` (官方圖), `'fanart'` (二創圖) |
| `original_url`| `TEXT` | `UNIQUE`, `NOT NULL`| 圖片的原始來源網址 (例如 Twitter 原圖網址) |
| `url` | `TEXT` | `NOT NULL` | 系統內實際使用的網址 (備份至 Cloudflare R2 後的網址) |
| `thumbnail_url`| `TEXT`| `NULL` | 縮圖網址 |
| `caption` | `TEXT` | `NULL` | 圖片描述或圖說 |
| `width` | `INTEGER` | `NULL` | 圖片寬度 |
| `height` | `INTEGER` | `NULL` | 圖片高度 |
| `group_id` | `VARCHAR(255)` | `NULL` | 用於將多張圖片分組的識別碼 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

### 1.3. `artists` (畫師/創作者表)
儲存參與 MV 製作或繪製二創圖的創作者資訊。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 畫師唯一識別碼 |
| `name` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`| 畫師名稱 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

### 1.4. `albums` (專輯表)
儲存 MV 收錄的實體或數位專輯資訊。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 專輯唯一識別碼 |
| `name` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`| 專輯名稱 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

### 1.5. `keywords` (關鍵字表)
儲存用於搜尋與分類的標籤/關鍵字。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 關鍵字唯一識別碼 |
| `name` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`| 關鍵字內容 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

---

## 2. 擴展屬性表 (Extension Tables)

### 2.1. `fanart_metadata` (二創圖詮釋資料)
當 `images.type = 'fanart'` 時，此表儲存與社群平台 (如 Twitter) 相關的額外資訊。
這是一個 `1 對 1` 或 `0 對 1` 的擴展表。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `image_id` | `UUID` | `PRIMARY KEY`, `FK` | 關聯至 `images.id`，刪除時級聯刪除 (`CASCADE`) |
| `tweet_url` | `TEXT` | `NULL` | 推文網址 |
| `tweet_text` | `TEXT` | `NULL` | 推文內容 |
| `tweet_author`| `VARCHAR(255)` | `NULL` | 推文作者顯示名稱 |
| `tweet_handle`| `VARCHAR(255)` | `NULL` | 推文作者帳號 (如 `@username`) |
| `tweet_date` | `TIMESTAMP` | `NULL` | 推文發布時間 |
| `status` | `VARCHAR(50)` | `DEFAULT 'pending'` | 審核狀態：`'pending'`, `'organized'`, `'rejected'` |

---

## 3. 中繼關聯表 (Junction Tables)

這些表用於實現 `mvs` 與其他實體表之間的 `多對多 (N:M)` 關係。

### 3.1. `mv_images` (MV 與圖片的關聯)
定義一張圖片在特定 MV 中的角色與排序。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `image_id` | `UUID` | `PK`, `FK` | 關聯至 `images.id` |
| `usage` | `VARCHAR(50)` | `NOT NULL` | 該圖片在此 MV 的用途：`'cover'` (封面), `'gallery'` (相簿/設定圖) |
| `order_index` | `INTEGER` | `DEFAULT 0` | 在該用途中的顯示順序 (數字越小越前面) |

### 3.2. `mv_artists` (MV 與畫師的關聯)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `artist_id` | `UUID` | `PK`, `FK` | 關聯至 `artists.id` |
| `role` | `VARCHAR(100)` | `DEFAULT 'unknown'` | 畫師在該 MV 中的職位 (如 `'Animator'`, `'Character Design'`) |

### 3.3. `mv_albums` (MV 與專輯的關聯)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `album_id` | `UUID` | `PK`, `FK` | 關聯至 `albums.id` |
| `track_number`| `INTEGER` | `DEFAULT 0` | 該歌曲在專輯中的音軌編號 |

### 3.4. `mv_keywords` (MV 與關鍵字的關聯)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `keyword_id` | `UUID` | `PK`, `FK` | 關聯至 `keywords.id` |

---

## 4. 全域元資料表 (Global Meta)

這些表用於儲存全站通用的設定或詮釋資料，不直接與 `mvs` 綁定。

### 4.1. `meta_artists` (畫師詳細資料)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `name` | `VARCHAR(255)` | `PRIMARY KEY` | 畫師名稱 (對應 `artists.name`) |
| `snsId` | `VARCHAR(255)` | `NULL` | 社群帳號 ID (如 Twitter 帳號) |
| `hideId` | `BOOLEAN` | `DEFAULT false`| 是否隱藏社群 ID |
| `displayName` | `VARCHAR(255)` | `NULL` | 顯示名稱 (如果有別名) |
| `collaborations`| `JSONB` | `NULL` | 合作過的畫師列表或相關資訊 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

### 4.2. `meta_albums` (專輯詳細資料)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `name` | `VARCHAR(255)` | `PRIMARY KEY` | 專輯名稱 (對應 `albums.name`) |
| `type` | `VARCHAR(50)` | `NULL` | 專輯類型 (如 `'EP'`, `'Full Album'`) |
| `releaseDate` | `VARCHAR(20)` | `NULL` | 發行日期 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

### 4.3. `meta_settings` (系統全域設定)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `key` | `VARCHAR(255)` | `PRIMARY KEY` | 設定鍵名 (如 `'announcements'`) |
| `value` | `JSONB` | `NOT NULL` | 設定內容 (JSON 格式) |
| `created_at` | `TIMESTAMP` | | 建立時間 |
| `updated_at` | `TIMESTAMP` | | 更新時間 |
