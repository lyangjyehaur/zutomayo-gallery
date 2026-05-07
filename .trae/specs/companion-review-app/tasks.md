# Tasks

- [x] Task 1: 盤點主前端審核鏈路與 review-app 接管邊界，輸出頁面對照與 API 對照。
  - [x] SubTask 1.1: 逐一盤點 `AdminStagingFanartPage`、`AdminSubmissionsPage`、`AdminFanArtPage`、`AdminMediaGroupRepairPage` 的核心能力與操作順序
  - [x] SubTask 1.2: 確認各工作區對應的後端 API、狀態機、批次操作與風險點
  - [x] SubTask 1.3: 定義哪些能力在第一版就要由 review-app 完整接管，哪些只需保留兼容入口或文檔說明
  - 備註：接管矩陣已落在 `review-app/src/lib/moderation-boundaries.ts` 與設定頁的接管邊界詳情頁中。
  - 備註：目前 staging / submissions / fanart / repair 四個核心工作區都已能在 review-app 直接完成主流程；桌面 admin 主要保留作為大螢幕高密度盤點與鍵盤密集作業的備援入口。

- [x] Task 2: 重構 review-app 的資訊架構與導航外殼，建立完整審核作業台骨架。
  - [x] SubTask 2.1: 設計首頁、暫存區、投稿、FanArt 整理、Group 修復、設定等主工作區路由
  - [x] SubTask 2.2: 以 Framework7 v9 `Views`、`Toolbar/Tabbar`、`Panel`、`Popup`、`Sheet` 規劃手機與平板導航
  - [x] SubTask 2.3: 建立全域狀態切面，處理 auth、工作區入口、篩選條件、最近狀態與深連結
  - 備註：`WorkspaceProvider` 已統一管理最近工作區、各頁篩選條件與首頁快捷入口的深連結上下文。
  - 備註：shell 已補齊六個主工作區 view，並以 tabbar + panel + 工作區 sheet 提供切換。

- [x] Task 3: 完成審核總覽頁，讓管理員能一眼看到全部待辦與系統狀態。
  - [x] SubTask 3.1: 彙整暫存區、投稿、整理與修復相關統計
  - [x] SubTask 3.2: 使用 Framework7 v9 `Gauge`、`Progressbar`、`Block`、`List`、`Button` 組成工作台首頁
  - [x] SubTask 3.3: 提供快捷入口、最近操作與同步狀態回饋
  - [x] SubTask 3.4: 驗證首頁跳轉能正確帶入對應工作區
  - 備註：首頁已整合 staging progress、pending submissions、fanart overview、repair overview，並透過工作區狀態切面保留快捷入口帶入條件。

- [x] Task 4: 完整重做暫存區審核工作區，覆蓋單筆與批量審核流程。
  - [x] SubTask 4.1: 用 Framework7 v9 `Segmented`、`Searchbar`、`List`、`Virtual List`、`Pull To Refresh`、`Infinite Scroll` 實作 pending/rejected 視圖
  - [x] SubTask 4.2: 用頁內 `View`、`Panel`、`Sheet`、`Dialog` 實作詳情檢視、MV/Tag 關聯、確認操作與錯誤回饋
  - [x] SubTask 4.3: 用 `Swipeout` 與顯式批量工具列同時支援快速單筆操作和批量核准/拒絕/還原
  - [x] SubTask 4.4: 接上 crawler trigger、同步進度與刷新邏輯
  - [x] SubTask 4.5: 驗證暫存區結果與桌面 admin 行為一致
  - 備註：`StagingPage` 已補齊同步卡片、搜尋、批量選取、批次通過/拒絕/恢復、詳情 push view、crawler Sheet 與 MV/Tag 關聯 Panel。

