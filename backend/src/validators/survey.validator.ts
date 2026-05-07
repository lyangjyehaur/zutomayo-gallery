import { z } from 'zod';

export const createSpeedSurveySchema = z.object({
  // 多維度評分（至少填一項）
  ratingSpeed: z.number().min(0.5).max(5).optional(),
  ratingExperience: z.number().min(0.5).max(5).optional(),
  ratingImageQuality: z.number().min(0.5).max(5).optional(),
  ratingUi: z.number().min(0.5).max(5).optional(),
  ratingSearch: z.number().min(0.5).max(5).optional(),
  comment: z.string().max(1000).optional(),
  url: z.string().url().max(2000).optional(),
  userAgent: z.string().max(1000).optional(),
  // 自動化網路/效能數據
  connectionType: z.string().max(20).optional(),
  downlink: z.number().optional(),
  rtt: z.number().optional(),
  saveData: z.boolean().optional(),
  lcp: z.number().optional(),
  fid: z.number().optional(),
  cls: z.number().optional(),
  fcp: z.number().optional(),
  ttfb: z.number().optional(),
  imageLoadAvg: z.number().optional(),
  imageLoadCount: z.number().int().optional(),
});
