import 'dotenv/config';
import { SysDictionaryModel } from '../models/index.js';

import { nanoid } from 'nanoid';

// 如果還沒安裝 nanoid，我們等下會裝
async function seedDictionaries() {
  try {
    // 建立簡短好記且具語意化的 ID，例如: dict_album_full
    // 或者我們直接用 category + code 組合當作唯一 ID
    const dicts = [
      // Album Types
      { id: 'dict_album_full', category: 'album_type', code: 'full', label: '完整專輯', description: 'Full Album (Studio Album)', sort_order: 1 },
      { id: 'dict_album_mini', category: 'album_type', code: 'mini', label: '迷你專輯', description: 'Mini Album (EP)', sort_order: 2 },
      { id: 'dict_album_sngl', category: 'album_type', code: 'single', label: '單曲', description: 'Digital/Physical Single', sort_order: 3 },
      { id: 'dict_album_live', category: 'album_type', code: 'live', label: '現場專輯', description: 'Live Album', sort_order: 4 },
      
      // Image Types
      { id: 'dict_img_cover', category: 'image_type', code: 'cover', label: '封面圖', description: 'MV 的官方宣傳封面圖或截圖', sort_order: 1 },
      { id: 'dict_img_offic', category: 'image_type', code: 'official', label: '官方設定圖', description: '官方發布的角色設定、場景設計圖', sort_order: 2 },
      { id: 'dict_img_fanart', category: 'image_type', code: 'fanart', label: '二創圖', description: '來自社群 (如 Twitter, Pixiv) 的二次創作作品', sort_order: 3 },
      
      // Fanart / Group Status
      { id: 'dict_fa_pend', category: 'fanart_status', code: 'pending', label: '待審核', description: '剛從社群平台抓取，尚未經過管理員確認', sort_order: 1 },
      { id: 'dict_fa_orgn', category: 'fanart_status', code: 'organized', label: '已收錄', description: '已確認並收錄至網站展示', sort_order: 2 },
      { id: 'dict_fa_reje', category: 'fanart_status', code: 'rejected', label: '已拒絕', description: '不符合收錄標準，隱藏不顯示', sort_order: 3 },
    ];

    for (const dict of dicts) {
      await SysDictionaryModel.upsert(dict);
    }
    
    console.log('Successfully seeded system dictionaries!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed dictionaries:', error);
    process.exit(1);
  }
}

seedDictionaries();
