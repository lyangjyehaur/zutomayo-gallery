import { z } from 'zod';

export const createAnnotationSchema = z.object({
  media_id: z.string().min(1),
  label: z.string().min(1).max(500),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  style: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});

export const updateAnnotationSchema = z.object({
  label: z.string().min(1).max(500).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  style: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});
