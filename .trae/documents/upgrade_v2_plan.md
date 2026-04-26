# Zutomayo Gallery V2 升級計畫

## 摘要
升級生產環境資料庫架構至 V2，包含資料庫遠端備份、本地測試庫匯出、清理生產庫舊表、匯入測試庫資料，最後提交代碼並進行線上部署。

## 當前狀態分析
- 本地測試庫 `zutomayo_gallery_test` 已完成 V2 架構升級與資料轉換。
- 生產庫 `zutomayo_gallery` (位於 `45.147.26.57`) 仍為 V1 架構。
- 您選擇「直接覆蓋原庫」與「建立自動化腳本」的執行方式。
- 為確保生產庫無 V1 殘留表，需先清空目標庫的 `public` schema，再匯入 V2 資料。

## 具體執行步驟 (Proposed Changes)

### 1. 建立自動化腳本 `scripts/upgrade_db_v2.sh`
建立一個 Shell 腳本自動處理備份與匯入：
- **連線資訊設定**：內建遠端與本地的連線變數 (Host, Port, User, Password, DB)。
- **備份生產庫**：使用 `pg_dump` 遠端連線將生產庫匯出為 `prod_v1_backup.sql` 確保安全。
- **匯出測試庫**：將本地的 `zutomayo_gallery_test` 匯出為 `v2_test_data.sql`。
- **清空生產庫**：透過 `psql` 執行 `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` 徹底清除 V1 舊表。
- **匯入新架構**：將 `v2_test_data.sql` 匯入生產庫。

### 2. 執行自動化腳本
- 給予腳本執行權限 `chmod +x scripts/upgrade_db_v2.sh` 並執行。
- 確認腳本執行無報錯，且資料成功寫入生產環境。

### 3. 提交代碼 (Commit)
資料庫更新完成後，將所有已更改的 V2 代碼提交：
```bash
git add .
git commit -m "chore: upgrade database architecture to V2"
git push origin main
```

### 4. 線上部署 (Deploy)
連線至伺服器執行部署：
- 使用 SSH 登入伺服器 `ssh root@45.147.26.57 -p 4649`。
- 在專案目錄下拉取最新代碼並執行已有的 `./deploy.sh` 進行後端或全端更新，讓線上服務套用 V2 代碼。

## 假設與決策
- **連線假設**：假設執行腳本的本地機器已安裝 `postgresql` 客戶端工具 (`pg_dump` 與 `psql`)，且遠端伺服器的 5432 埠允許從本地連線 (基於舊版 `.env` 設定檔的推斷)。
- **覆蓋決策**：採用 `DROP SCHEMA public CASCADE` 的方式能確保不殘留 V1 表結構，避免未來開發混淆。
- **權限決策**：重建 Schema 後會補上 `GRANT ALL ON SCHEMA public TO public;` 以相容不同 PostgreSQL 版本的預設權限差異。

## 驗證步驟
1. 腳本執行完畢後，開啟本地的資料庫管理工具 (如 DBeaver, TablePlus) 連線至生產庫，確認所有表皆為 V2 結構。
2. 部署完成後，存取線上 API (例如 `https://mv.ztmr.club/health`) 確保服務已正常啟動並連接至資料庫。