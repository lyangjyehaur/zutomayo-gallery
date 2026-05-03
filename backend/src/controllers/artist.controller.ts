import { Request, Response, NextFunction } from 'express';
import { ArtistModel } from '../models/index.js';

export const getArtists = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await ArtistModel.findAll({ order: [['name', 'ASC']] });
    const data = rows.map((r) => {
      const v = r.toJSON() as any;
      return v;
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getArtistById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await ArtistModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const createArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
      return;
    }
    const dup = await ArtistModel.findOne({ where: { name } as any });
    if (dup) {
      res.status(400).json({ success: false, error: 'NAME_DUPLICATED' });
      return;
    }
    const payload: any = {
      name,
      twitter: typeof req.body?.twitter === 'string' ? req.body.twitter.trim() : '',
      profile_url: typeof req.body?.profile_url === 'string' ? req.body.profile_url.trim() : '',
      bio: typeof req.body?.bio === 'string' ? req.body.bio : '',
      instagram: typeof req.body?.instagram === 'string' ? req.body.instagram.trim() : '',
      youtube: typeof req.body?.youtube === 'string' ? req.body.youtube.trim() : '',
      pixiv: typeof req.body?.pixiv === 'string' ? req.body.pixiv.trim() : '',
      tiktok: typeof req.body?.tiktok === 'string' ? req.body.tiktok.trim() : '',
      website: typeof req.body?.website === 'string' ? req.body.website.trim() : '',
    };
    const row = await ArtistModel.create(payload);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const patchArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await ArtistModel.findByPk(id);
    if (!row) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }
    const update: any = {};
    if (req.body && 'name' in req.body) update.name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (req.body && 'twitter' in req.body) update.twitter = typeof req.body.twitter === 'string' ? req.body.twitter.trim() : '';
    if (req.body && 'profile_url' in req.body) update.profile_url = typeof req.body.profile_url === 'string' ? req.body.profile_url.trim() : '';
    if (req.body && 'bio' in req.body) update.bio = typeof req.body.bio === 'string' ? req.body.bio : '';
    if (req.body && 'instagram' in req.body) update.instagram = typeof req.body.instagram === 'string' ? req.body.instagram.trim() : '';
    if (req.body && 'youtube' in req.body) update.youtube = typeof req.body.youtube === 'string' ? req.body.youtube.trim() : '';
    if (req.body && 'pixiv' in req.body) update.pixiv = typeof req.body.pixiv === 'string' ? req.body.pixiv.trim() : '';
    if (req.body && 'tiktok' in req.body) update.tiktok = typeof req.body.tiktok === 'string' ? req.body.tiktok.trim() : '';
    if (req.body && 'website' in req.body) update.website = typeof req.body.website === 'string' ? req.body.website.trim() : '';

    if (Object.keys(update).length === 0) {
      res.status(400).json({ success: false, error: 'NO_FIELDS_TO_UPDATE' });
      return;
    }
    if ('name' in update && !update.name) {
      res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
      return;
    }
    if ('name' in update) {
      const dup = await ArtistModel.findOne({ where: { name: update.name } as any });
      if (dup && String((dup as any).id) !== id) {
        res.status(400).json({ success: false, error: 'NAME_DUPLICATED' });
        return;
      }
    }

    await row.update(update);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const deleteArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await ArtistModel.findByPk(id);
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
