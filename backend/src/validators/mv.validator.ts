import { z } from 'zod';

// 查詢參數驗證
export const querySchema = z.object({
  search: z.string()
    .max(100, '搜尋關鍵字過長')
    .regex(/^[\w\s\-\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]*$/, '包含非法字符')
    .optional(),
  year: z.string()
    .regex(/^\d{4}$/, '年份格式錯誤')
    .refine((val) => {
      const year = parseInt(val);
      return year >= 2018 && year <= new Date().getFullYear();
    }, '年份超出範圍')
    .optional(),
  album: z.string().max(50).optional(),
  artist: z.string().max(50).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
});

// MV ID 驗證
export const idSchema = z.string()
  .min(1, 'ID 不能為空')
  .max(50, 'ID 過長')
  .regex(/^[\w\-]+$/, 'ID 格式錯誤');

// 圖片探測請求驗證
export const probeSchema = z.object({
  url: z.string()
    .url('無效的 URL')
    .max(2000, 'URL 過長')
    .refine((val) => {
      const allowedProtocols = ['http:', 'https:'];
      try {
        const url = new URL(val);
        return allowedProtocols.includes(url.protocol);
      } catch {
        return false;
      }
    }, '僅允許 HTTP/HTTPS 協議'),
});

// MV 數據驗證（用於更新）- 放開必填限制，允許空值
export const mvItemSchema = z.object({
  id: z.string().min(1, 'ID 不能為空'),
  title: z.string().max(200).optional().or(z.literal('')),
  year: z.string().regex(/^\d{4}$/).optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
  description: z.string().max(5000).optional().or(z.literal('')),
  youtube: z.string().optional().or(z.literal('')),
  bilibili: z.string().optional().or(z.literal('')),
  keywords: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string()
    }).passthrough()
  ).optional().default([]),
  images: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string(),
      url: z.string(),
      original_url: z.string().optional(),
      thumbnail_url: z.string().optional(),
      caption: z.string().optional().or(z.literal('')),
      width: z.number().optional().or(z.literal(0)).or(z.literal(null)),
      height: z.number().optional().or(z.literal(0)).or(z.literal(null)),
    }).passthrough()
  ).optional().default([]),
  albums: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string()
    }).passthrough()
  ).optional().default([]),
  creators: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string()
    }).passthrough()
  ).optional().default([]),
}).passthrough(); // 允許 MV 物件內有未定義的新欄位

export const mvArraySchema = z.array(mvItemSchema);

// 驗證輔助函數
export function validateQuery(query: unknown) {
  return querySchema.parse(query);
}

export function validateId(id: string) {
  return idSchema.parse(id);
}

export function validateProbe(body: unknown) {
  return probeSchema.parse(body);
}

export function validateMVs(data: unknown) {
  return mvArraySchema.parse(data);
}
