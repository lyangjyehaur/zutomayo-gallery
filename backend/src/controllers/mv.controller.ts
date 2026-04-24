import { Request, Response, NextFunction } from 'express';
import probe from 'probe-image-size';
import { MVService } from '../services/mv.service.js';
import { MVItem } from '../types.js';
import { 
  validateQuery, 
  validateId, 
  validateProbe, 
  validateMVs 
} from '../validators/mv.validator.js';
import { ZodError } from 'zod';
import { getMetadata as getMeta, saveMetadata as saveMeta } from '../services/metadata.service.js';

import { TwitterService } from '../services/twitter.service.js';

const mvService = new MVService();

// 統一錯誤處理輔助函數
const handleError = (res: Response, error: unknown, context: string) => {
  console.error(`[${context}]:`, error);
  
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: '輸入驗證失敗',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  
  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      error: '服務器內部錯誤',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
  
  return res.status(500).json({
    success: false,
    error: '未知錯誤',
  });
};

/**
 * 獲取所有 MV 數據
 * GET /
 */
export const getMVs = async (req: Request, res: Response) => {
    try {
        // 驗證輸入參數
        const validatedQuery = validateQuery(req.query);
        
        // 將 query 參數傳遞給 Service 處理過濾與排序
        const data = await mvService.getAllMVs({
            search: validatedQuery.search,
            year: validatedQuery.year,
            album: validatedQuery.album,
            artist: validatedQuery.artist,
            sort: validatedQuery.sort
        });
        
        res.json({
          success: true,
          data,
          count: data.length,
        });
    } catch (error) {
        handleError(res, error, 'Controller Error - getMVs');
    }
};

/**
 * 根據 ID 獲取單個 MV 數據
 * GET /:id
 */
export const getMVById = async (req: Request, res: Response) => {
    try {
        // 驗證 ID
        const id = validateId(req.params.id);
        const mv = await mvService.getMVById(id);

        if (!mv) {
            return res.status(404).json({ 
                success: false,
                error: `找不到 ID 為 ${id} 的 MV 數據` 
            });
        }

        res.json({
          success: true,
          data: mv,
        });
    } catch (error) {
        handleError(res, error, 'Controller Error - getMVById');
    }
};

/**
 * 批量更新或新增 MV 數據 (對應路由中的 /update)
 * 支持部分更新：只更新變動的字段
 */
export const updateMVs = async (req: Request, res: Response) => {
  try {
    const { data: updateData, partial, deletedIds: reqDeletedIds } = req.body;
    
    if (!Array.isArray(updateData)) {
      return res.status(400).json({
        success: false,
        error: '請求格式錯誤，data 必須是數組'
      });
    }
    
    // 提取刪除標記
    const deletedIds = reqDeletedIds || (updateData as any)._deleted || [];
    
    // 驗證輸入數據 (不需要再手動過濾 deletedIds，因為前端若要保留該 ID 的資料，就代表這是一次重建/改名復原操作)
    const validatedData = validateMVs(updateData) as MVItem[];
    
    // 執行更新（支持部分更新邏輯）
    const updateResult = await mvService.updateAllMVs(validatedData, partial === true, deletedIds);
    
    res.json({ 
      success: true,
      message: partial ? 'Database_Partial_Updated_Successfully' : 'Database_Updated_Successfully',
      details: updateResult,
    });
  } catch (error) {
    handleError(res, error, 'Controller Error - updateMVs');
  }
};

/**
 * 偵測圖片尺寸 (對應路由中的 /probe)
 */
export const probeImage = async (req: Request, res: Response) => {
  try {
    // 驗證輸入
    const { url } = validateProbe(req.body);
    
    // 添加超時和大小限制
    const result = await probe(url, { 
      timeout: 10000,
    });
    
    res.json({
      success: true,
      data: {
        width: result.width, 
        height: result.height,
        type: result.type,
        url: result.url,
      },
    });
  } catch (error) {
    handleError(res, error, 'Controller Error - probeImage');
  }
};

export const getMetadata = async (req: Request, res: Response) => {
  try {
    const metadata = await getMeta();
    res.json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '無法獲取 Metadata' });
  }
};

export const updateMetadata = async (req: Request, res: Response) => {
  try {
    await saveMeta(req.body);
    const updated = await getMeta();
    res.json({ success: true, metadata: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '無法更新 Metadata' });
  }
};

/**
 * 解析推文連結，提取真實媒體資源
 * POST /twitter-resolve
 */
export const resolveTwitterMedia = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: '請提供有效的推文連結' });
    }

    const mediaList = await TwitterService.extractMediaFromTweet(url);
    
    res.json({
      success: true,
      data: mediaList
    });
  } catch (error: any) {
    handleError(res, error, 'Controller Error - resolveTwitterMedia');
  }
};