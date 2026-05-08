import { Request, Response } from 'express';
import { MediaAnnotationModel, MediaModel, MVMediaModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { createAnnotationSchema, updateAnnotationSchema } from '../validators/annotation.validator.js';
import { deleteKeysByPattern } from '../services/redis.service.js';
import { MVService } from '../services/mv.service.js';
import { logger } from '../utils/logger.js';

const mvService = new MVService();

const clearAnnotationRelatedCache = async () => {
  const annDeleted = await deleteKeysByPattern('api-cache:/api/annotations*');
  const mvDeleted = await deleteKeysByPattern('api-cache:/api/mvs*');
  mvService.clearCache();
  logger.info(
    { annotationKeysDeleted: annDeleted, mvKeysDeleted: mvDeleted },
    '[Annotation] Related cache cleared',
  );
};

export const getAllAnnotations = async (_req: Request, res: Response) => {
  const annotations = await MediaAnnotationModel.findAll({
    order: [['media_id', 'ASC'], ['sort_order', 'ASC'], ['created_at', 'ASC']],
  });

  const grouped: Record<string, any[]> = {};
  for (const a of annotations) {
    const json = a.toJSON() as any;
    const mid = json.media_id;
    if (!grouped[mid]) grouped[mid] = [];
    grouped[mid].push(json);
  }

  res.json({ success: true, data: grouped });
};

export const getAnnotationsByMedia = async (req: Request, res: Response) => {
  const { mediaId } = req.params;

  const annotations = await MediaAnnotationModel.findAll({
    where: { media_id: mediaId },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
  });

  res.json({ success: true, data: annotations.map(a => a.toJSON()) });
};

export const createAnnotation = async (req: Request, res: Response) => {
  const parsed = createAnnotationSchema.parse(req.body);
  const user = (req as any).user;

  const media = await MediaModel.findByPk(parsed.media_id);
  if (!media) throw new AppError(404, 'Media not found');

  const annotation = await MediaAnnotationModel.create({
    ...parsed,
    created_by: user?.id || null,
  });

  await clearAnnotationRelatedCache();

  res.status(201).json({ success: true, data: annotation.toJSON() });
};

export const updateAnnotation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = updateAnnotationSchema.parse(req.body);

  const annotation = await MediaAnnotationModel.findByPk(id);
  if (!annotation) throw new AppError(404, 'Annotation not found');

  await annotation.update(parsed);

  await clearAnnotationRelatedCache();

  res.json({ success: true, data: annotation.toJSON() });
};

export const deleteAnnotation = async (req: Request, res: Response) => {
  const { id } = req.params;

  const annotation = await MediaAnnotationModel.findByPk(id);
  if (!annotation) throw new AppError(404, 'Annotation not found');

  await annotation.destroy();

  await clearAnnotationRelatedCache();

  res.json({ success: true });
};

export const getAnnotationsByMv = async (req: Request, res: Response) => {
  const { mvId } = req.params;

  const mvMedia = await MVMediaModel.findAll({
    where: { mv_id: mvId },
    attributes: ['media_id'],
    raw: true,
  });

  const mediaIds = mvMedia.map((mm: any) => mm.media_id);

  if (mediaIds.length === 0) {
    res.json({ success: true, data: {} });
    return;
  }

  const annotations = await MediaAnnotationModel.findAll({
    where: { media_id: mediaIds },
    order: [['media_id', 'ASC'], ['sort_order', 'ASC'], ['created_at', 'ASC']],
  });

  const grouped: Record<string, any[]> = {};
  for (const a of annotations) {
    const json = a.toJSON() as any;
    const mid = json.media_id;
    if (!grouped[mid]) grouped[mid] = [];
    grouped[mid].push(json);
  }

  res.json({ success: true, data: grouped });
};
