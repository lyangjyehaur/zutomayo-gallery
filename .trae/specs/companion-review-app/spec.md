# Review App 全量審核接管 Spec

## Why

`review-app` 目前已具備登入、審核總覽、暫存區、投稿、FanArt 整理、Media Group 修復與設定等主要工作區，核心審核鏈路已可獨立完成；但文件、設定頁與 spec/tasks/checklist 對「接管邊界、桌面 fallback 情境、已知限制」的描述仍未完全對齊。部分早期文字仍把 FanArt / Repair 寫成僅接入口的過渡狀態，容易讓後續維護者誤判目前能力範圍，因此需要把能力矩陣與驗證基準同步校正。

## What Changes

- 將 `review-app` 的定位從「陪伴式審核小工具」升級為「可獨立接管主前端審核流程的完整作業台」。
- 重構 review-app 的資訊架構與頁面分層，至少覆蓋：登入/權限、審核總覽、暫存區審核、投稿審核、FanArt 整理、Media Group 修復、通知與偏好設定。
- 依照 Framework7 v9 官方組件能力重新設計主要互動，優先活用 `Views`、`View`、`Toolbar/Tabbar`、`Panel`、`Popup`、`Sheet`、`Searchbar`、`List/ListItem`、`Virtual List`、`Swipeout`、`Gauge`、`Progressbar`、`Segmented`、`Tabs`、`Toggle`、`Dialog`、`Toast`。
- 將已完成的工作區能力正式納入規格基線，明列各工作區對應主前端頁面、直接接管能力、桌面 fallback 情境與已知限制。
- 同步校正 `review-app/README.md`、`CODE_WIKI.md`、`frontend-memory.md`、`docs-index.md` 與 `.trae/specs/companion-review-app/{spec,tasks,checklist}.md`，避免描述彼此衝突。
- **BREAKING**：review-app 不再以現有三頁式骨架為中心演進，將改為以完整審核作業台為核心重構路由、導航、狀態管理與頁面關係。

## Impact

- Affected specs: `companion-review-app`
- Affected code: `review-app/src/*`、`review-app/README.md`、`docs-index.md`、`CODE_WIKI.md`、`frontend-memory.md`、`.trae/specs/companion-review-app/*`

## ADDED Requirements

### Requirement: 審核作業台外殼
系統 SHALL 提供一個以 Framework7 v9 為核心的獨立審核作業台外殼，能在不依賴主前端桌面布局的前提下完成完整審核工作。

#### Scenario: 已登入管理員進入審核作業台
- **WHEN** 管理員成功登入 `review-app`
- **THEN** 系統顯示完整審核工作台，而不是只顯示基礎首頁與兩個列表
- **AND** 導航可直達總覽、暫存區、投稿、FanArt 整理、Group 修復與設定

#### Scenario: 多裝置導覽一致
- **WHEN** 使用者在手機或平板上操作
- **THEN** 系統分別以 tabbar、panel、popup/sheet 等 Framework7 模式提供一致的審核體驗

### Requirement: 審核總覽與工作入口
系統 SHALL 提供一個工作台首頁，用來彙總各條審核鏈路的狀態、待辦量與快捷入口。

#### Scenario: 管理員查看總覽
- **WHEN** 管理員打開工作台首頁
- **THEN** 系統顯示暫存區待審/已通過/已拒絕數量、投稿待審數量、重解析/修復待處理量與最後同步狀態
- **AND** 首頁提供快捷入口可直達對應工作區

#### Scenario: 後台同步或批次作業進行中
- **WHEN** 暫存區同步進行中或有批次作業執行中
- **THEN** 系統以 `Gauge`、`Progressbar` 或等效元件顯示當前進度與狀態

### Requirement: 暫存區審核工作區
系統 SHALL 完整承接主前端 `AdminStagingFanartPage` 的核心審核能力。

#### Scenario: 查看待審與已拒絕列表
- **WHEN** 管理員進入暫存區工作區
- **THEN** 系統可切換 `pending` 與 `rejected` 視圖
- **AND** 顯示圖像/影片預覽、作者資訊、來源資訊、分頁或無限滾動載入結果

#### Scenario: 單筆核准或拒絕
- **WHEN** 管理員在暫存區卡片上執行核准或拒絕
- **THEN** 核准流程允許選擇一個或多個 MV/標籤關聯
- **AND** 拒絕後列表與進度統計會同步更新

#### Scenario: 批量審核與批量還原
- **WHEN** 管理員勾選多筆暫存資料
- **THEN** 系統允許批量核准、批量拒絕與對已拒絕資料批量還原
- **AND** 提交前顯示明確確認與影響數量

#### Scenario: 觸發 crawler 與監看同步進度
- **WHEN** 管理員從暫存區工作區手動觸發 crawler
- **THEN** 系統顯示任務啟動結果、同步狀態、進度條與刷新能力

### Requirement: 投稿審核工作區
系統 SHALL 完整承接主前端 `AdminSubmissionsPage` 的核心審核能力。

#### Scenario: 查看不同狀態的投稿
- **WHEN** 管理員進入投稿工作區
- **THEN** 系統可切換 `pending`、`approved`、`rejected` 視圖
- **AND** 顯示投稿預覽、作者、關聯 MV、留言與審核結果

#### Scenario: 投稿通過
- **WHEN** 管理員對投稿執行通過
- **THEN** 系統呼叫現有投稿通過 API，並在成功後更新列表與待辦數

