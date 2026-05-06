# FanArt 投稿 / 審核系統（Submission System）

本文檔描述「前台可控投稿」的完整落地方案：同時支援 Tweet 解析與檔案上傳、匿名投稿與登入投稿並存、可預先關聯 MV 或特殊標籤（二選一必填）、管理員審核（退回原因/重送）、以及審核通過後進入正式 FanArt 庫並在前台標識為「主動投稿」。

本方案刻意與既有 Twitter 爬蟲暫存審核系統分離（保持 `staging_fanarts` 專注 crawler 來源），但審核操作邏輯與組件可在前後台盡量復用。

---

## 1. 目標與非目標

### 1.1 目標（Goals）
- 前台提供投稿入口，支援：
  - Tweet URL 解析（抓取圖片/影片 URL 與推文資訊）
  - 檔案上傳（image + mp4）
  - 兩者可混合提交
- 投稿者在投稿時可預先關聯 MV（可多選），也可只選特殊標籤（可多選）。
- 約束規則：`mvIds.length > 0` 或 `specialTags.length > 0` 必須成立（不允許兩者皆空）。
- 匿名投稿可用（localStorage 自動保存匿名 token，不提供導出遷移），登入投稿推薦（Email 魔法連結），登入後可跨裝置查看投稿記錄。
- 管理員可審核：通過/退回（必填原因），投稿者可修改被退回項並重新送審。
- 審核通過後：
  - 進入正式 FanArt 庫（現有 media_groups/media/mv_media 流程）
  - 前台 FanArt 頁可篩選/角標標記「主動投稿」
  - 可建立投稿者個人頁（公開資訊由投稿者勾選）
- 通過後不可修改媒體內容，只能：
  - 補充說明
  - 提交「下架申請」（由管理員處理）

### 1.2 非目標（Non-goals）
- 不將投稿內容直接公開（所有投稿必須審核後才能進正式庫）。
- 不提供匿名投稿的資料導出/遷移能力（鼓勵登入後跨裝置管理）。
- 不與 crawler 的 `staging_fanarts` 混用 UI 或資料表（避免操作邏輯互相污染）。

---

## 2. 現有系統可復用點

