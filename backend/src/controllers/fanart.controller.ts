import { Request, Response } from 'express';
import { MediaGroupModel, MediaModel, MVMediaModel } from '../models/index.js';
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

export const assignFanartMedia = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const { mvs, groupId } = req.body;
    
    const media = await MediaModel.findByPk(mediaId);
    if (!media) return res.status(404).json({ success: false, error: 'Media not found' });
    
    const mvIds = mvs.filter((m: string) => !m.startsWith('tag:'));
    const tags = mvs
      .filter((m: string) => m.startsWith('tag:'))
      .map((t: string) => (t === 'tag:aca-ne' ? 'tag:acane' : t));

    if (tags.length > 0) {
      await media.update({ tags });
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
