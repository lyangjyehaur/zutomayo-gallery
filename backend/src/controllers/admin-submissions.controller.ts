import type { Request, Response } from 'express';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { FanartSubmissionMediaModel, FanartSubmissionModel, FanartSubmissionMvModel, MediaGroupModel, MediaModel, MVMediaModel, MVModel, PublicUserModel } from '../models/index.js';
import { sequelize } from '../services/pg.service.js';
import { backupImageToR2, moveFileInR2, uploadBufferToR2 } from '../services/r2.service.js';
import { maskEmail } from '../utils/submission.js';
import { MVService } from '../services/mv.service.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { FANART_ALLOWED_TAGS_SET } from '../constants/fanart-tags.js';
import { listSubmissionsQuerySchema, rejectSubmissionSchema } from '../validators/admin-submission.validator.js';

const mvService = new MVService();

const buildSubmitterSnapshot = (submitter: any) => {
  if (!submitter) return null;
  const enabled = Boolean(submitter.public_profile_enabled);
  if (!enabled) return null;
  const fields = submitter.public_profile_fields || {};
  const snapshot: any = {};
  if (fields.display_name) snapshot.display_name = submitter.display_name || null;
  if (fields.socials) snapshot.social_links = submitter.social_links || {};
  if (fields.email_masked && submitter.email) snapshot.email_masked = maskEmail(String(submitter.email));
  return snapshot;
};

export const listSubmissions = async (req: Request, res: Response) => {
  const parsed = listSubmissionsQuerySchema.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : String(req.query.status || 'pending');
  const page = parsed.success ? parsed.data.page : Math.max(1, Number(req.query.page || 1) || 1);
  const limit = parsed.success ? parsed.data.limit : Math.min(100, Math.max(1, Number(req.query.limit || 20) || 20));
  const offset = (page - 1) * limit;

  const where: any = {};
  if (['draft', 'pending', 'approved', 'rejected', 'cancelled'].includes(status)) where.status = status;

  const { rows, count } = await FanartSubmissionModel.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
    include: [
      { model: FanartSubmissionMediaModel, as: 'media' },
      { model: MVModel, as: 'mvs', through: { attributes: [] }, required: false, attributes: ['id', 'title'] },
      { model: PublicUserModel, as: 'submitter' },
    ] as any,
  });

  res.json({
    success: true,
    data: rows.map((r: any) => r.toJSON()),
    meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
  });
};

const fetchMediaToBuffer = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) return null;
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  let contentType = response.headers.get('content-type') || 'application/octet-stream';
  if (contentType.includes(';')) contentType = contentType.split(';')[0].trim();
  const ext = (() => {
    if (contentType === 'image/jpeg') return 'jpg';
    if (contentType === 'image/png') return 'png';
    if (contentType === 'image/webp') return 'webp';
    if (contentType === 'image/gif') return 'gif';
    if (contentType === 'video/mp4') return 'mp4';
    return null;
  })();
  if (!ext) return null;
  return { buffer, contentType, ext };
};

