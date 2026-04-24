import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

// R2 配置
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'zutomayo-gallery-archive';
export const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://archive.ztmr.club';

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
  console.log('[R2] Service initialized successfully.');
} else {
  if (isProduction) {
    console.warn('[R2] Missing R2 credentials in production environment.');
  } else {
    console.log('[R2] Skipped initialization in development (missing credentials).');
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
 * 下載網路圖片並上傳到 R2
 * @param url 原始圖片網址 (如推特 pbs.twimg.com)
 * @param folder 儲存的資料夾名稱 (如 fanarts, mvs)
 * @returns 成功上傳後的 R2 公開網址
 */
export const backupImageToR2 = async (url: string, folder: string = 'images'): Promise<string | null> => {
  if (!s3Client) return null;

  try {
    // 1. 產生唯一檔名 (根據 URL 的 Hash，避免重複下載)
    // 取得原本的副檔名 (例如 .jpg)
    const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|avif)/i);
    let ext = extMatch ? extMatch[1] : 'jpg';
    if (url.includes('format=png')) ext = 'png';
    if (url.includes('format=webp')) ext = 'webp';

    const hash = crypto.createHash('md5').update(url).digest('hex');
    const fileName = `${folder}/${hash}.${ext}`;

    // 2. 檢查是否已經備份過
    const exists = await checkImageExists(fileName);
    if (exists) {
      console.log(`[R2] Image already backed up: ${fileName}`);
      return `${R2_PUBLIC_DOMAIN}/${fileName}`;
    }

    // 3. 下載原圖
    console.log(`[R2] Downloading image: ${url}`);
    // 如果是推特圖，加上 name=orig 來抓取最大畫質
    let fetchUrl = url;
    if (fetchUrl.includes('pbs.twimg.com') && !fetchUrl.includes('name=')) {
      fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&name=orig` : `${fetchUrl}?name=orig`;
    } else if (fetchUrl.includes('pbs.twimg.com') && fetchUrl.includes('name=large')) {
      fetchUrl = fetchUrl.replace('name=large', 'name=orig');
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image, status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || `image/${ext}`;

    // 4. 上傳到 R2
    console.log(`[R2] Uploading to R2: ${fileName} (${(buffer.length / 1024).toFixed(2)} KB)`);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      // 快取設定：讓 Cloudflare 邊緣節點快取 1 年
      CacheControl: 'public, max-age=31536000, immutable'
    }));

    return `${R2_PUBLIC_DOMAIN}/${fileName}`;
  } catch (error) {
    console.error(`[R2] Error backing up image ${url}:`, error);
    return null;
  }
};