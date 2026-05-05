import { z } from 'zod';

export const createSubmissionSchema = z.object({
  mvIds: z.array(z.string()).optional().default([]),
  specialTags: z.array(z.string()).optional().default([]),
  note: z.string().max(1000).optional(),
  anonymous: z.boolean().optional(),
});

export const updateSubmissionSchema = z.object({
  mvIds: z.array(z.string()).optional().default([]),
  specialTags: z.array(z.string()).optional().default([]),
  note: z.string().max(1000).optional(),
});
