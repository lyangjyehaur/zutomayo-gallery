import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { MediaGroupModel, MediaModel, MVMediaModel, MVModel } from '../models/index.js';
import { MVService } from '../services/mv.service.js';

export const getUnorganizedFanarts = async (req: Request, res: Response) => {
  try {
    const rows = await MediaGroupModel.findAll({
      where: { status: 'unorganized' },
      include: [{ model: MediaModel, as: 'images' }],
      order: [['post_date', 'DESC'], ['id', 'DESC']]
    });
    
    const groups = rows.map(r => r.toJSON() as any);
    const allMediaIds = groups.flatMap(g => (g.images || []).map((m: any) => m.id)).filter(Boolean);
    const mvLinks = allMediaIds.length
      ? await MVMediaModel.findAll({ where: { media_id: allMediaIds }, attributes: ['media_id'] })
      : [];
    const mediaWithMv = new Set(mvLinks.map(r => r.get('media_id') as string));

    const isMediaOrganized = (m: any) => {
      const tags = Array.isArray(m.tags) ? m.tags : [];
      if (tags.length > 0) return true;
      if (mediaWithMv.has(m.id)) return true;
      return false;
    };

    const keepGroups: any[] = [];
    const toOrganizeGroupIds: string[] = [];

    for (const group of groups) {
      const images = group.images || [];
      const hasAnyUnorganizedMedia = images.some((m: any) => !isMediaOrganized(m));
      if (hasAnyUnorganizedMedia) {
        keepGroups.push({
          ...group,
          media: images
        });
      } else {
        if (group.id) toOrganizeGroupIds.push(group.id);
      }
    }

    if (toOrganizeGroupIds.length > 0) {
      await MediaGroupModel.update({ status: 'organized' }, { where: { id: toOrganizeGroupIds } });
    }

    const data = keepGroups;

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDeletedFanarts = async (req: Request, res: Response) => {
  try {
    const rows = await MediaGroupModel.findAll({
      where: { status: 'deleted' },
      include: [{ model: MediaModel, as: 'images' }],
      order: [['post_date', 'DESC'], ['id', 'DESC']]
    });

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

export const getLegacyFanarts = async (req: Request, res: Response) => {
  try {
    const rows = await MediaModel.findAll({
      where: { type: 'fanart' },
      include: [{ model: MediaGroupModel, as: 'group' }],
      order: [['created_at', 'DESC']],
      limit: 500
    });

    const data = rows
      .map(r => r.toJSON() as any)
      .filter((m: any) => {
        const url = String(m.url || '');
        const originalUrl = String(m.original_url || '');
        const isYoutube =
          url.includes('ytimg.com') ||
          url.includes('youtube.com') ||
          originalUrl.includes('ytimg.com') ||
          originalUrl.includes('youtube.com');
        const missingGroup = !m.group_id || !m.group;
        const missingSource = !m.group?.source_url;
        return isYoutube || missingGroup || missingSource;
      });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getFanartGallery = async (req: Request, res: Response) => {
  try {
    const rows = await MediaModel.findAll({
      where: { type: 'fanart' },
      include: [
        { model: MediaGroupModel, as: 'group', where: { status: 'organized' }, required: true },
        { model: MVModel, as: 'mvs', through: { attributes: [] }, attributes: ['id', 'title'], required: false }
      ],
      order: [[{ model: MediaGroupModel, as: 'group' }, 'post_date', 'DESC'], ['id', 'DESC']]
    });

    res.json({ success: true, data: rows.map(r => r.toJSON()) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getFanartsByTag = async (req: Request, res: Response) => {
  try {
    const rawTag = String(req.params.tagId || '').trim();
    if (!rawTag) return res.status(400).json({ success: false, error: 'Missing tagId' });

    const tagId = rawTag;
    const legacyTag = tagId.startsWith('tag:') ? tagId.slice(4) : tagId;

    const rows = await MediaModel.findAll({
      where: {
        type: 'fanart',
        [Op.or]: [
          { tags: { [Op.contains]: [tagId] } },
          { tags: { [Op.contains]: [legacyTag] } }
        ]
      },
      include: [{ model: MediaGroupModel, as: 'group' }],
      order: [[{ model: MediaGroupModel, as: 'group' }, 'post_date', 'DESC'], ['id', 'DESC']]
    });

    res.json({ success: true, data: rows.map(r => r.toJSON()) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getFanartTagSummary = async (req: Request, res: Response) => {
  try {
    const tags = ['tag:collab', 'tag:acane', 'tag:real', 'tag:uniguri', 'tag:shoga'];
    const counts: Record<string, number> = {};

    for (const tag of tags) {
      const legacyTag = tag.startsWith('tag:') ? tag.slice(4) : tag;
      const count = await MediaModel.count({
        where: {
          type: 'fanart',
          [Op.or]: [
            { tags: { [Op.contains]: [tag] } },
            { tags: { [Op.contains]: [legacyTag] } }
          ]
        }
      });
      counts[tag] = count;
    }

    res.json({ success: true, data: counts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const assignFanartMedia = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { mvs, groupId } = req.body;
    
    const media = await MediaModel.findByPk(mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    
    const mvIds = mvs.filter((m: string) => !m.startsWith('tag:'));
    const tags = mvs.filter((m: string) => m.startsWith('tag:'));

    if (tags.length > 0) {
      const currentTags = media.get('tags') as any;
      const nextTags = Array.from(
        new Set([...(Array.isArray(currentTags) ? currentTags : []), ...tags])
      );
      await media.update({ tags: nextTags });
    }

    if (mvIds.length > 0) {
      const records = mvIds.map((mvId: string) => ({
        mv_id: mvId,
        media_id: mediaId,
        usage: 'gallery',
        order_index: 0
      }));
      await MVMediaModel.bulkCreate(records, { ignoreDuplicates: true });
    }

    if (groupId) {
      const group = await MediaGroupModel.findByPk(groupId);
      if (group) await group.update({ status: 'organized' });
    }

    const mvService = new MVService();
    mvService.clearCache();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const syncFanartMedia = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { mvs, groupId } = req.body;

    const media = await MediaModel.findByPk(mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });

    const rawMvs = Array.isArray(mvs) ? mvs : [];
    const mvIds = rawMvs.filter((m: any) => typeof m === 'string' && !m.startsWith('tag:'));
    const tags = Array.from(
      new Set(rawMvs.filter((m: any) => typeof m === 'string' && m.startsWith('tag:')))
    );

    await media.update({ tags });

    const existingLinks = await MVMediaModel.findAll({
      where: { media_id: mediaId },
      attributes: ['mv_id']
    });
    const existingMvIds = new Set(existingLinks.map(r => r.get('mv_id') as string));
    const nextMvIds = new Set(mvIds);
    const toDelete = Array.from(existingMvIds).filter(id => !nextMvIds.has(id));
    const toAdd = mvIds.filter(id => !existingMvIds.has(id));

    if (toDelete.length > 0) {
      await MVMediaModel.destroy({ where: { media_id: mediaId, mv_id: toDelete } });
    }

    if (toAdd.length > 0) {
      const records = toAdd.map((mvId: string) => ({
        mv_id: mvId,
        media_id: mediaId,
        usage: 'gallery',
        order_index: 0
      }));
      await MVMediaModel.bulkCreate(records, { ignoreDuplicates: true });
    }

    if (groupId) {
      const group = await MediaGroupModel.findByPk(groupId);
      if (group) await group.update({ status: 'organized' });
    }

    const mvService = new MVService();
    mvService.clearCache();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeFanartMediaFromMv = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { mvId } = req.body;
    
    if (mvId.startsWith('tag:')) {
      const media = await MediaModel.findByPk(mediaId);
      if (media) {
        const currentTags = (media.get('tags') || []) as string[];
        const nextTags = currentTags.filter(t => t !== mvId);
        await media.update({ tags: nextTags });
      }
    } else {
      await MVMediaModel.destroy({ where: { media_id: mediaId, mv_id: mvId } });
    }
    
    const mvService = new MVService();
    mvService.clearCache();
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateFanartStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'organized' or 'unorganized' or 'deleted'

    await MediaGroupModel.update({ status }, { where: { id } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