後端已具備「暫存→審核→寫入正式庫」的成熟模式，主要體現在 crawler 的 staging 系統：
- 既有暫存審核路由（Admin）：[staging-fanart.routes.ts](file:///Users/lyangjyehaur/Projects/zutomayo-gallery/backend/src/routes/staging-fanart.routes.ts)
- 既有審核通過後寫入正式 `MediaGroupModel/MediaModel/MVMediaModel` 的核心流程（含 R2 move/upload）：[staging-fanart.controller.ts](file:///Users/lyangjyehaur/Projects/zutomayo-gallery/backend/src/controllers/staging-fanart.controller.ts)
- 既有 staging 表結構（crawler 專用，仍保留）：[models/index.ts:staging_fanarts](file:///Users/lyangjyehaur/Projects/zutomayo-gallery/backend/src/models/index.ts#L180-L209)

投稿系統的設計會：
- 另建 submission 相關表（保證語義清晰、支援多媒體/帳號/草稿/退回原因）。
- 審核通過時復用「寫入正式庫」流程的核心邏輯（共用 service 或抽出共用函數）。

---

## 3. 角色與使用者故事（User Stories）

### 3.1 投稿者（匿名）
- 我可以不登入直接投稿（tweet 或 upload）。
- 系統會在本機記住我的投稿（localStorage），我可以在同一裝置查看狀態與修改被退回的投稿。
- 我理解清除瀏覽器資料會導致匿名投稿管理權失效。

### 3.2 投稿者（登入）
- 我可以用 Email 魔法連結登入。
- 我可以跨裝置查看「我的投稿」。
- 我可以設定公開資訊（顯示名、社交連結、email 掩碼），並控制是否在公開個人頁顯示。

### 3.3 管理員
- 我可以在後台的「投稿審核」頁面看到待審核投稿。
- 我可以退回並填寫原因，投稿者可以修改後再送審。
- 我可以通過投稿，內容會寫入正式 FanArt 庫並標識為 submission 來源。
- 我可以處理投稿者的下架申請。

---

## 4. 投稿資料模型（DB Schema）

本方案建議新增以下資料表（Sequelize models），並在正式 FanArt 資料中新增最少必要欄位用於標識。

### 4.1 public_users（投稿者帳號）
- `id` (string/uuid/nanoid)
- `email` (unique)
- `display_name` (nullable)
- `social_links` (jsonb, nullable) `{ x, instagram, pixiv, youtube, website }`
- `public_profile_enabled` (boolean, default false)
- `public_profile_fields` (jsonb) `{ display_name: boolean, socials: boolean, email_masked: boolean }`
- `created_at`, `updated_at`

### 4.2 public_auth_tokens（Email 魔法連結）
- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `used_at`
- `created_at`

### 4.3 fanart_submissions（投稿單）
- `id`
- `submitter_user_id` (nullable，匿名投稿為 null)
- `anonymous_token_hash` (nullable，匿名投稿用)
- `status` enum: `draft | pending | approved | rejected | cancelled`
- `note` (text, nullable)
- `contact` (text, nullable，僅 admin 可見)
- `source_type` enum: `tweet | upload | mixed`
- `special_tags` (jsonb array, default [])
- `submitted_at` (nullable)
- `review_reason` (text, nullable)
- `reviewed_by` (string, nullable)
- `reviewed_at` (date, nullable)
- `created_at`, `updated_at`

### 4.4 fanart_submission_media（投稿媒體）
- `id`
- `submission_id`
- `media_type` enum: `image | video`
- `tweet_id` (nullable)
- `original_url` (nullable，tweet 媒體原始連結)
- `r2_key` (nullable，upload 先進 submissions 前綴)
- `r2_url` (nullable)
- `thumbnail_r2_key` / `thumbnail_url` (nullable，video)
- `sha256` (nullable，upload 去重)
- `size_bytes` (nullable)
- `width` / `height` (nullable)
- `created_at`

### 4.5 fanart_submission_mv（投稿預關聯 MV）
- `submission_id`
- `mv_id`

### 4.6 正式 FanArt 標識（建議）
當審核通過，寫入正式 `MediaGroupModel` 時建議補以下欄位：
- `source`：`crawler | submission | ...`
- `submitter_user_id` (nullable)
- `submitter_public_snapshot` (jsonb，僅含允許公開的字段：display_name/social_links/email_masked)

---

## 5. 狀態機與可編輯規則

### 5.1 投稿單狀態（fanart_submissions.status）
- `draft`：草稿（可編輯，可新增/刪除媒體）
- `pending`：送審中（不可編輯媒體，但可撤回為 draft（可選））
- `rejected`：被退回（可編輯，重新送審）
- `approved`：已通過（不可改媒體/MV 關聯/標籤；僅允許補充說明/下架申請）
- `cancelled`：取消（可選，管理員或投稿者可操作）

### 5.2 必填約束（送審時檢查）
送審（draft/rejected → pending）必須滿足：
- `mvIds.length > 0` 或 `specialTags.length > 0`
- `media.length > 0`

---

## 6. API 設計（Backend）

### 6.1 Public Auth（Email 魔法連結）
- `POST /api/public-auth/request-link`
  - body: `{ email, displayName?, redirectUrl? }`
  - behavior: 發送一次性連結（token）
- `POST /api/public-auth/verify`
  - body: `{ token }`
  - behavior: 建立 session cookie（投稿者登入態）
- `GET /api/public-auth/me`
- `POST /api/public-auth/logout`

### 6.2 Submissions（public）
匿名投稿：以 `anonymousToken` 代表管理權（存 localStorage）。登入投稿：以 session cookie 驗證 user。

- `POST /api/submissions`
  - body: `{ mvIds: string[], specialTags: string[], note?, contact? }`
  - return: `{ submission, anonymousToken? }`
- `PUT /api/submissions/:id`
  - body: `{ mvIds?, specialTags?, note?, contact?, publicProfile? }`
  - rule: 只允許 draft/rejected
- `POST /api/submissions/:id/add-tweet`
  - body: `{ tweetUrl }`
  - behavior: 解析 tweet，產生 media entries（image/video），並填入 tweet_id/original_url/source_text/author 等（依需求）
- `POST /api/submissions/:id/upload`（multipart/form-data）
  - rule: 單次最多 10 個，單檔 ≤ 50MB，video 只允許 mp4
  - behavior: 上傳到 R2 `submissions/<submissionId>/...`
- `POST /api/submissions/:id/submit`
  - behavior: 驗證必填條件，draft/rejected → pending
- `GET /api/submissions/my`
  - login required: 返回當前登入者投稿列表
- `GET /api/submissions/local`
  - body/query: `{ ids: string[] }`
  - auth: localStorage 裝置端會帶 `{ id, anonymousToken }` 逐一換取狀態（或提供 batch）
  - 注意：此接口仍需 rate limit，避免被用作枚舉
- `POST /api/submissions/:id/claim`
  - login required + anonymousToken required
  - behavior: 將匿名投稿綁定至帳號

### 6.3 Review（admin）
獨立的後台頁面與路由（不與 crawler staging 混用）：
- `GET /api/admin/submissions?status=pending|rejected|approved&page&limit&source=submission`
- `POST /api/admin/submissions/:id/approve`
  - behavior:
    - 確認 pending
    - 將 R2 `submissions/` 檔案 move 到正式 `fanart/` 前綴（或依既有規則命名）
    - 建立 `media_groups/media/mv_media` 等正式資料
    - 寫入 `source='submission'` 與 `submitter_public_snapshot`
    - submission → approved
- `POST /api/admin/submissions/:id/reject`
  - body: `{ reason }`（必填）
  - behavior: submission → rejected，寫入 `review_reason/reviewed_by/reviewed_at`

### 6.4 Post-approval（補充/下架申請）
投稿者（登入或匿名 token）可：
- `POST /api/submissions/:id/comment`：新增補充說明（只允許 approved）
- `POST /api/submissions/:id/request-takedown`：提交下架申請（只允許 approved）

管理員：
- `GET /api/admin/submissions/takedown-requests?...`
- `POST /api/admin/submissions/takedown-requests/:id/approve|reject`

---

## 7. 儲存與檔名規範（R2）

### 7.1 暫存（未審核）
- `submissions/<submissionId>/<sha256>.<ext>`
- 影片縮圖（若有）：`submissions/<submissionId>/<sha256>_thumb.jpg`

### 7.2 正式（審核通過）
- 目標建議與現有 fanart 命名一致，例如：
  - `fanart/<sha256>.<ext>` 或 `fanarts/<hash>.<ext>`（以你現有策略為準）
- 若需要保留來源：可在 R2 object metadata 寫入 `source=submission`、`submission-id`。

---

## 8. 風控與成本控制

### 8.1 Rate limit
- 對 `/api/submissions/*` 施加更嚴格 limiter（比一般 API 更小的 window/max）。
- 上傳端點單獨 limiter（避免短時間大流量上傳）。

### 8.2 去重
- Tweet：以 `tweet_id + original_url(media_url)` 去重（拒絕或復用）。
- Upload：以 `sha256(file)` 去重。

### 8.3 白名單
- Image：jpg/jpeg/png/webp/gif
- Video：mp4

---

## 9. 前端頁面與互動（Frontend）

### 9.1 投稿入口頁（/:lng/submit）
- 區塊 A：MV 多選（可空）
- 區塊 B：特殊標籤多選（可空）
- 區塊 C：Tweet URL（可多筆）
- 區塊 D：Upload（最多 10 個、單檔 ≤ 50MB、mp4 only）
- 區塊 E：備註/聯絡方式
- CTA：送審（提交前顯示校驗錯誤：MV/標籤二選一、至少一個媒體）
- 匿名模式提示：
  - 「已保存到本機」與「清除瀏覽器資料會失效」
  - 引導登入（登入後可跨裝置查看投稿記錄）

### 9.2 我的投稿
- 登入：`/:lng/me/submissions`
- 匿名：投稿頁內提供「本機投稿」列表（僅顯示 localStorage 擁有的 submission ids）

### 9.3 公開投稿者頁（可選）
- `/:lng/u/:userId` 或 `/:lng/u/:userId/submissions`
- 只有 `public_profile_enabled=true` 才可訪問
- 顯示允許公開的字段（display_name/social/email_masked）

### 9.4 FanArt 頁標識
- 篩選：來源（crawler/submission）
- 卡片角標：SUBMITTED（主動投稿）

---

## 10. Admin 後台（獨立頁面）

新增獨立頁面（不與 crawler staging 混用）：
- `AdminSubmissionsPage`：列表 + 詳情 + approve/reject（必填原因）+ 退回後再送審管理

組件復用策略：
- 列表樣式、詳情預覽（FancyboxViewer）、批次操作交互，可復用 `AdminStagingFanartPage` 的表格/預覽/批次 UI 思路，但資料來源與操作端點完全獨立。

---

## 11. 實施順序（推薦）

1. DB migrations：新增 `public_users/public_auth_tokens/fanart_submissions/fanart_submission_media/fanart_submission_mv`
2. Public auth：Email 魔法連結登入（最小可用）
3. Public submissions：create draft / update / submit / my list / local list
4. Tweet 解析：抽取 tweet 媒體並入 `fanart_submission_media`
5. Upload：multipart 上傳到 R2 submissions 前綴（含檔案限制與 sha256）
6. AdminSubmissionsPage + admin review API：approve/reject + 退回原因
7. Approve 落地：寫入正式 media_groups/media/mv_media + source/submission 標識
8. FanArt 前台標識與篩選
9. Post-approval：補充說明/下架申請

---

## 12. 通知機制 (Notification)

投稿系統整合了統一通知服務 `NotificationService`，在投稿狀態變更時自動推送通知給管理員：

### 12.1 通知觸發時機
- **投稿送審**：當投稿單狀態變更為 `pending`（即投稿者執行 submit 操作）時，呼叫 `NotificationService.send()` 發送通知，讓管理員即時得知有新投稿待審核。

### 12.2 通知渠道
`NotificationService.send({ type, title, body, url })` 為統一入口，會同時觸發以下三個渠道：
- **Bark**：推送到 iOS Bark App
- **Web Push**：透過 `PushService` 發送 VAPID 加密的瀏覽器推播通知
- **Telegram**：透過 `TelegramBotService` 發送 Telegram Bot 訊息

管理員可透過任一已啟用的渠道即時收到新投稿通知，加快審核響應速度。

