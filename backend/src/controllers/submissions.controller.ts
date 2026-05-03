import type { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { Op } from 'sequelize';
import { FanartSubmissionMediaModel, FanartSubmissionModel, FanartSubmissionMvModel, MVModel, PublicUserModel } from '../models/index.js';
import { TwitterService } from '../services/twitter.service.js';
import { uploadStreamToR2 } from '../services/r2.service.js';
import { generateToken, sha256Hex } from '../utils/submission.js';

const allowedTags = new Set(['tag:collab', 'tag:acane', 'tag:real', 'tag:uniguri', 'tag:other']);

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

export const submissionUpload = multer({
  storage,
  limits: { files: maxFiles, fileSize: maxFileSize },
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
  try {
    const mvIds = readBodyList((req.body as any)?.mvIds);
    const rawTags = readBodyList((req.body as any)?.specialTags);
    const specialTags = rawTags.filter((t) => allowedTags.has(t));
    const note = typeof (req.body as any)?.note === 'string' ? (req.body as any).note : null;
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
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'CREATE_SUBMISSION_FAILED' });
  }
};

export const updateSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await FanartSubmissionModel.findByPk(id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'SUBMISSION_NOT_FOUND' });
      return;
    }
    if (!await isOwner(req, submission)) {
      res.status(403).json({ success: false, error: 'FORBIDDEN' });
      return;
    }
    const status = String((submission as any).get('status') || '');
    if (!canEdit(status)) {
      res.status(400).json({ success: false, error: 'SUBMISSION_NOT_EDITABLE' });
      return;
    }

    const mvIds = readBodyList((req.body as any)?.mvIds);
    const rawTags = readBodyList((req.body as any)?.specialTags);
    const specialTags = rawTags.filter((t) => allowedTags.has(t));
    const note = typeof (req.body as any)?.note === 'string' ? (req.body as any).note : null;
    const contact = typeof (req.body as any)?.contact === 'string' ? (req.body as any).contact : null;

    await (submission as any).update({ note, contact, special_tags: specialTags });

    await FanartSubmissionMvModel.destroy({ where: { submission_id: id } });
    if (mvIds.length > 0) {
      await FanartSubmissionMvModel.bulkCreate(mvIds.map((mvId) => ({ submission_id: id, mv_id: mvId, created_at: new Date() })) as any[], { ignoreDuplicates: true });
    }

    res.json({ success: true, data: submission.toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'UPDATE_SUBMISSION_FAILED' });
  }
};

export const addTweet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tweetUrl = String((req.body as any)?.tweetUrl || '').trim();
    if (!tweetUrl) {
      res.status(400).json({ success: false, error: 'TWEET_URL_REQUIRED' });
      return;
    }

    const submission = await FanartSubmissionModel.findByPk(id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'SUBMISSION_NOT_FOUND' });
      return;
    }
    if (!await isOwner(req, submission)) {
      res.status(403).json({ success: false, error: 'FORBIDDEN' });
      return;
    }
    const status = String((submission as any).get('status') || '');
    if (!canEdit(status)) {
      res.status(400).json({ success: false, error: 'SUBMISSION_NOT_EDITABLE' });
      return;
    }

    const media = await TwitterService.extractMediaFromTweet(tweetUrl);
    const match = tweetUrl.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/);
    const tweetId = match?.[1] || null;

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
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'ADD_TWEET_FAILED' });
  }
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
  try {
    const { id } = req.params;
    const submission = await FanartSubmissionModel.findByPk(id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'SUBMISSION_NOT_FOUND' });
      return;
    }
    if (!await isOwner(req, submission)) {
      res.status(403).json({ success: false, error: 'FORBIDDEN' });
      return;
    }
    const status = String((submission as any).get('status') || '');
    if (!canEdit(status)) {
      res.status(400).json({ success: false, error: 'SUBMISSION_NOT_EDITABLE' });
      return;
    }

    const files = Array.isArray((req as any).files) ? (req as any).files : [];
    if (files.length === 0) {
      res.status(400).json({ success: false, error: 'NO_FILES' });
      return;
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
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'UPLOAD_FAILED' });
  }
};

export const submitForReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await FanartSubmissionModel.findByPk(id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'SUBMISSION_NOT_FOUND' });
      return;
    }
    if (!await isOwner(req, submission)) {
      res.status(403).json({ success: false, error: 'FORBIDDEN' });
      return;
    }
    const status = String((submission as any).get('status') || '');
    if (!canEdit(status)) {
      res.status(400).json({ success: false, error: 'SUBMISSION_NOT_SUBMITTABLE' });
      return;
    }

    const mediaCount = await FanartSubmissionMediaModel.count({ where: { submission_id: id } });
    const mvCount = await FanartSubmissionMvModel.count({ where: { submission_id: id } });
    const tags = (submission as any).get('special_tags') as any;
    const tagCount = Array.isArray(tags) ? tags.length : 0;

    if (mediaCount <= 0) {
      res.status(400).json({ success: false, error: 'MEDIA_REQUIRED' });
      return;
    }
    if (mvCount <= 0 && tagCount <= 0) {
      res.status(400).json({ success: false, error: 'MV_OR_TAG_REQUIRED' });
      return;
    }

    await (submission as any).update({ status: 'pending', submitted_at: new Date() });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'SUBMIT_FAILED' });
  }
};

export const mySubmissions = async (req: Request, res: Response) => {
  try {
    const publicUserId = (req.session as any)?.publicUserId;
    if (!publicUserId) {
      res.status(401).json({ success: false, error: 'PUBLIC_UNAUTHORIZED' });
      return;
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
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'MY_SUBMISSIONS_FAILED' });
  }
};

export const getSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await FanartSubmissionModel.findByPk(id, {
      include: [
        { model: FanartSubmissionMediaModel, as: 'media' },
        { model: MVModel, as: 'mvs', through: { attributes: [] }, required: false },
        { model: PublicUserModel, as: 'submitter', attributes: ['id', 'display_name', 'social_links', 'public_profile_enabled', 'public_profile_fields'] },
      ] as any,
    });
    if (!row) {
      res.status(404).json({ success: false, error: 'SUBMISSION_NOT_FOUND' });
      return;
    }
    if (!await isOwner(req, row)) {
      res.status(403).json({ success: false, error: 'FORBIDDEN' });
      return;
    }
    res.json({ success: true, data: (row as any).toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'GET_SUBMISSION_FAILED' });
  }
};

export const localSubmissions = async (req: Request, res: Response) => {
  try {
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
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'LOCAL_SUBMISSIONS_FAILED' });
  }
};
