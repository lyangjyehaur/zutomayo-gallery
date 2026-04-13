import { MV_DATA } from '../assets/js/data.js';
import { MVItem } from '../../../frontend/src/lib/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MVService {
  async getAllMVs(filters: {
    search?: string;
    year?: string;
    album?: string;
    artist?: string;
    sort?: 'asc' | 'desc';
  }): Promise<MVItem[]> {
    let data = [...(MV_DATA as MVItem[])];

    if (filters.search) {
      const k = filters.search.toLowerCase();
      data = data.filter(mv => 
        mv.title.toLowerCase().includes(k) || 
        mv.keywords.some(key => key.toLowerCase().includes(k))
      );
    }

    if (filters.year && filters.year !== 'all') {
      data = data.filter(mv => mv.year === filters.year || mv.date.startsWith(filters.year));
    }

    if (filters.artist && filters.artist !== 'all') {
      data = data.filter(mv => mv.artist === filters.artist);
    }

    // 修正：預設返回原始順序（asc），只有明確要求 desc 才反轉
    if (filters.sort === 'desc') return data.reverse();
    return data;
  }

  async getMVById(id: string): Promise<MVItem | undefined> {
    return (MV_DATA as MVItem[]).find(mv => mv.id === id);
  }

  // 預留未來對接資料庫：此處目前操作文件，未來只需改為 DB Query
  async updateAllMVs(newData: MVItem[]): Promise<void> {
    const filePath = path.resolve(__dirname, '../assets/js/data.js');
    
    // 將數據包裝回 ESM 格式
    const fileContent = `export const MV_DATA = ${JSON.stringify(newData, null, 4)};`;
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, fileContent, 'utf8', (err) => {
        if (err) {
          console.error('文件回寫失敗:', err);
          reject(err);
        } else {
          // 更新成功後，如果需要，可以在這裡通知 ImageSyncService 重新掃描
          resolve();
        }
      });
    });
  }
}