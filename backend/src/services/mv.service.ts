import { MVItem } from '../types.js';
import { meiliClient, syncDataToMeili } from './meili.service.js';
import { getMVsFromDB, saveMVsToDB } from './v2_mapper.js';
import { MVModel } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { errorEventEmitter } from './error-events.service.js';
import { logger } from '../utils/logger.js';
import { loadAfterCommit } from './post-commit-cache.js';

// 運行時數據緩存，支持熱更新
let runtimeData: MVItem[] | null = null;
let runtimeDataMap: Map<string, MVItem> | null = null;

type RuntimeDataLoader = () => Promise<MVItem[]>;
type CacheRefreshErrorReporter = (error: unknown) => void;

const reportCacheRefreshError: CacheRefreshErrorReporter = (error) => {
  logger.error({ err: error }, '[MVService] Post-commit runtime cache refresh failed; cache invalidated');
  errorEventEmitter.emitError({
    source: 'request',
    message: `MV update committed but runtime cache refresh failed: ${error instanceof Error ? error.message : String(error)}`,
    stack: error instanceof Error ? error.stack : undefined,
    code: 'MV_CACHE_REFRESH_FAILED',
    details: { phase: 'mv-post-commit-cache-refresh' },
  });
};

export async function refreshRuntimeCacheAfterCommit(
  load: RuntimeDataLoader = getMVsFromDB,
  reportError: CacheRefreshErrorReporter = reportCacheRefreshError,
): Promise<boolean> {
  const result = await loadAfterCommit(load);
  if (result.ok) {
    runtimeData = result.data;
    runtimeDataMap = new Map(result.data.map((mv) => [mv.id, mv]));
    return true;
  }

  runtimeData = null;
  runtimeDataMap = null;
  reportError(result.error);
  return false;
}

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
  // 支持部分更新：合併變動欄位，支持刪除操作
  async updateAllMVs(newData: MVItem[], partial: boolean = false, deletedIds: string[] = []): Promise<UpdateResult> {
    const result: UpdateResult = {
      updated: [],
      deleted: [],
      totalUpdated: 0,
      totalDeleted: 0
    };
    
    let finalData: MVItem[];
    
    if (partial) {
      // 部分更新模式：先與現有 MV 合併，再把完整結果交給 V2 mapper 寫入
      const currentData = await getRuntimeData();
      const dataMap = new Map(currentData.map(mv => [mv.id, mv]));
      const mvsToPersist: MVItem[] = [];
      
      // 處理刪除
      for (const id of deletedIds) {
        if (dataMap.has(id)) {
          dataMap.delete(id);
          result.deleted.push(id);
        }
      }
      
      // 處理更新和新增
      for (const partialMv of newData) {
        const existing = dataMap.get(partialMv.id);
        const merged = existing ? deepMerge(existing, partialMv) : partialMv;
        dataMap.set(partialMv.id, merged);
        mvsToPersist.push(merged);
        result.updated.push({
          id: partialMv.id,
          fields: Object.keys(partialMv),
          images: partialMv.images ? partialMv.images.map((_, i) => i) : []
        });
      }
      
      finalData = Array.from(dataMap.values());
      newData = mvsToPersist;
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

    // 更新成功後，從 DB 重新讀取以確保 runtime cache 與 DB 一致
    // （前端傳來的 partial 資料可能缺少後端生成的欄位，例如新 media 的 id；
    //  若直接用 finalData 寫入 cache，會導致後續 getMVs 回傳沒有 id 的 images，
    //  進而讓 AdminAnnotationsPage 用 url fallback 當 media_id，造成 404。）
    await refreshRuntimeCacheAfterCommit();
    
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

function deepMerge<T>(target: T, source: Partial<T>): T {
  if (Array.isArray(source) && Array.isArray(target)) {
    return mergeArray(target, source) as T;
  }

  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source as T;
  }

  const result: any = { ...(target as any) };

  for (const key of Object.keys(source as any)) {
    if (key === 'id') continue;

    const sourceValue = (source as any)[key];
    const targetValue = (target as any)[key];

    if (sourceValue === undefined) continue;

    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      result[key] = mergeArray(targetValue, sourceValue, key);
    } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

function mergeArray(target: any[], source: any[], key?: string): any[] {
  const sourceHasSparseEntries = source.some((item) => item === null || item === undefined);
  const sourceLooksPartial = sourceHasSparseEntries ||
    (key === 'images' && source.some((item) => isPlainObject(item) && isPartialImageObject(item)));

  if (!sourceLooksPartial) {
    return [...source];
  }

  const result = [...target];
  source.forEach((item, index) => {
    if (item === null || item === undefined) return;

    if (Array.isArray(item) && Array.isArray(result[index])) {
      result[index] = mergeArray(result[index], item);
    } else if (isPlainObject(item) && isPlainObject(result[index])) {
      result[index] = deepMerge(result[index], item);
    } else {
      result[index] = item;
    }
  });

  return result;
}

function isPartialImageObject(value: Record<string, any>): boolean {
  const keys = Object.keys(value);
  if (keys.length === 0) return true;

  return !('url' in value && 'type' in value);
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