export const approveSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;

  const submission = await FanartSubmissionModel.findByPk(id, {
    include: [
      { model: FanartSubmissionMediaModel, as: 'media' },
      { model: MVModel, as: 'mvs', through: { attributes: [] }, required: false, attributes: ['id', 'title'] },
      { model: PublicUserModel, as: 'submitter' },
    ] as any,
  });
  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (String((submission as any).get('status')) !== 'pending') {
    throw new AppError(400, 'ONLY_PENDING_CAN_APPROVE');
  }

  const media = (submission as any).get('media') as any[] || [];
  if (media.length === 0) {
    throw new AppError(400, 'NO_MEDIA');
  }

  const tagsRaw = (submission as any).get('special_tags') as any;
  const tags = Array.isArray(tagsRaw) ? tagsRaw.filter((t: any) => typeof t === 'string' && FANART_ALLOWED_TAGS_SET.has(t)) : [];
  const mvIds = Array.isArray((submission as any).get('mvs')) ? (submission as any).get('mvs').map((m: any) => m.id) : [];

  const submitter = (submission as any).get('submitter') as any;
  const submitterSnapshot = buildSubmitterSnapshot(submitter);

  // 使用事務包裹整個審批流程，確保數據一致性
  const result = await sequelize.transaction(async (t) => {
    const group = await MediaGroupModel.create({
      id: undefined,
      source_url: `submission:${id}`,
      source_text: String((submission as any).get('note') || ''),
      post_date: (submission as any).get('submitted_at') || new Date(),
      status: 'organized',
    } as any, { transaction: t });

    const createdMedia: any[] = [];

    for (const m of media) {
      const mediaType = String(m.get('media_type') || 'image');
      const originalUrl = m.get('original_url') as any;
      const r2Url = m.get('r2_url') as any;
      const r2Key = m.get('r2_key') as any;
      const thumbnailUrl = m.get('thumbnail_url') as any;

      let finalUrl: string | null = null;
      if (r2Url && typeof r2Url === 'string' && r2Url.includes('submissions/')) {
        const idx = r2Url.indexOf('submissions/');
        const oldKey = idx >= 0 ? r2Url.substring(idx) : (typeof r2Key === 'string' ? r2Key : null);
        if (oldKey) {
          const newKey = `fanart/${oldKey.split('/').pop()}`;
          const moved = await moveFileInR2(oldKey, newKey);
          if (moved) finalUrl = moved;
        }
      }

      if (!finalUrl && originalUrl) {
        const backedUp = await backupImageToR2(String(originalUrl), 'fanart', {
          metadata: {
            source: 'submission',
            'submission-id': id,
            ...(m.get('tweet_id') ? { 'tweet-id': String(m.get('tweet_id')) } : {})
          }
        });
        if (backedUp) finalUrl = backedUp;
      }

      if (!finalUrl && r2Url) finalUrl = String(r2Url);

      if (!finalUrl && originalUrl) {
        const fetched = await fetchMediaToBuffer(String(originalUrl));
        if (fetched) {
          const hash = crypto.createHash('sha256').update(String(originalUrl)).digest('hex').substring(0, 16);
          const fileName = `fanart/${hash}.${fetched.ext}`;
          const uploaded = await uploadBufferToR2(fetched.buffer, fileName, fetched.contentType, { metadata: { source: 'submission', 'submission-id': id } });
          if (uploaded) finalUrl = uploaded;
        }
      }

      if (!finalUrl) continue;

      const record = await MediaModel.create({
        id: undefined,
        type: 'fanart',
        media_type: mediaType,
        source: 'submission',
        url: finalUrl,
        original_url: originalUrl || finalUrl,
        thumbnail_url: mediaType === 'video' ? (thumbnailUrl || null) : null,
        width: m.get('width') || null,
        height: m.get('height') || null,
        tags,
        group_id: (group as any).get('id'),
        submitter_user_id: submitter ? submitter.id : null,
        submitter_public_snapshot: submitterSnapshot,
        submission_id: id,
      } as any, { transaction: t });

      createdMedia.push(record);

      for (const mvId of mvIds) {
        await MVMediaModel.findOrCreate({
          where: { mv_id: mvId, media_id: (record as any).get('id') },
          defaults: { mv_id: mvId, media_id: (record as any).get('id'), usage: 'gallery', order_index: 0 },
          transaction: t,
        });
      }
    }

    if (createdMedia.length === 0) {
      await (group as any).destroy({ transaction: t });
      throw new AppError(500, 'APPROVE_NO_MEDIA_CREATED');
    }

    await (submission as any).update({
      status: 'approved',
      reviewed_by: (req.session as any)?.username || (req as any).user?.username || 'admin',
      reviewed_at: new Date(),
    }, { transaction: t });

    return createdMedia.length;
  });

  if (mvIds.length > 0) {
    mvService.clearCache();
  }

  res.json({ success: true });
};

export const rejectSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = rejectSubmissionSchema.parse(req.body);
  const reason = parsed.reason.trim();
  const submission = await FanartSubmissionModel.findByPk(id);
  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (String((submission as any).get('status')) !== 'pending') {
    throw new AppError(400, 'ONLY_PENDING_CAN_REJECT');
  }
  await (submission as any).update({
    status: 'rejected',
    review_reason: reason,
    reviewed_by: (req.session as any)?.username || (req as any).user?.username || 'admin',
    reviewed_at: new Date(),
  });
  res.json({ success: true });
};
