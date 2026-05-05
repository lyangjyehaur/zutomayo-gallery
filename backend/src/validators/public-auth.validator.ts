import { z } from 'zod';

export const requestMagicLinkSchema = z.object({
  email: z.string().email('INVALID_EMAIL').max(254, 'INVALID_EMAIL'),
  redirectUrl: z.string().url().optional(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(16, 'INVALID_TOKEN'),
});

export const registerSchema = z.object({
  email: z.string().email('INVALID_EMAIL').max(254, 'INVALID_EMAIL'),
  password: z.string().min(8, 'INVALID_PASSWORD').max(72, 'INVALID_PASSWORD'),
  display_name: z.string().max(64).optional(),
  redirectUrl: z.string().url().optional(),
});

export const loginWithPasswordSchema = z.object({
  email: z.string().email('INVALID_CREDENTIALS').max(254, 'INVALID_CREDENTIALS'),
  password: z.string().min(1, 'INVALID_CREDENTIALS'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().max(254).optional().default(''),
  redirectUrl: z.string().url().optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, 'INVALID_TOKEN'),
  password: z.string().min(8, 'INVALID_PASSWORD').max(72, 'INVALID_PASSWORD'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16, 'INVALID_TOKEN'),
});

export const updateMeSchema = z.object({
  display_name: z.string().max(64).optional(),
  social_links: z.object({
    x: z.string().max(200).optional(),
    instagram: z.string().max(200).optional(),
    pixiv: z.string().max(200).optional(),
    youtube: z.string().max(200).optional(),
    website: z.string().max(200).optional(),
  }).optional(),
  public_profile_enabled: z.boolean().optional(),
  public_profile_fields: z.object({
    display_name: z.boolean().optional(),
    socials: z.boolean().optional(),
    email_masked: z.boolean().optional(),
  }).optional(),
});
