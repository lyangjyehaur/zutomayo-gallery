import 'dotenv/config';
import { AuthSetting } from '../services/pg.service.js';

async function resetPassword() {
  try {
    console.log(`\n🔍 嘗試連接 PostgreSQL 資料庫...`);
    
    console.log('⏳ 正在清除自訂管理員密碼...');
    const deletedCount = await AuthSetting.destroy({ where: { key: 'password' } });
    
    if (deletedCount > 0) {
      console.log('✅ 成功清除自訂密碼！');
      console.log('👉 系統已恢復為 .env 中的 ADMIN_PASSWORD 或預設密碼 "zutomayo"');
      console.log('⚠️ 請記得重新啟動後端服務 (例如: pm2 restart ztmy-gallery) 讓設定生效。');
    } else {
      console.log('ℹ️ 資料庫中沒有找到自訂密碼，目前已經是使用初始/環境變數密碼的狀態。');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 發生錯誤:', error);
    console.log('👉 請確保你的 PostgreSQL 連線設定 (.env) 正確。');
    process.exit(1);
  }
}

resetPassword();
