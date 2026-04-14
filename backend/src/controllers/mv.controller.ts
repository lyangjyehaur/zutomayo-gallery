import { Request, Response } from 'express';
import probe from 'probe-image-size';
import { MVService } from '../services/mv.service.js';

const mvService = new MVService();

/**
 * 獲取所有 MV 數據
 * GET /
 */
export const getMVs = async (req: Request, res: Response) => {
    try {
        // 將 query 參數傳遞給 Service 處理過濾與排序
        const data = await mvService.getAllMVs({
            search: req.query.search as string,
            year: req.query.year as string,
            sort: req.query.sort as 'asc' | 'desc'
        });
        res.json(data);
    } catch (error) {
        console.error('[Controller Error - getMVs]:', error);
        res.status(500).json({ error: '無法讀取數據庫文件' });
    }
};

/**
 * 根據 ID 獲取單個 MV 數據
 * GET /:id
 */
export const getMVById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const mv = await mvService.getMVById(id);

        if (!mv) {
            return res.status(404).json({ 
                error: `找不到 ID 為 ${id} 的 MV 數據` 
            });
        }

        res.json(mv);
    } catch (error) {
        console.error(`[Controller Error - getMVById]: ID ${req.params.id}`, error);
        res.status(500).json({ error: '獲取 MV 詳情時發生伺服器錯誤' });
    }
};

/**
 * 批量更新或新增 MV 數據 (對應路由中的 /update)
 */
export const updateMVs = async (req: Request, res: Response) => {
  try {
    const newData = req.body;
    await mvService.updateAllMVs(newData);
    res.json({ message: 'Database_Updated_Successfully' });
  } catch (error) {
    console.error('[Controller Error - updateMVs]:', error);
    res.status(500).json({ message: 'Update Failed', error });
  }
};

/**
 * 偵測圖片尺寸 (對應路由中的 /probe)
 */
export const probeImage = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing image URL in request body' });
    }

    const result = await probe(url, { timeout: 5000 });
    res.json({ width: result.width, height: result.height });
  } catch (error) {
    console.error('[Controller Error - probeImage]:', error);
    res.status(500).json({ message: 'Probe failed', error: (error as Error).message });
  }
};