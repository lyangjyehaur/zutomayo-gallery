import type { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { Op } from 'sequelize';
import { FanartSubmissionMediaModel, FanartSubmissionModel, FanartSubmissionMvModel, MVModel, PublicUserModel } from '../models/index.js';
import { TwitterService, extractTweetId } from '../services/twitter.service.js';
import { uploadStreamToR2 } from '../services/r2.service.js';
import { generateToken, sha256Hex } from '../utils/submission.js';
import { AppError } from '../middleware/errorHandler.js';
import { FANART_ALLOWED_TAGS_SET } from '../constants/fanart-tags.js';
import { createSubmissionSchema, updateSubmissionSchema } from '../validators/submission.validator.js';

const maxFiles = 10;
const maxFileSize = 50 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `ztmy-submission-${id}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm',
]);

export const submissionUpload = multer({
  storage,
  limits: { files: maxFiles, fileSize: maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype || '')) {
      cb(null, true);
    } else {
      cb(new AppError(400, `不支持的文件類型: ${file.mimetype || 'unknown'}`));
    }
  },
});

const getAnonymousToken = (req: Request) => {
  const v = req.headers['x-anonymous-token'] || req.headers['x-submission-token'];
  if (typeof v === 'string' && v.trim()) return v.trim();
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
};

const isOwner = async (req: Request, submission: any) => {
  const publicUserId = (req.session as any)?.publicUserId;
  if (publicUserId && submission.get('submitter_user_id') === publicUserId) return true;
  const token = getAnonymousToken(req);
  if (!token) return false;
  const tokenHash = sha256Hex(token);
  return submission.get('anonymous_token_hash') && submission.get('anonymous_token_hash') === tokenHash;
};

const canEdit = (status: string) => status === 'draft' || status === 'rejected';

const readBodyList = (v: any) => Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [];

export const createSubmission = async (req: Request, res: Response) => {
  const parsed = createSubmissionSchema.safeParse(req.body);
  const mvIds = readBodyList(parsed.success ? parsed.data.mvIds : (req.body as any)?.mvIds);
  const rawTags = readBodyList(parsed.success ? parsed.data.specialTags : (req.body as any)?.specialTags);
  const specialTags = rawTags.filter((t) => FANART_ALLOWED_TAGS_SET.has(t));
  const note = parsed.success ? (parsed.data.note ?? null) : (typeof (req.body as any)?.note === 'string' ? (req.body as any).note : null);
  const contact = typeof (req.body as any)?.contact === 'string' ? (req.body as any).contact : null;

  const publicUserId = (req.session as any)?.publicUserId || null;
  let anonymousToken: string | null = null;
  let anonymousTokenHash: string | null = null;
  if (!publicUserId) {
    anonymousToken = generateToken();
    anonymousTokenHash = sha256Hex(anonymousToken);
  }

  const submission = await FanartSubmissionModel.create({
    submitter_user_id: publicUserId,
    anonymous_token_hash: anonymousTokenHash,
    status: 'draft',
    note,
    contact,
    source_type: 'mixed',
    special_tags: specialTags,
  } as any);

  if (mvIds.length > 0) {
    const rows = mvIds.map((mvId) => ({ submission_id: (submission as any).get('id'), mv_id: mvId, created_at: new Date() }));
    await FanartSubmissionMvModel.bulkCreate(rows as any[], { ignoreDuplicates: true });
  }

  res.json({ success: true, data: { submission: submission.toJSON(), anonymousToken } });
};

export const updateSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const submission = await FanartSubmissionModel.findByPk(id);
  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (!await isOwner(req, submission)) {
    throw new AppError(403, 'FORBIDDEN');
  }
  const status = String((submission as any).get('status') || '');
  if (!canEdit(status)) {
    throw new AppError(400, 'SUBMISSION_NOT_EDITABLE');
  }

  const parsed = updateSubmissionSchema.safeParse(req.body);
  const mvIds = readBodyList(parsed.success ? parsed.data.mvIds : (req.body as any)?.mvIds);
  const rawTags = readBodyList(parsed.success ? parsed.data.specialTags : (req.body as any)?.specialTags);
  const specialTags = rawTags.filter((t) => FANART_ALLOWED_TAGS_SET.has(t));
  const note = parsed.success ? (parsed.data.note ?? null) : (typeof (req.body as any)?.note === 'string' ? (req.body as any).note : null);
  const contact = typeof (req.body as any)?.contact === 'string' ? (req.body as any).contact : null;

  await (submission as any).update({ note, contact, special_tags: specialTags });

  await FanartSubmissionMvModel.destroy({ where: { submission_id: id } });
  if (mvIds.length > 0) {
    await FanartSubmissionMvModel.bulkCreate(mvIds.map((mvId) => ({ submission_id: id, mv_id: mvId, created_at: new Date() })) as any[], { ignoreDuplicates: true });
  }

  res.json({ success: true, data: submission.toJSON() });
};

export const addTweet = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tweetUrl = String((req.body as any)?.tweetUrl || '').trim();
  if (!tweetUrl) {
    throw new AppError(400, 'TWEET_URL_REQUIRED');
  }

  const submission = await FanartSubmissionModel.findByPk(id);
  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (!await isOwner(req, submission)) {
    throw new AppError(403, 'FORBIDDEN');
  }
  const status = String((submission as any).get('status') || '');
  if (!canEdit(status)) {
    throw new AppError(400, 'SUBMISSION_NOT_EDITABLE');
  }

  const media = await TwitterService.extractMediaFromTweet(tweetUrl);
  const tweetId = media[0]?.tweet_id || extractTweetId(tweetUrl);

  const existing = await FanartSubmissionMediaModel.findAll({
    where: {
      submission_id: id,
      original_url: { [Op.in]: media.map((m) => m.url) },
    },
  });
  const existingSet = new Set(existing.map((m: any) => m.get('original_url')));

  const createdRows = [];
  for (const m of media) {
    if (existingSet.has(m.url)) continue;
    const type = m.type === 'video' || m.type === 'gif' ? 'video' : 'image';
    createdRows.push({
      submission_id: id,
      media_type: type,
      tweet_id: tweetId,
      original_url: m.url,
      thumbnail_url: m.thumbnail || null,
      created_at: new Date(),
    });
  }
  if (createdRows.length > 0) await FanartSubmissionMediaModel.bulkCreate(createdRows as any[]);

  const list = await FanartSubmissionMediaModel.findAll({ where: { submission_id: id }, order: [['created_at', 'ASC']] });
  await (submission as any).update({ source_type: 'mixed' });

  res.json({ success: true, data: list.map((x) => x.toJSON()) });
};

const fileToSha256 = async (filePath: string) => {
  const hash = crypto.createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const s = fs.createReadStream(filePath);
    s.on('data', (d) => hash.update(d));
    s.on('error', reject);
    s.on('end', () => resolve());
  });
  return hash.digest('hex');
};

const mimeToExt = (mime: string) => {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'video/mp4') return 'mp4';
  return null;
};

export const uploadFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const submission = await FanartSubmissionModel.findByPk(id);
  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (!await isOwner(req, submission)) {
    throw new AppError(403, 'FORBIDDEN');
  }
  const status = String((submission as any).get('status') || '');
  if (!canEdit(status)) {
    throw new AppError(400, 'SUBMISSION_NOT_EDITABLE');
  }

  const files = Array.isArray((req as any).files) ? (req as any).files : [];
  if (files.length === 0) {
    throw new AppError(400, 'NO_FILES');
  }

  const created: any[] = [];
  for (const f of files) {
    const ext = mimeToExt(String(f.mimetype || ''));
    if (!ext) {
      continue;
    }
    if (ext === 'mp4' && String(f.mimetype || '') !== 'video/mp4') {
      continue;
    }

    const sha = await fileToSha256(f.path);
    const key = `submissions/${id}/${sha}.${ext}`;
    const r2Url = await uploadStreamToR2(fs.createReadStream(f.path), key, String(f.mimetype || 'application/octet-stream'), {
      metadata: { source: 'submission-upload', 'submission-id': id },
      sizeBytes: Number(f.size || 0) || undefined,
    });

    if (r2Url) {
      created.push({
        submission_id: id,
        media_type: ext === 'mp4' ? 'video' : 'image',
        r2_key: key,
        r2_url: r2Url,
        sha256: sha,
        size_bytes: Number(f.size || 0) || null,
        created_at: new Date(),
      });
    }
  }

  for (const f of files) {
    try { fs.unlinkSync(f.path); } catch { }
  }

  if (created.length > 0) {
    await FanartSubmissionMediaModel.bulkCreate(created as any[]);
    await (submission as any).update({ source_type: 'mixed' });
  }

  const list = await FanartSubmissionMediaModel.findAll({ where: { submission_id: id }, order: [['created_at', 'ASC']] });
  res.json({ success: true, data: list.map((x) => x.toJSON()) });
};

export const submitForReview = async (req: Request, res: Response) => {
  const { id } = req.params;
  const submission = await FanartSubmissionModel.findByPk(id);
  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (!await isOwner(req, submission)) {
    throw new AppError(403, 'FORBIDDEN');
  }
  const status = String((submission as any).get('status') || '');
  if (!canEdit(status)) {
    throw new AppError(400, 'SUBMISSION_NOT_SUBMITTABLE');
  }

  const mediaCount = await FanartSubmissionMediaModel.count({ where: { submission_id: id } });
  const mvCount = await FanartSubmissionMvModel.count({ where: { submission_id: id } });
  const tags = (submission as any).get('special_tags') as any;
  const tagCount = Array.isArray(tags) ? tags.length : 0;

  if (mediaCount <= 0) {
    throw new AppError(400, 'MEDIA_REQUIRED');
  }
  if (mvCount <= 0 && tagCount <= 0) {
    throw new AppError(400, 'MV_OR_TAG_REQUIRED');
  }

  await (submission as any).update({ status: 'pending', submitted_at: new Date() });
  res.json({ success: true });
};

export const mySubmissions = async (req: Request, res: Response) => {
  const publicUserId = (req.session as any)?.publicUserId;
  if (!publicUserId) {
    throw new AppError(401, 'PUBLIC_UNAUTHORIZED');
  }

  const rows = await FanartSubmissionModel.findAll({
    where: { submitter_user_id: publicUserId },
    order: [['created_at', 'DESC']],
    include: [
      { model: FanartSubmissionMediaModel, as: 'media' },
      { model: MVModel, as: 'mvs', through: { attributes: [] }, required: false },
    ] as any,
  });

  res.json({ success: true, data: rows.map((r: any) => r.toJSON()) });
};

export const getSubmission = async (req: Request, res: Response) => {
  const { id } = req.params;
  const row = await FanartSubmissionModel.findByPk(id, {
    include: [
      { model: FanartSubmissionMediaModel, as: 'media' },
      { model: MVModel, as: 'mvs', through: { attributes: [] }, required: false },
      { model: PublicUserModel, as: 'submitter', attributes: ['id', 'display_name', 'social_links', 'public_profile_enabled', 'public_profile_fields'] },
    ] as any,
  });
  if (!row) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND');
  }
  if (!await isOwner(req, row)) {
    throw new AppError(403, 'FORBIDDEN');
  }
  res.json({ success: true, data: (row as any).toJSON() });
};

export const localSubmissions = async (req: Request, res: Response) => {
  const items = Array.isArray((req.body as any)?.items) ? (req.body as any).items : [];
  const pairs = items
    .filter((it: any) => it && typeof it.id === 'string' && typeof it.token === 'string')
    .map((it: any) => ({ id: String(it.id), tokenHash: sha256Hex(String(it.token)) }));

  if (pairs.length === 0) {
    res.json({ success: true, data: [] });
    return;
  }

  const ids = pairs.map((p: { id: string; tokenHash: string }) => p.id);
  const rows = await FanartSubmissionModel.findAll({
    where: { id: { [Op.in]: ids } },
    order: [['created_at', 'DESC']],
    include: [{ model: FanartSubmissionMediaModel, as: 'media' }] as any,
  });

  const allowed = rows.filter((r: any) => {
    const match = pairs.find((p: { id: string; tokenHash: string }) => p.id === r.get('id'));
    return match && r.get('anonymous_token_hash') === match.tokenHash;
  });

  res.json({ success: true, data: allowed.map((r: any) => r.toJSON()) });
};
