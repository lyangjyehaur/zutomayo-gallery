# Zutomayo Gallery API & Database Architecture (V2)

本文檔詳細記錄了 **Zutomayo Gallery (Phase 3)** 的全新關聯式資料庫架構 (V2) 以及前後端 API 交互的資料結構。
請未來的 AI 助手在進行功能開發或除錯時，**務必以此文件為準**，切勿使用舊版 (V1) 的扁平化 JSON 結構 (如 `artist`, `album`, `coverImages`)。

---

## 1. 資料庫 Schema (關聯式模型)

底層採用 PostgreSQL，並透過 Sequelize ORM 進行映射。系統以 `mvs` 表為核心，將所有多元屬性拆分為獨立實體表，並透過中繼表建立多對多 (N:M) 關聯。

### 核心實體表 (Entities)
- **`mvs`**: 儲存 MV 核心資訊 (ID, Title, Year, Date, YouTube, Bilibili, Description)。
- **`images`**: 儲存所有圖片 (包含官方 Cover、Gallery、FanArt)。
  - `type`: `'cover'` | `'official'` | `'fanart'`
  - `original_url`: 圖片原始來源網址 (唯一鍵)。
  - `url`: 備份至 R2 後的網址 (前端實際讀取的網址)。
- **`artists`**: 儲存創作者/畫師名稱 (唯一鍵)。
- **`albums`**: 儲存專輯名稱 (唯一鍵)。
- **`keywords`**: 儲存搜尋標籤/關鍵字 (唯一鍵)。

### 擴展屬性表 (Extensions)
- **`fanart_metadata`**: 針對 `images` 表中 `type='fanart'` 的擴展屬性。
  - 關聯：`image_id` (1:1 對應 `images.id`)。
  - 欄位：`tweet_url`, `tweet_text`, `tweet_author`, `tweet_handle`, `tweet_date`, `status`。

### 中繼關聯表 (Junction Tables)
- **`mv_images`**: 關聯 `mvs` 與 `images`。
  - `usage`: `'cover'` (封面圖) | `'gallery'` (相簿/設定資料/二創圖)。
  - `order_index`: 控制圖片在前端顯示的排序。
- **`artist_images`**: 關聯 `artists` 與 `images` (用於標記單張圖片的具體畫師，例如多畫師合作 MV 中的特定場景圖或二創圖)。
- **`mv_artists`**: 關聯 `mvs` 與 `artists`。
- **`mv_albums`**: 關聯 `mvs` 與 `albums`。
- **`mv_keywords`**: 關聯 `mvs` 與 `keywords`。

---

## 2. API 資料結構 (`MVItem` Interface)

前端與後端溝通的唯一資料介面。API (如 `GET /api/mvs`) 會將上述關聯式資料庫的資料，透過 Sequelize 的 `include` 巢狀 JOIN 抓取出來，回傳給前端。

### TypeScript 介面定義
```typescript
export interface MVImage {
  id?: string;
  type: string;             // 'cover', 'official', 'fanart'
  url: string;              // R2 圖片網址
  original_url?: string;    // 原始圖片網址 (如 Twitter 原圖)
  thumbnail_url?: string;   // 縮圖網址
  caption?: string;         // 圖片描述
  width?: number;
  height?: number;
  
  // 當 type === 'fanart' 時，會 JOIN 出這包擴展資料
  fanart_meta?: {
    tweet_url?: string;
    tweet_text?: string;
    tweet_author?: string;
    tweet_handle?: string;
    tweet_date?: string;
  };
  
  // 中繼表的關聯資料
  MVImage?: {
    usage: string;          // 'cover' 或 'gallery'
    order_index: number;    // 排序權重
  };
  [key: string]: any;
}

export interface MVCreator {
  id?: string;
  name: string;             // 畫師名稱
}

export interface MVAlbum {
  id?: string;
  name: string;             // 專輯名稱
}

export interface MVKeyword {
  id?: string;
  name: string;             // 關鍵字
}

export interface MVItem {
  id: string;
  title: string;
  year: string;
  date: string;
  youtube: string;
  bilibili: string;
  description: string;
  
  // 以下為 V2 新增的巢狀陣列結構 (取代了 V1 的字串陣列)
  creators: MVCreator[];
  albums: MVAlbum[];
  keywords: MVKeyword[];
  
  // 所有的圖片 (包含封面與相簿) 全部統一放在 images 陣列中
  images: MVImage[];
}
```

