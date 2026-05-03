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

export const getAppleMusicAlbumById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await AppleMusicAlbumModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: row });
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

export const getAlbumById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await AlbumModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: row });
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

export const patchAppleMusicAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await AppleMusicAlbumModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    const update: any = {};
    if (typeof req.body?.is_hidden === 'boolean') update.is_hidden = req.body.is_hidden;
    if (typeof req.body?.is_lossless === 'boolean') update.is_lossless = req.body.is_lossless;
    if (Object.keys(update).length === 0) {
      res.status(400).json({ success: false, error: 'NO_FIELDS_TO_UPDATE' });
      return;
    }
    await row.update(update);
    res.json({ success: true, data: row });
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

export const createAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
      return;
    }
    const payload: any = {
      name,
      type: typeof req.body?.type === 'string' && req.body.type.trim() ? req.body.type.trim() : null,
      apple_music_album_id:
        typeof req.body?.apple_music_album_id === 'string' && req.body.apple_music_album_id.trim()
          ? req.body.apple_music_album_id.trim()
          : null,
      hide_date: !!req.body?.hide_date,
    };
    const row = await AlbumModel.create(payload);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const patchAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await AlbumModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    const update: any = {};
    if (typeof req.body?.name === 'string') update.name = req.body.name.trim();
    if (req.body && 'type' in req.body) update.type = typeof req.body.type === 'string' && req.body.type.trim() ? req.body.type.trim() : null;
    if (req.body && 'apple_music_album_id' in req.body) {
      update.apple_music_album_id =
        typeof req.body.apple_music_album_id === 'string' && req.body.apple_music_album_id.trim()
          ? req.body.apple_music_album_id.trim()
          : null;
    }
    if (typeof req.body?.hide_date === 'boolean') update.hide_date = req.body.hide_date;
    if (Object.keys(update).length === 0) {
      res.status(400).json({ success: false, error: 'NO_FIELDS_TO_UPDATE' });
      return;
    }
    if ('name' in update && !update.name) {
      res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
      return;
    }
    await row.update(update);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const deleteAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await AlbumModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    await row.destroy();
    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
};
