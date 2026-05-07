import { z } from 'zod';

export const createSpeedSurveySchema = z.object({
  rating: z.number().min(0.5).max(5),
  comment: z.string().max(1000).optional(),
  url: z.string().url().max(2000).optional(),
  userAgent: z.string().max(1000).optional(),
});