---

## 3. 前端實作與操作指南

### 3.1. 獲取封面圖片 (Cover Images)
V2 架構**已經徹底移除了 `coverImages` 欄位**。
若要在前端 (如 `MVCard.tsx`) 取得封面圖，必須從 `images` 陣列中，過濾出中繼表屬性 `MVImage.usage === 'cover'` 的圖片：
```typescript
const coverUrls = mv.images
  ?.filter(img => img.MVImage?.usage === 'cover')
  .map(img => img.url) || [];
```

### 3.2. 獲取設定資料/二創圖 (Gallery / FanArt)
若要在燈箱或 FanArt 頁面顯示相簿，必須過濾掉封面圖 (`usage !== 'cover'`)：
```typescript
const galleryImages = mv.images
  ?.filter(img => img.MVImage?.usage !== 'cover') || [];
```

### 3.3. 獲取畫師與專輯 (Creators & Albums)
V1 的 `mv.artist` 與 `mv.album` (字串陣列) 已被廢棄。
V2 必須讀取 `creators` 與 `albums` 物件陣列，並提取其 `.name` 屬性：
```typescript
// 取得所有畫師名稱字串陣列
const artistNames = (mv.creators || []).map(c => c.name);

// 判斷是否包含特定專輯
const hasAlbum = (mv.albums || []).some(a => a.name === targetAlbumName);
```

### 3.4. 獲取二創圖推特詮釋資料 (FanArt Meta)
V1 中圖片根目錄的 `tweetUrl`, `tweetAuthor` 等欄位已被廢棄。
V2 將這些資料統一收攏在 `fanart_meta` 物件中：
```typescript
const tweetUrl = img.fanart_meta?.tweet_url;
const tweetAuthor = img.fanart_meta?.tweet_author;
```

---

## 4. 後端儲存邏輯 (`v2_mapper.ts`)

當前端在後台 (`AdminPage.tsx`) 編輯完 `MVItem` 並發送 `PUT /api/mvs` 時，後端 `saveMVsToDB` 函數會執行以下拆解與寫入邏輯：

1. **核心資料**：更新 `mvs` 主表。
2. **處理關聯實體**：
   - 遍歷 `creators`, `albums`, `keywords`。
   - 使用 `findOrCreate` 在獨立表中建立/獲取 ID。
   - 清空該 MV 舊的中繼關聯 (`mv_artists`, `mv_albums`, `mv_keywords`)，並寫入新的關聯。
3. **處理圖片 (`images`)**：
   - 遍歷前端傳來的 `images` 陣列。
   - 使用 `original_url` (或 `url`) 作為唯一鍵，在 `images` 表 `findOrCreate`。
   - 如果是 `type === 'fanart'`，則將 `fanart_meta` 內的資料 `upsert` 至 `fanart_metadata` 表。
   - 寫入 `mv_images` 中繼表，記錄這張圖片是屬於這個 MV 的 `cover` 還是 `gallery`，以及它的 `order_index`。

---

## 5. Meilisearch 搜尋同步 (`meili.service.ts`)

由於 Meilisearch 需要扁平化的文字結構來進行全文檢索，後端在同步資料至 Meilisearch 引擎時，會將巢狀關聯「降維」成純字串陣列：
```typescript
const mvDocs = mvs.map(mv => ({
  id: mv.id,
  title: mv.title,
  description: mv.description,
  artist: mv.creators?.map(c => c.name) || [],  // 降維為字串陣列
  album: mv.albums?.map(a => a.name) || [],     // 降維為字串陣列
  keywords_text: mv.keywords?.map(k => k.name) || [], // 降維為字串陣列
  year: mv.year,
  date: mv.date ? new Date(mv.date).getTime() : null,
}));
```
前端呼叫搜尋 API 時，無需改變任何邏輯，Meilisearch 會在背後以這些扁平化的字串進行高效比對，最後回傳匹配的 MV ID，後端再根據 ID 返回完整的 V2 關聯結構。