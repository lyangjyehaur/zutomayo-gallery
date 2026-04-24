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

### 1.2. `media` (統一媒體表，原 images)
儲存系統中所有的媒體資源，包含 MV 封面圖、官方設定資料圖、以及社群二創影片/圖片 (FanArt)。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 媒體的唯一識別碼 |
| `type` | `VARCHAR(50)` | `NOT NULL` | 媒體分類：`'cover'` (封面), `'official'` (官方圖), `'fanart'` (二創圖) |
| `media_type`| `VARCHAR(20)` | `DEFAULT 'image'`| 媒體格式類型：`'image'` (圖片), `'video'` (影片), `'gif'` (動圖) |
| `original_url`| `TEXT` | `UNIQUE`, `NOT NULL`| 媒體的原始來源網址 (例如 Twitter 原圖網址) |
| `url` | `TEXT` | `NOT NULL` | 系統內實際使用的網址 (備份至 Cloudflare R2 後的網址) |
| `thumbnail_url`| `TEXT`| `NULL` | 縮圖網址 (供影片使用) |
| `caption` | `TEXT` | `NULL` | 描述或圖說 |
| `group_id` | `UUID` | `FK`, `NULL` | 關聯至 `media_groups.id`，用於將來自同一個來源 (如推文) 的多張媒體分組 |
| `created_at` | `TIMESTAMP` | | 建立時間 |

### 1.3. `artists` (畫師/創作者表)
儲存參與 MV 製作或繪製二創圖的創作者資訊。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 畫師唯一識別碼 |
| `name` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`| 畫師名稱 |
| `twitter` | `VARCHAR(255)` | `NULL` | 推特用戶名 (不含 @，原 sns_id) |
| `profile_url`| `VARCHAR(255)` | `NULL` | 頭像網址 |

### 1.4. `albums` (專輯表)
儲存 MV 收錄的實體或數位專輯資訊。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 專輯唯一識別碼 |
| `name` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`| 專輯名稱 |
| `type` | `VARCHAR(50)` | `NULL` | 專輯類別 (參考 sys_dictionaries: album_type) |
| `release_date`| `TIMESTAMP` | `NULL` | 發行日期 |

### 1.5. `keywords` (關鍵字表)
儲存用於搜尋與分類的標籤/關鍵字。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 關鍵字唯一識別碼 |
| `name` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`| 關鍵字內容 |
| `lang` | `VARCHAR(20)` | `DEFAULT 'zh-Hant'` | 關鍵字所屬語言 |

---

## 2. 擴展屬性與分組表 (Extension & Group Tables)

### 2.1. `media_groups` (媒體分組資訊)
用於將來自同一個來源 (例如同一篇 Twitter 推文) 的多張圖片/影片進行分組，並共享來源詮釋資料。取代了原本只跟單張圖綁定的 `fanart_metadata`。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 分組唯一識別碼 |
| `title` | `VARCHAR(255)` | `NULL` | 分組標題 (供官方相簿等使用) |
| `source_url` | `TEXT` | `NULL` | 來源網址 (如推文連結) |
| `source_text` | `TEXT` | `NULL` | 來源內容 (如推文內文) |
| `author_name` | `VARCHAR(255)` | `NULL` | 來源作者顯示名稱 |
| `author_handle`| `VARCHAR(255)` | `NULL` | 來源作者帳號 (如 `@username`) |
| `post_date` | `TIMESTAMP` | `NULL` | 來源發布時間 |
| `status` | `VARCHAR(50)` | `DEFAULT 'pending'` | 審核狀態：`'pending'`, `'organized'`, `'rejected'` (參考字典表) |

---

## 3. 中繼關聯表 (Junction Tables)

這些表用於實現 `mvs` 與其他實體表之間的 `多對多 (N:M)` 關係。

### 3.1. `mv_media` (MV 與媒體的關聯)
定義一個媒體在特定 MV 中的角色與排序。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `media_id` | `UUID` | `PK`, `FK` | 關聯至 `media.id` |
| `usage` | `VARCHAR(50)` | `NOT NULL` | 該圖片/影片在此 MV 的用途：`'cover'` (封面), `'gallery'` (相簿/設定圖) |
| `order_index` | `INTEGER` | `DEFAULT 0` | 在該用途中的顯示順序 (數字越小越前面) |

### 3.2. `artist_media` (畫師與特定媒體的關聯)
用於將特定的圖片/影片直接歸屬於特定的畫師。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `artist_id` | `UUID` | `PK`, `FK` | 關聯至 `artists.id` |
| `media_id` | `UUID` | `PK`, `FK` | 關聯至 `media.id` |

### 3.3. `mv_artists` (MV 與畫師的關聯)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `artist_id` | `UUID` | `PK`, `FK` | 關聯至 `artists.id` |
| `role` | `VARCHAR(100)` | `DEFAULT 'unknown'` | 畫師在該 MV 中的職位 (如 `'Animator'`, `'Character Design'`) |

### 3.4. `mv_albums` (MV 與專輯的關聯)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `album_id` | `UUID` | `PK`, `FK` | 關聯至 `albums.id` |
| `track_number`| `INTEGER` | `DEFAULT 0` | 該歌曲在專輯中的音軌編號 |

### 3.5. `mv_keywords` (MV 與關鍵字的關聯)
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `mv_id` | `VARCHAR(255)` | `PK`, `FK` | 關聯至 `mvs.id` |
| `keyword_id` | `UUID` | `PK`, `FK` | 關聯至 `keywords.id` |

---

## 4. 全域配置與字典表 (Global Config & Dictionaries)

這些表用於儲存全站通用的設定或字典資料，不直接與 `mvs` 綁定。

### 4.1. `sys_dictionaries` (全局字典表)
存放系統中各個表裡的 `type` 或 `status` 所代表的具體含義，方便統一管理分類。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 唯一識別碼 |
| `category` | `VARCHAR(255)` | `NOT NULL` | 分類名 (如 `album_type`, `media_category`, `fanart_status`) |
| `code` | `VARCHAR(255)` | `NOT NULL` | 代碼值 (如 `full`, `video`, `organized`) |
| `label` | `VARCHAR(255)` | `NOT NULL` | 顯示名稱 (如 `完整專輯`, `已收錄`) |
| `description`| `TEXT` | `NULL` | 詳細說明 |
| `sort_order` | `INTEGER` | `DEFAULT 0` | 排序權重 |

### 4.2. `sys_configs` (全局配置表)
系統所有的全局配置皆存於此表，取代舊版的 `meta_settings`。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `key` | `VARCHAR(255)` | `PRIMARY KEY` | 配置鍵名 (如 `maintenance_mode`) |
| `value` | `JSONB` | `NOT NULL` | 配置內容 (支援 JSON 或純字串) |
| `description`| `TEXT` | `NULL` | 配置說明 |
| `updated_at` | `TIMESTAMP` | | 最後更新時間 |

### 4.3. `sys_announcements` (首頁公告表)
獨立存放系統首頁公告，便於維護多筆公告與啟用狀態。
| 欄位名稱 | 型別 | 約束 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | 公告唯一識別碼 |
| `content` | `TEXT` | `NOT NULL` | 公告內容 (支援純文字或 Markdown) |
| `is_active` | `BOOLEAN` | `DEFAULT true`| 是否顯示於前台 |
| `created_at` | `TIMESTAMP` | | 建立時間 |
| `updated_at` | `TIMESTAMP` | | 更新時間 |
