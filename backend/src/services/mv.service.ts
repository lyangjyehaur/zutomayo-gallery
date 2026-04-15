import { MV_DATA } from '../assets/js/data.js';

// 運行時數據緩存，支持熱更新
let runtimeData: MVItem[] | null = null;
const getRuntimeData = (): MVItem[] => {
  if (!runtimeData) {
    runtimeData = [...(MV_DATA as MVItem[])];
  }
  return runtimeData;
};
import { MVItem } from '../../../frontend/src/lib/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 更新結果類型
export interface UpdateResult {
  updated: Array<{
    id: string;
    fields: string[];
    images?: number[];
  }>;
  deleted: string[];
  totalUpdated: number;
  totalDeleted: number;
}

export class MVService {
  async getAllMVs(filters: {
    search?: string;
    year?: string;
    album?: string;
    artist?: string;
    sort?: 'asc' | 'desc';
  }): Promise<MVItem[]> {
    let data = [...getRuntimeData()];

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
    return getRuntimeData().find(mv => mv.id === id);
  }

  // 預留未來對接資料庫：此處目前操作文件，未來只需改為 DB Query
  // 支持部分更新：直接替換完整 MV 對象，支持刪除操作
  async updateAllMVs(newData: MVItem[], partial: boolean = false, deletedIds: string[] = []): Promise<UpdateResult> {
    const filePath = path.resolve(__dirname, '../assets/js/data.js');
    
    const result: UpdateResult = {
      updated: [],
      deleted: [],
      totalUpdated: 0,
      totalDeleted: 0
    };
    
    let finalData: MVItem[];
    
    if (partial) {
      // 部分更新模式：直接用完整 MV 替換
      const currentData = getRuntimeData();
      const dataMap = new Map(currentData.map(mv => [mv.id, mv]));
      
      // 處理刪除
      for (const id of deletedIds) {
        if (dataMap.has(id)) {
          dataMap.delete(id);
          result.deleted.push(id);
        }
      }
      
      // 處理更新和新增（前端已發送完整 MV）
      for (const fullMv of newData) {
        dataMap.set(fullMv.id, fullMv);
        result.updated.push({
          id: fullMv.id,
          fields: Object.keys(fullMv),
          images: fullMv.images ? fullMv.images.map((_, i) => i) : []
        });
      }
      
      finalData = Array.from(dataMap.values());
    } else {
      // 全量更新模式：直接替換（也處理刪除）
      const dataMap = new Map(newData.map(mv => [mv.id, mv]));
      for (const id of deletedIds) {
        dataMap.delete(id);
        result.deleted.push(id);
      }
      finalData = Array.from(dataMap.values());
      
      // 全量模式下所有項目都視為已更新
      result.updated = finalData.map(mv => ({
        id: mv.id,
        fields: Object.keys(mv),
        images: mv.images ? mv.images.map((_, i) => i) : []
      }));
    }
    
    // 將數據包裝回 ESM 格式
    const fileContent = `export const MV_DATA = ${JSON.stringify(finalData, null, 4)};`;
    
    // 使用 fs.promises 確保檔案完全寫入後才返回
    await fs.promises.writeFile(filePath, fileContent, 'utf8');
    
    // 更新成功後，更新運行時緩存
    runtimeData = finalData;
    
    // 計算總數
    result.totalUpdated = result.updated.length;
    result.totalDeleted = result.deleted.length;
    
    return result;
  }
}