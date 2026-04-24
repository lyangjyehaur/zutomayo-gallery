import { Request, Response, NextFunction } from 'express';
import { AlbumModel, sequelize } from '../models/index.js';

export const getAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albums = await AlbumModel.findAll({
      order: [['release_date', 'DESC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: albums });
  } catch (error) {
    next(error);
  }
};

export const updateAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { albums, deletedIds } = req.body;
    
    await sequelize.transaction(async (t: any) => {
      if (deletedIds && deletedIds.length > 0) {
        await AlbumModel.destroy({
          where: { id: deletedIds },
          transaction: t
        });
      }
      
      if (albums && albums.length > 0) {
        for (const album of albums) {
          await AlbumModel.upsert({
            id: album.id,
            name: album.name,
            type: album.type || null,
            release_date: album.release_date ? new Date(album.release_date) : null,
            cover_image_url: album.cover_image_url || '',
            hide_date: album.hide_date || false
          }, { transaction: t });
        }
      }
    });

    const updatedAlbums = await AlbumModel.findAll({
      order: [['release_date', 'DESC'], ['name', 'ASC']]
    });
    
    res.json({ success: true, data: updatedAlbums });
  } catch (error) {
    next(error);
  }
};
