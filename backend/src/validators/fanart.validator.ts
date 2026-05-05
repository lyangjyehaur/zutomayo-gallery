import { z } from 'zod';

export const assignFanartMediaSchema = z.object({
  mvs: z.array(z.string()),
  groupId: z.string().optional(),
});

export const syncFanartMediaSchema = z.object({
  mvs: z.array(z.string()),
  groupId: z.string().optional(),
});

export const removeFanartMediaFromMvSchema = z.object({
  mvId: z.string().min(1),
});

export const updateFanartStatusSchema = z.object({
  status: z.enum(['organized', 'unorganized', 'deleted']),
});

export const getFanartGalleryQuerySchema = z.object({
  all: z.string().optional(),
  withTotal: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  offset: z.coerce.number().int().min(0).optional().default(0),
  tags: z.string().optional(),
  mvIds: z.string().optional(),
  onlyCollab: z.string().optional(),
  source: z.string().optional(),
});
