import 'dotenv/config';
import { sequelize } from './src/models/index.js';
async function changeOwner() {
    try {
        const owner = 'zutomayo_gallery_test';
        // 需要更改所有者的表列表 (也就是圖中顯示所有者為 zutomayo_gallery 的那些表)
        const tablesToChange = [
            'auth_passkeys',
            'auth_settings',
            'fanarts',
            'meta_albums',
            'meta_artists',
            'meta_settings',
            'mvs'
        ];
        console.log(`正在將以下資料表的所有者更改為 ${owner}...`);
        for (const table of tablesToChange) {
            try {
                console.log(`ALTER TABLE "${table}" OWNER TO ${owner};`);
                await sequelize.query(`ALTER TABLE "${table}" OWNER TO ${owner};`);
                console.log(`✅ 成功更改 ${table} 的所有者`);
            }
            catch (e) {
                console.error(`❌ 無法更改 ${table} 的所有者: ${e.message}`);
            }
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to change owner:', error);
        process.exit(1);
    }
}
changeOwner();