#### Scenario: 投稿退回
- **WHEN** 管理員對投稿執行退回
- **THEN** 系統要求輸入退回原因
- **AND** 送出後刷新該列表並保留對應狀態資訊

### Requirement: FanArt 整理工作區
系統 SHALL 提供 FanArt 整理能力，以接管主前端 `AdminFanArtPage` 中與審核後整理直接相關的操作。

#### Scenario: 查看未整理、已丟棄、舊資料與 MV/Tag 分類
- **WHEN** 管理員進入 FanArt 整理工作區
- **THEN** 系統可切換未整理、已丟棄、舊資料、依 MV、依特殊 Tag 等多種視圖

#### Scenario: 將 media 指派到 group 與 MV/Tag
- **WHEN** 管理員對未整理 media 執行指派
- **THEN** 系統允許選擇目標 group 與一個或多個 MV/Tag
- **AND** 成功後刷新相關 MV/Tag 統計

#### Scenario: 更新既有關聯、丟棄或還原
- **WHEN** 管理員在 FanArt 整理工作區更新 media 關聯、丟棄 group 或還原 group
- **THEN** 系統反映最新的 group 狀態與對應分類數量

#### Scenario: 解析推文並保存為新 FanArt
- **WHEN** 管理員輸入 Twitter/X 貼文 URL 並執行解析
- **THEN** 系統顯示解析預覽、支援挑選 MV/Tag 後保存

### Requirement: Media Group 修復工作區
系統 SHALL 提供 group 修復能力，以接管主前端 `AdminMediaGroupRepairPage` 的修復鏈路。

#### Scenario: 搜尋修復清單
- **WHEN** 管理員進入 Group 修復工作區
- **THEN** 系統可搜尋、篩選與分頁瀏覽待修復 group
- **AND** 顯示缺失來源、缺失時間、可推斷來源等狀態

#### Scenario: 重解析 group
- **WHEN** 管理員對單筆或多筆 group 執行 reparse
- **THEN** 系統可先顯示待套用的來源推斷/預覽，再執行重解析

#### Scenario: 編輯、合併或解除關聯
- **WHEN** 管理員編輯 group metadata、將 group 合併到其他目標，或將其 unassign 成 orphan
- **THEN** 系統顯示清楚的確認流程與成功/失敗回饋

### Requirement: 審核詳情與預覽互動
系統 SHALL 提供一致的詳情檢視與媒體預覽能力，避免使用者在列表中進行高風險操作時缺少上下文。

#### Scenario: 查看媒體詳情
- **WHEN** 管理員從任一審核列表打開詳情
- **THEN** 系統以 `Popup`、`Sheet` 或獨立 `View` 顯示媒體、作者、來源、標籤、MV 關聯與可執行動作

#### Scenario: 行動端快速操作
- **WHEN** 管理員在列表項上執行快速操作
- **THEN** 系統可透過 `Swipeout`、`Actions` 或等效互動提供低摩擦但可撤回/可確認的操作入口

### Requirement: 搜尋、篩選與狀態保留
系統 SHALL 在各審核工作區保留使用者的操作上下文，降低頻繁切換流程時的成本。

#### Scenario: 使用者切換工作區再返回
- **WHEN** 使用者離開後再回到同一工作區
- **THEN** 系統保留合理範圍內的篩選條件、分頁位置、選中狀態或最近使用的視圖

#### Scenario: 大量資料檢索
- **WHEN** 工作區資料量很大
- **THEN** 系統使用 `Searchbar`、`Virtual List`、分段切換與增量載入維持可用性與效能

### Requirement: 文檔與接管邊界
系統 SHALL 將 review-app 可接管的主前端審核能力、未接管能力與對應 API 清楚記錄在文檔中。

#### Scenario: 新成員接手 review-app
- **WHEN** 新成員閱讀專案文檔
- **THEN** 能快速知道 review-app 對應主前端哪些頁面、承接哪些 API 與有哪些尚未覆蓋的限制

#### Scenario: 管理員在設定頁查看接管邊界
- **WHEN** 管理員打開 `review-app` 的設定頁並進入接管邊界詳情頁
- **THEN** 系統集中顯示每個工作區對應主前端頁面、直接接管能力、保留桌面 admin 的情境、已知限制與 API 範圍

### Requirement: 規格文件一致性
系統 SHALL 讓 `spec.md`、`tasks.md`、`checklist.md` 對 review-app 的接管範圍、未覆蓋項目與驗證標準使用一致詞彙。

#### Scenario: 團隊更新接管邊界
- **WHEN** review-app 新增或調整審核工作區能力
- **THEN** `spec.md`、`tasks.md`、`checklist.md` 同步更新
- **AND** 不再保留「FanArt 整理與 Group 修復只接入口」之類的過時敘述

## MODIFIED Requirements

### Requirement: Review App 定位
系統 SHALL 將 `review-app` 視為審核流程的獨立主界面，而不是只提供「臨時查看待審列表」的陪伴式工具。

### Requirement: Admin Moderation Access
系統 SHALL 延用既有管理員 session / passkey / 通知偏好機制，但在 review-app 中補齊與完整審核工作台相匹配的頁面進入、狀態恢復與回饋機制。

## REMOVED Requirements

### Requirement: 僅限三頁基礎審核
**Reason**: 舊規格只覆蓋登入、首頁、暫存區與投稿兩條最小路徑，無法支撐主前端管理頁面的全量審核能力。
**Migration**: 後續實作以「完整審核作業台」為準，原本只為最小可用版本設計的頁面與流程需重新分層、拆頁與補足交互。