- [x] Task 5: 完整重做投稿審核工作區，覆蓋多狀態瀏覽與退回原因流程。
  - [x] SubTask 5.1: 用 Framework7 v9 `Tabs`、`List`、`ListItem`、`Searchbar`、`Popup` 或 `Sheet` 呈現投稿詳情
  - [x] SubTask 5.2: 實作通過與退回流程，退回必填原因並提供清楚回饋
  - [x] SubTask 5.3: 顯示關聯 MV、作者資訊、留言、媒體預覽與審核結果
  - [x] SubTask 5.4: 驗證 pending/approved/rejected 三個視圖切換與刷新
  - 備註：`SubmissionsPage` 已補齊三狀態統計、搜尋、詳情 Popup、退回原因 Sheet、媒體預覽與 Swipeout 審核流。

- [x] Task 6: 在 review-app 中實作 FanArt 整理工作區，接管審核後的整理操作。
  - [x] SubTask 6.1: 覆蓋未整理、已丟棄、舊資料、依 MV、依特殊 Tag 等視圖
  - [x] SubTask 6.2: 實作 media 指派到 group、MV/Tag 更新、丟棄與還原
  - [x] SubTask 6.3: 實作 Twitter/X URL 解析、解析預覽與保存流程
  - [x] SubTask 6.4: 驗證整理後資料、統計與桌面端一致
  - 備註：`FanartPage` 已接管 unorganized / deleted / legacy / organized / parse 視圖與 assign / update / restore / parse 流程。

- [x] Task 7: 在 review-app 中實作 Media Group 修復工作區，接管修復與重解析鏈路。
  - [x] SubTask 7.1: 實作 repair 清單搜尋、篩選、分頁與可推斷來源標示
  - [x] SubTask 7.2: 實作單筆與批量 reparse 流程，含預覽與確認
  - [x] SubTask 7.3: 實作 group metadata 編輯、merge、unassign 等操作
  - [x] SubTask 7.4: 驗證修復操作與桌面端結果一致
  - 備註：`RepairPage` 已接管 repair 清單、來源推斷、補 source_url、reparse preview/apply、edit、merge、unassign 與批量預覽。

- [x] Task 8: 統一 review-app 的互動細節與視覺語言，做成現代流暢的 Framework7 v9 體驗。
  - [x] SubTask 8.1: 統一導航、列表、卡片、工具列、狀態標記與回饋樣式
  - [x] SubTask 8.2: 補齊載入、空狀態、錯誤狀態、成功提示與批量操作過程中的過渡效果
  - [x] SubTask 8.3: 確保手機與平板在手勢、可觸達性、資訊密度上的體驗一致
  - [x] SubTask 8.4: 驗證關鍵流程符合高頻審核場景的效率要求
  - 備註：已新增共用 `ReviewToolbarCard` 與擴充 `review-*` 樣式語彙，統一首頁、暫存、投稿、FanArt、修復、設定的列表工具列、分段切換、尾端提示與 Sheet / Popup 內表單節奏。
  - 備註：`StagingPage`、`SubmissionsPage`、`FanartPage`、`RepairPage` 已補齊更一致的載入 / 空 / 錯 / 搜尋無結果狀態，以及批次工具列、解析 / 重解析預覽、表單區塊與底部過渡提示。
  - 備註：底部 tabbar、工具列按鈕、列表觸控目標與 safe-area 間距已重新校正，手機維持單欄與可伸展操作列，平板則保留較高資訊密度與穩定的視覺節奏。
  - 備註：`review-app` 已於 2026-05-07 重新執行 `npm run lint` 與 `npm run build`，兩者皆通過；build 仍保留既有 Vite chunk size warning，屬後續 bundle 優化議題，不阻塞 Task 8 完成。

- [x] Task 9: 完善 review-app 對應文檔，讓後續維護能清楚理解接管邊界與架構。
  - [x] SubTask 9.1: 更新 `review-app/README.md` 說明資訊架構、頁面角色與啟動方式
  - [x] SubTask 9.2: 更新 `docs-index.md`、`CODE_WIKI.md`、`frontend-memory.md`，記錄 review-app 與主前端 admin 的能力對照
  - [x] SubTask 9.3: 補充 Framework7 v9 主要組件選型理由與工作區映射
  - [x] SubTask 9.4: 確保文檔標明未接管能力、已知限制與後續擴展點
  - 備註：README 已補上工作區對照、Framework7 元件映射與限制說明；總文件也已同步納入接管邊界與 spec 文件入口。

