import { z } from 'zod';

export const toggleMaintenanceSchema = z.object({
  maintenance: z.boolean(),
  type: z.enum(['data', 'ui']).optional(),
  eta: z.string().optional(),
});

export const saveGeoRawSchema = z.object({
  geo_session_id: z.string().optional(),
  ip: z.string().optional(),       // 可選：後端可從請求頭提取
  country: z.string().optional(),
  raw_country: z.string().optional(),
  ip2region_raw: z.string().optional(),
  geoip_raw: z.string().optional(),
  maxmind_city_raw: z.string().optional(),
  maxmind_asn_raw: z.string().optional(),
  ip2region_sha256: z.string().optional(),   // 可選：後端可自行計算
  geoip_sha256: z.string().optional(),
  maxmind_city_sha256: z.string().optional(),
  maxmind_asn_sha256: z.string().optional(),
});

const dictionaryItemSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().optional(),
});

export const updateDictionariesSchema = z.object({
  dicts: z.array(dictionaryItemSchema).optional(),
  deletedIds: z.array(z.string()).optional(),
});

export const createDictionarySchema = z.object({
  category: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().optional(),
});

export const patchDictionarySchema = z.object({
  category: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  sort_order: z.number().optional(),
});

export const clearRedisApiCacheSchema = z.object({}).optional();
