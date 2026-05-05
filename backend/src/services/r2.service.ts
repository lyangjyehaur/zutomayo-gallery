import { S3Client, PutObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import type { Readable } from 'stream';
import { logger } from '../utils/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

// R2 配置
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'zutomayo-gallery-archive';
export const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://r2.dan.tw';

let s3Client: S3Client | null = null;

if (ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  logger.info('[R2] Service initialized successfully.');
} else {
  if (isProduction) {
    logger.warn('[R2] Missing R2 credentials in production environment.');
  } else {
    logger.info('[R2] Skipped initialization in development (missing credentials).');
  }
}

/**
 * 檢查檔案是否已存在 R2 中
 */
export const checkImageExists = async (fileName: string): Promise<boolean> => {
  if (!s3Client) return false;
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') return false;
    throw error;
  }
};

/**
 * R2 上傳設定選項
 */
export interface R2UploadOptions {
  retryCount?: number;
  metadata?: Record<string, string>; // 自訂的物件 Metadata (S3 規範)
  forceUpdate?: boolean; // 是否強制覆蓋更新
}

/**
 * 將 Buffer 上傳到 R2
 * @param buffer 檔案的 Buffer 內容
 * @param fileName 檔案名稱 (包含資料夾路徑，例如 'fanarts/abc.jpg')
 * @param contentType 檔案的 Content-Type (例如 'image/jpeg')
 * @param options 額外的上傳設定選項
 * @returns 上傳成功後的 R2 公開網址
 */
export const uploadBufferToR2 = async (
  buffer: Buffer,
  fileName: string,
  contentType: string,
  options?: R2UploadOptions
): Promise<string | null> => {
  if (!s3Client) return null;

  const retryCount = options?.retryCount ?? 3;
  let attempt = 0;
  
  while (attempt < retryCount) {
    try {
      // 1. 檢查是否已經備份過 (除非設定 forceUpdate=true)
      if (!options?.forceUpdate) {
        const exists = await checkImageExists(fileName);
        if (exists) {
          logger.info({ fileName }, '[R2] File already exists');
          return `${R2_PUBLIC_DOMAIN}/${fileName}`;
        }
      }

      // 2. 準備 Metadata
      const metadata: Record<string, string> = {
        'uploaded-by': 'ztmy-gallery-backend',
        'upload-timestamp': new Date().toISOString()
      };
      
      if (options?.metadata) {
        Object.assign(metadata, options.metadata);
      }

      // 3. 上傳到 R2
      logger.info({ fileName, attempt: attempt + 1, retryCount, sizeKB: (buffer.length / 1024).toFixed(2) }, '[R2] Uploading buffer to R2');
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
        // 快取設定：讓 Cloudflare 邊緣節點快取 1 年
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: metadata
      }));

      return `${R2_PUBLIC_DOMAIN}/${fileName}`;
    } catch (error) {
      attempt++;
      logger.error({ err: error, fileName, attempt, retryCount }, '[R2] Error uploading buffer');
      if (attempt >= retryCount) {
        logger.error({ fileName }, '[R2] Max retries reached, giving up');
        return null;
      }
      // 等待一段時間後重試 (1s, 2s, 3s...)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return null;
};

