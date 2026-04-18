import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 連接到資料庫 (相容開發環境 src/data 與 生產環境 dist/data)
// 通常在伺服器上執行時，會在 backend 目錄下執行
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

try {
  console.log(`\n🔍 嘗試連接資料庫: ${dbPath}`);
  const db = new Database(dbPath);
  
  console.log('⏳ 正在清除自訂管理員密碼...');
  const result = db.prepare("DELETE FROM auth_settings WHERE key = 'password'").run();
  
  if (result.changes > 0) {
    console.log('✅ 成功清除自訂密碼！');
    console.log('👉 系統已恢復為 .env 中的 ADMIN_PASSWORD 或預設密碼 "zutomayo"');
    console.log('⚠️ 請記得重新啟動後端服務 (例如: pm2 restart ztmy-gallery) 讓設定生效。');
  } else {
    console.log('ℹ️ 資料庫中沒有找到自訂密碼，目前已經是使用初始/環境變數密碼的狀態。');
  }
  
  db.close();
} catch (error) {
  console.error('❌ 發生錯誤:', error);
  console.log('👉 請確保你在 backend 目錄下執行此腳本，並且資料庫檔案存在。');
}
