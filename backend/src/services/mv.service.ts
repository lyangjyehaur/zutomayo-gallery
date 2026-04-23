import { MVItem } from '../types.js';
import { MV, sequelize } from './pg.service.js';

// 運行時數據緩存，支持熱更新
let runtimeData: MVItem[] | null = null;
const getRuntimeData = async (): Promise<MVItem[]> => {
  if (!runtimeData) {
    try {
      const rows = await MV.findAll();
      
      // 動態讀取所有欄位
      runtimeData = rows.map(row => {
        const mv = row.toJSON() as any;
        
        // 兼容舊版字串格式的 artist
        if (mv.artist) {
          try {
            if (typeof mv.artist === 'string') {
              mv.artist = JSON.parse(mv.artist);
            }
            if (!Array.isArray(mv.artist)) mv.artist = [mv.artist];
          } catch (err) {
            // 解析失敗代表是舊版的純字串，直接包裝成陣列
            mv.artist = [mv.artist];
          }
        } else {
          mv.artist = [];
        }

        return mv as MVItem;
      });
    } catch (e) {
      console.error('Failed to read from DB, returning empty array.', e);
      runtimeData = [];
    }
  }
  return runtimeData || [];
};

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
    let data = [...await getRuntimeData()];

    if (filters.search) {
      const k = filters.search.toLowerCase();
      data = data.filter(mv => 
        mv.title.toLowerCase().includes(k) || 
        mv.keywords.some(key => {
          const text = typeof key === 'string' ? key : key.text;
          return text.toLowerCase().includes(k);
        })
      );
    }

    if (filters.year && filters.year !== 'all') {
      data = data.filter(mv => mv.year === filters.year || mv.date?.startsWith(filters.year!));
    }

    if (filters.artist && filters.artist !== 'all') {
      data = data.filter(mv => mv.artist && mv.artist.includes(filters.artist!));
    }

    // 修正：預設返回原始順序（asc），只有明確要求 desc 才反轉
    if (filters.sort === 'desc') return data.reverse();
    return data;
  }

  async getMVById(id: string): Promise<MVItem | undefined> {
    return (await getRuntimeData()).find(mv => mv.id === id);
  }

  // 預留未來對接資料庫：此處目前操作文件，未來只需改為 DB Query
  // 支持部分更新：直接替換完整 MV 對象，支持刪除操作
  async updateAllMVs(newData: MVItem[], partial: boolean = false, deletedIds: string[] = []): Promise<UpdateResult> {
    const result: UpdateResult = {
      updated: [],
      deleted: [],
      totalUpdated: 0,
      totalDeleted: 0
    };
    
    let finalData: MVItem[];
    
    if (partial) {
      // 部分更新模式：直接用完整 MV 替換
      const currentData = await getRuntimeData();
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
    
    // 更新到資料庫
    await sequelize.transaction(async (t) => {
      if (!partial) {
        // 全量更新：先清空資料庫
        await MV.destroy({ where: {}, transaction: t });
      } else if (deletedIds.length > 0) {
        // 部分更新：只刪除需要刪除的
        await MV.destroy({ where: { id: deletedIds }, transaction: t });
      }

      // 寫入/更新資料
      for (const mv of newData) {
        const mvData = { ...mv };
        // Sequelize JSONB 欄位會自動處理物件/陣列，但如果是 artist 可能是陣列，也給它保持原樣
        // 確保某些可能未定義的欄位為 null 或適當值
        await MV.upsert(mvData as any, { transaction: t });
      }
    });

    // 更新成功後，更新運行時緩存
    runtimeData = finalData;
    
    // 計算總數
    result.totalUpdated = result.updated.length;
    result.totalDeleted = result.deleted.length;
    
    return result;
  }
}