export const uploadStreamToR2 = async (
  body: Readable,
  fileName: string,
  contentType: string,
  options?: R2UploadOptions & { sizeBytes?: number }
): Promise<string | null> => {
  if (!s3Client) return null;

  const retryCount = options?.retryCount ?? 3;
  let attempt = 0;

  while (attempt < retryCount) {
    try {
      if (!options?.forceUpdate) {
        const exists = await checkImageExists(fileName);
        if (exists) {
          logger.info({ fileName }, '[R2] File already exists');
          return `${R2_PUBLIC_DOMAIN}/${fileName}`;
        }
      }

      const metadata: Record<string, string> = {
        'uploaded-by': 'ztmy-gallery-backend',
        'upload-timestamp': new Date().toISOString()
      };
      if (options?.metadata) Object.assign(metadata, options.metadata);

      logger.info({ fileName, attempt: attempt + 1, retryCount, sizeMB: options?.sizeBytes ? (options.sizeBytes / 1024 / 1024).toFixed(2) : 'unknown' }, '[R2] Uploading stream to R2');
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: metadata
      }));

      return `${R2_PUBLIC_DOMAIN}/${fileName}`;
    } catch (error) {
      attempt++;
      logger.error({ err: error, fileName, attempt, retryCount }, '[R2] Error uploading stream');
      if (attempt >= retryCount) {
        logger.error({ fileName }, '[R2] Max retries reached, giving up');
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return null;
};

/**
 * 在 R2 中移動檔案 (Copy & Delete)
 * @param oldKey 原本的檔案路徑 (e.g. 'mvs/temp/file.mp4')
 * @param newKey 新的檔案路徑 (e.g. 'mvs/final/file.mp4')
 * @returns 成功移動後的 R2 公開網址，失敗則回傳 null
 */
export const moveFileInR2 = async (oldKey: string, newKey: string): Promise<string | null> => {
  if (!s3Client) return null;
  
  try {
    // 1. 複製檔案
    logger.info({ oldKey, newKey }, '[R2] Copying file...');
    await s3Client.send(new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${encodeURI(oldKey)}`,
      Key: newKey,
    }));

    // 2. 刪除原檔案
    logger.info({ oldKey }, '[R2] Deleting original file');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: oldKey,
    }));

    logger.info({ newKey }, '[R2] Successfully moved file');
    return `${R2_PUBLIC_DOMAIN}/${newKey}`;
  } catch (error) {
    logger.error({ err: error, oldKey, newKey }, '[R2] Error moving file');
    return null;
  }
};

/**
 * 下載網路圖片並上傳到 R2
 * @param url 原始圖片網址 (如推特 pbs.twimg.com)
 * @param folder 儲存的資料夾名稱 (如 fanarts, mvs/ID)
 * @param options 上傳選項 (重試次數、Metadata)
 * @returns 成功上傳後的 R2 公開網址
 */
export const backupImageToR2 = async (
  url: string, 
  folder: string = 'images', 
  options?: R2UploadOptions
): Promise<string | null> => {
  if (!s3Client) return null;

  const retryCount = options?.retryCount ?? 3;
  let attempt = 0;
  while (attempt < retryCount) {
    try {
      // 1. 產生唯一檔名 (根據 URL 的 Hash，避免重複下載)
      // 取得原本的副檔名 (例如 .jpg, .mp4)
      const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|avif|mp4|m4v|mov|m3u8)/i);
      let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
      if (url.includes('format=png')) ext = 'png';
      if (url.includes('format=webp')) ext = 'webp';
      if (url.includes('format=mp4')) ext = 'mp4';

      const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
      const fileName = `${folder}/${hash}.${ext}`;

      // 2. 檢查是否已經備份過 (除非設定 forceUpdate=true)
      if (!options?.forceUpdate) {
        const exists = await checkImageExists(fileName);
        if (exists) {
          logger.info({ fileName }, '[R2] Image already backed up');
          return `${R2_PUBLIC_DOMAIN}/${fileName}`;
        }
      }

      // 3. 下載原圖
      // 如果是推特圖，加上 name=orig 來抓取最大畫質
      let fetchUrl = url;
      if (fetchUrl.includes('pbs.twimg.com')) {
        // 移除現有的格式參數，確保我們能附加 orig
        fetchUrl = fetchUrl.replace(/&name=[a-z0-9]+/i, '');
        fetchUrl = fetchUrl.replace(/\?name=[a-z0-9]+/i, '?');
        
        // 確保加上 name=orig
        fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&name=orig` : `${fetchUrl}?name=orig`;
        // 清理可能出現的 ?& 狀況
        fetchUrl = fetchUrl.replace('?&', '?');
      }
      logger.info({ fetchUrl, attempt: attempt + 1, retryCount }, '[R2] Downloading image');

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image, status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let contentType = response.headers.get('content-type');
      if (!contentType || contentType.includes('text/plain') || contentType.includes('application/octet-stream')) {
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
          'webp': 'image/webp', 'avif': 'image/avif', 'mp4': 'video/mp4', 'm4v': 'video/mp4',
          'mov': 'video/quicktime', 'm3u8': 'application/vnd.apple.mpegurl'
        };
        contentType = mimeTypes[ext] || `image/${ext}`;
      }
      
      // ===== R2 特性與前瞻性擴展 (Metadata) =====
      // 將原始來源與專案資訊作為 Metadata 存入 R2，方便未來管理與遷移
      const metadata: Record<string, string> = {
        'original-url': url,
        'uploaded-by': 'ztmy-gallery-backend',
        'upload-timestamp': new Date().toISOString()
      };
      
      // 如果有額外的 metadata (例如 MV ID, 繪師推特)，也一併存入
      if (options?.metadata) {
        Object.assign(metadata, options.metadata);
      }

      // 4. 上傳到 R2
      logger.info({ fileName, sizeKB: (buffer.length / 1024).toFixed(2) }, '[R2] Uploading to R2');
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
        // 快取設定：讓 Cloudflare 邊緣節點快取 1 年
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: metadata
      }));

      return `${R2_PUBLIC_DOMAIN}/${fileName}`;
    } catch (error) {
      attempt++;
      logger.error({ err: error, url, attempt, retryCount }, '[R2] Error backing up image');
      if (attempt >= retryCount) {
        logger.error({ url }, '[R2] Max retries reached, giving up');
        return null;
      }
      // 等待一段時間後重試 (1s, 2s, 3s...)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return null;
};