- [x] Task 10: 進行整體驗證，確認 review-app 已可作為主前端審核流程的獨立入口。
  - [x] SubTask 10.1: 驗證登入、首頁、暫存區、投稿、整理、修復等主流程
  - [x] SubTask 10.2: 驗證 build、lint、關鍵頁面互動與 API 串接穩定性
  - [x] SubTask 10.3: 對照桌面 admin 行為，確認資料一致性與無明顯功能缺口
  - 備註：已重新檢查 `LoginPage`、`HomePage`、`StagingPage`、`SubmissionsPage`、`FanartPage`、`RepairPage` 與桌面 admin 對應頁面，確認 review-app 已串上登入、總覽、暫存審核、投稿審核、FanArt 整理、Group 修復的核心 API 與主操作鏈路。
  - 備註：`review-app` 已於 2026-05-07 重新執行 `npm run lint` 與 `npm run build`，兩者皆通過；build 僅保留 Vite chunk size warning，屬於效能優化議題，暫不構成 Task 10 的阻塞缺口。
  - 備註：與桌面 admin 對照後，差異主要落在資訊密度、鍵盤密集作業效率與少量桌面捷徑形式，未發現會阻斷 review-app 作為獨立審核入口的核心功能缺口，因此本任務改為完成，後續體驗打磨仍持續歸在 Task 8。

- [x] Task 11: 補齊 review-app 與主前端 admin 的能力對照文檔，明列接管邊界與未覆蓋項目。
  - [x] SubTask 11.1: 更新 `review-app/README.md`，逐一補上 staging / submissions / fanart / repair 對應主前端頁面、已接管能力、未接管能力與限制
  - [x] SubTask 11.2: 更新 `review-app/src/lib/moderation-boundaries.ts` 與設定頁呈現內容，讓每個工作區都能看到「直接接管 / 保留桌面 admin / 已知限制」而不只列 API 數量
  - [x] SubTask 11.3: 同步更新 `CODE_WIKI.md`、`frontend-memory.md`、`docs-index.md` 的 review-app 入口說明，避免文檔之間對邊界描述不一致
  - 備註：四個工作區現在都已明列對應主前端頁面、直接接管能力、桌面 fallback 情境、已知限制與 API 範圍；checklist 第 14 項已可視為完成。

- [x] Task 12: 對齊 `spec.md`、`tasks.md`、`checklist.md` 的現況描述，移除過時接管敘述並重建分階段驗證基準。
  - [x] SubTask 12.1: 修正 `tasks.md` 中仍寫著「FanArt 整理與 Group 修復先接工作區入口、進階操作保留桌面 admin」的過時備註，與目前程式與 `moderation-boundaries.ts` 對齊
  - [x] SubTask 12.2: 重新盤點 Task 8-10 的完成定義與剩餘缺口，讓任務狀態能真實反映目前已完成實作、未完成文檔與待驗證項
  - [x] SubTask 12.3: 交叉檢查 `spec.md`、`tasks.md`、`checklist.md` 的需求詞彙、接管範圍與驗證標準，確保後續可以直接依文件做分階段實作與驗證
  - 備註：`spec.md` 的前情、Task 1 與 Task 8-10 的現況備註、checklist 第 14 / 15 項已同步校正，不再保留過時的半接管敘述。

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2, Task 3]
- [Task 5] depends on [Task 2, Task 3]
- [Task 6] depends on [Task 1, Task 2]
- [Task 7] depends on [Task 1, Task 2]
- [Task 8] depends on [Task 4, Task 5, Task 6, Task 7]
- [Task 9] depends on [Task 1, Task 8]
- [Task 10] depends on [Task 4, Task 5, Task 6, Task 7, Task 8, Task 9]
- [Task 11] depends on [Task 1, Task 6, Task 7, Task 9]
- [Task 12] depends on [Task 11]
