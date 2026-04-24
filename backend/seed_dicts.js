import 'dotenv/config';
import { SysDictionaryModel } from './src/models/index.js';
async function seedDictionaries() {
    try {
        const dicts = [
            // Album Types
            { id: '11111111-1111-1111-1111-111111111111', category: 'album_type', code: 'full', label: '完整專輯', description: 'Full Album (Studio Album)', sort_order: 1 },
            { id: '22222222-2222-2222-2222-222222222222', category: 'album_type', code: 'mini', label: '迷你專輯', description: 'Mini Album (EP)', sort_order: 2 },
            { id: '33333333-3333-3333-3333-333333333333', category: 'album_type', code: 'single', label: '單曲', description: 'Digital/Physical Single', sort_order: 3 },
            { id: '44444444-4444-4444-4444-444444444444', category: 'album_type', code: 'live', label: '現場專輯', description: 'Live Album', sort_order: 4 },
            // Image Types
            { id: '55555555-5555-5555-5555-555555555555', category: 'image_type', code: 'cover', label: '封面圖', description: 'MV 的官方宣傳封面圖或截圖', sort_order: 1 },
            { id: '66666666-6666-6666-6666-666666666666', category: 'image_type', code: 'official', label: '官方設定圖', description: '官方發布的角色設定、場景設計圖', sort_order: 2 },
            { id: '77777777-7777-7777-7777-777777777777', category: 'image_type', code: 'fanart', label: '二創圖', description: '來自社群 (如 Twitter, Pixiv) 的二次創作作品', sort_order: 3 },
            // Fanart / Group Status
            { id: '88888888-8888-8888-8888-888888888888', category: 'fanart_status', code: 'pending', label: '待審核', description: '剛從社群平台抓取，尚未經過管理員確認', sort_order: 1 },
            { id: '99999999-9999-9999-9999-999999999999', category: 'fanart_status', code: 'organized', label: '已收錄', description: '已確認並收錄至網站展示', sort_order: 2 },
            { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', category: 'fanart_status', code: 'rejected', label: '已拒絕', description: '不符合收錄標準，隱藏不顯示', sort_order: 3 },
        ];
        for (const dict of dicts) {
            await SysDictionaryModel.upsert(dict);
        }
        console.log('Successfully seeded system dictionaries!');
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to seed dictionaries:', error);
        process.exit(1);
    }
}
seedDictionaries();
