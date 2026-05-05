import { z } from 'zod';

export const listSubmissionsQuerySchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'cancelled']).optional().default('pending'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const rejectSubmissionSchema = z.object({
  reason: z.string().min(1).max(500),
});
