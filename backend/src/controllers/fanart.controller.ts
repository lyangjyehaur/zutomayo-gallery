import { Request, Response } from 'express';
import { Fanart } from '../services/pg.service.js';

export const getUnorganizedFanarts = async (req: Request, res: Response) => {
  try {
    const rows = await Fanart.findAll({
      where: { status: 'unorganized' },
      order: [['createdAt', 'DESC']]
    });
    
    // 解析 media JSON
    const data = rows.map((row) => {
      const json = row.toJSON() as any;
      return {
        ...json,
        media: typeof json.media === 'string' ? JSON.parse(json.media) : json.media
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateFanartStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'organized' or 'unorganized' or 'deleted'

    if (status === 'deleted') {
      await Fanart.destroy({ where: { id } });
    } else {
      await Fanart.update({ status }, { where: { id } });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
