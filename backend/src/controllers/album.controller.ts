import { Request, Response, NextFunction } from 'express';
import { AlbumModel, AppleMusicAlbumModel, sequelize } from '../models/index.js';

export const getAppleMusicAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albums = await AppleMusicAlbumModel.findAll({
      order: [
        ['release_date', 'DESC'], // 最新的專輯排前面
        ['album_name', 'ASC']
      ]
    });
    res.json({ success: true, data: albums });
  } catch (error) {
    next(error);
  }
};

export const getAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albums = await AlbumModel.findAll({
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: albums });
  } catch (error) {
    next(error);
  }
};

export const updateAppleMusicAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { albums } = req.body;
    
    await sequelize.transaction(async (t: any) => {
      if (albums && albums.length > 0) {
        for (const album of albums) {
          await AppleMusicAlbumModel.update({
            is_hidden: album.is_hidden || false
          }, { 
            where: { id: album.id },
            transaction: t 
          });
        }
      }
    });

    const updatedAlbums = await AppleMusicAlbumModel.findAll({
      order: [
        ['release_date', 'DESC'],
        ['album_name', 'ASC']
      ]
    });
    
    res.json({ success: true, data: updatedAlbums });
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
            apple_music_album_id: album.apple_music_album_id || null,
            hide_date: album.hide_date || false
          }, { transaction: t });
        }
      }
    });

    const updatedAlbums = await AlbumModel.findAll({
      order: [['name', 'ASC']]
    });
    
    res.json({ success: true, data: updatedAlbums });
  } catch (error) {
    next(error);
  }
};
