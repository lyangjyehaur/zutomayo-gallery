import { Request, Response } from 'express';
import { MediaModel, MediaGroupModel } from '../models/index.js';

export const getUnorganizedFanarts = async (req: Request, res: Response) => {
  try {
    const rows = await MediaGroupModel.findAll({
      where: { status: 'unorganized' },
      include: [{ model: MediaModel, as: 'images' }],
      order: [['post_date', 'DESC'], ['id', 'DESC']]
    });
    
    // 格式化資料以相容前端
    const data = rows.map((row) => {
      const group = row.toJSON() as any;
      return {
        ...group,
        media: group.images || []
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
      await MediaGroupModel.destroy({ where: { id } });
    } else {
      await MediaGroupModel.update({ status }, { where: { id } });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
