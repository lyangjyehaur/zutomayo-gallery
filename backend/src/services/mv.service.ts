import { MVItem } from '../types.js';
import { meiliClient, syncDataToMeili } from './meili.service.js';
import { getMVsFromDB, saveMVsToDB } from './v2_mapper.js';
import { MVModel } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { errorEventEmitter } from './error-events.service.js';
import { logger } from '../utils/logger.js';

// 運行時數據緩存，支持熱更新
let runtimeData: MVItem[] | null = null;
let runtimeDataMap: Map<string, MVItem> | null = null;
const getRuntimeData = async (): Promise<MVItem[]> => {
  if (!runtimeData) {
    try {
      runtimeData = await getMVsFromDB();
      runtimeDataMap = new Map(runtimeData.map(mv => [mv.id, mv]));
    } catch (e) {
      logger.error({ err: e }, 'Failed to read from DB, returning empty array');
      runtimeData = [];
      runtimeDataMap = new Map();
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
  clearCache(): void {
    runtimeData = null;
    runtimeDataMap = null;
  }

  async getAllMVs(filters: {
    search?: string;
    year?: string;
    album?: string;
    artist?: string;
    sort?: 'asc' | 'desc';
  }): Promise<MVItem[]> {
    let data = await getRuntimeData();

    if (filters.search) {
      try {
        const isProduction = process.env.NODE_ENV === 'production';
        if (!isProduction && !process.env.MEILI_HOST) {
          throw new Error('Skipping Meilisearch in local environment');
        }

        const searchResult = await meiliClient.index('mvs').search(filters.search, {
          limit: 1000, // 取得所有可能的匹配
        });
        
        const matchedIds = searchResult.hits.map(hit => hit.id);
        
        // 依照 Meilisearch 返回的相關度順序重新排序並過濾資料
        data = matchedIds
          .map(id => data.find(mv => mv.id === id))
          .filter((mv): mv is MVItem => mv !== undefined);
          
      } catch (error: any) {
        if (error.message !== 'Skipping Meilisearch in local environment') {
          logger.error({ err: error }, '[MVService] Meilisearch query failed, falling back to memory search');
        }
        // 降級到原本的記憶體搜尋
        const k = filters.search.toLowerCase();
        data = data.filter(mv => 
          mv.title.toLowerCase().includes(k) || 
          mv.keywords.some(key => key.name.toLowerCase().includes(k))
        );
      }
    }

    if (filters.year && filters.year !== 'all') {
      data = data.filter(mv => mv.year === filters.year || mv.date?.startsWith(filters.year!));
    }

    if (filters.artist && filters.artist !== 'all') {
      data = data.filter(mv => mv.creators && mv.creators.some(c => c.name === filters.artist));
    }

    // 只有在沒有使用搜尋（即沒有 Meilisearch 相關度排序）時，才套用預設排序
    if (!filters.search) {
      if (filters.sort === 'desc') return [...data].reverse();
    }
    
    return data;
  }

  async getMVById(id: string): Promise<MVItem | undefined> {
    await getRuntimeData();
    return runtimeDataMap?.get(id);
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
        await MVModel.destroy({ where: {}, transaction: t });
      } else if (deletedIds.length > 0) {
        // 部分更新：只刪除需要刪除的
        await MVModel.destroy({ where: { id: deletedIds }, transaction: t });
      }

      // 寫入/更新資料 (轉交給 V2 映射器)
      if (newData.length > 0) {
        await saveMVsToDB(newData, t);
      }
    });

    // 更新成功後，更新運行時緩存
    runtimeData = finalData;
    runtimeDataMap = new Map(finalData.map(mv => [mv.id, mv]));
    
    // 背景同步至 Meilisearch (不阻塞 API 回應)
    syncDataToMeili().catch(err => {
      logger.error({ err }, '[MVService] Background sync to Meilisearch failed');
      errorEventEmitter.emitError({
        source: 'cron',
        message: `Background Meilisearch sync failed: ${err instanceof Error ? err.message : String(err)}`,
        stack: err instanceof Error ? err.stack : undefined,
        details: { phase: 'mv-sync-meili' },
      });
    });
    
    // 計算總數
    result.totalUpdated = result.updated.length;
    result.totalDeleted = result.deleted.length;
    
    return result;
  }
}
