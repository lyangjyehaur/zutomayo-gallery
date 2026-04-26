import { S3Client, PutObjectCommand, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

// 確保在引入任何內部模組前先讀取 .env！
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// 強制覆蓋可能的快取環境變數，確保使用本地 .env
if (!process.env.DB_HOST && process.env.NODE_ENV !== 'production') {
  const parsed = dotenv.config({ path: path.resolve(process.cwd(), '.env') }).parsed;
  if (parsed) {
    Object.keys(parsed).forEach(key => {
      process.env[key] = parsed[key];
    });
  }
}

import { AppleMusicAlbumModel, sequelize } from '../models/index.js';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  console.error('❌ 缺少 R2 環境變數，請確認 backend/.env 檔案中是否已設定:');
  console.error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const ARTIST_ID = 1428083875; // ZUTOMAYO's Apple Music Artist ID

// Apple Music Storefronts to check
// 包含所有 Apple Music 營運的國家代碼 (ISO 3166-1 alpha-2)，共 249 個國家/地區
const REGIONS = [
  "af", "al", "dz", "as", "ad", "ao", "ai", "aq", "ag", "ar", "am", "aw", "au", "at", "az", "bs", "bh", "bd", "bb", "by", "be", "bz", "bj", "bm", "bt", "bo", "ba", "bw", "bv", "br", "io", "bn", "bg", "bf", "bi", "cv", "kh", "cm", "cd", "cg", "cc", "km", "co", "km", "cr", "hr", "cu", "cw", "cy", "cz", "ci", "dk", "dj", "dm", "do", "ec", "eg", "sv", "gq", "er", "ee", "sz", "et", "fk", "fo", "fo", "fj", "fi", "fr", "gf", "pf", "tf", "tf", "ga", "ge", "gm", "ge", "de", "gh", "gi", "gr", "gl", "gl", "gd", "gp", "gu", "gt", "gg", "gn", "gw", "gy", "ht", "hm", "va", "hn", "hk", "hu", "is", "in", "id", "ir", "iq", "ie", "im", "il", "it", "jm", "jp", "je", "je", "jo", "kz", "ke", "ki", "kp", "kr", "kw", "kg", "la", "lv", "lb", "ls", "lr", "ly", "li", "lt", "lu", "mo", "mk", "mg", "mw", "my", "mv", "ml", "mt", "mh", "mq", "mr", "mu", "yt", "mx", "fm", "md", "mc", "mn", "me", "ms", "ma", "mz", "mm", "na", "nr", "np", "nl", "an", "nc", "nz", "ni", "ne", "ng", "nu", "nf", "nf", "mp", "no", "om", "pk", "pw", "ps", "pa", "pg", "py", "pe", "ph", "pn", "pl", "pt", "pr", "qa", "re", "ro", "ru", "rw", "bl", "bl", "sh", "kn", "lc", "pm", "vc", "ws", "sm", "st", "sa", "sn", "rs", "sc", "sl", "sg", "sx", "sk", "si", "sb", "so", "za", "gs", "ss", "es", "lk", "sd", "sr", "sj", "sz", "se", "ch", "sy", "tw", "tj", "tz", "th", "tl", "tg", "tk", "to", "tt", "tn", "tr", "tm", "tc", "tv", "ug", "ua", "ae", "gb", "us", "um", "uy", "uz", "vu", "ve", "vn", "vg", "vi", "wf", "eh", "eh", "ye", "zm", "zw", "cn"
];

function getLangForRegion(region: string) {
  const langMap: Record<string, string> = {
    jp: 'ja_jp',
    tw: 'zh_tw',
    hk: 'zh_hk',
    cn: 'zh_cn',
    kr: 'ko_kr',
  };
  // 盡可能要求 Apple Music 回傳日文原名，如果該區域沒有對應語言則 fallback 回區域預設語言
  return langMap[region] || 'ja_jp';
}

async function fetchAlbumsFromRegion(region: string) {
  try {
    const lang = getLangForRegion(region);
    // 使用 lookup API 抓取 album (退回原本抓 album，因為抓 song 的資料量太大且會遺漏純專輯)
    const lookupUrl = `https://itunes.apple.com/lookup?id=${ARTIST_ID}&entity=album&country=${region}&lang=${lang}`;
    const response = await fetch(lookupUrl);
    if (!response.ok) return [];
    
    const data = await response.json();
    // 紀錄最原始的名稱，供後續命名檔案使用
      let collections = data.results
        .filter((item: any) => item.wrapperType === 'collection')
        .map((item: any) => ({ ...item, _region: region, originalName: item.collectionName }));
      
    // 若為日區，額外使用 search API 進行補強
    if (region === 'jp') {
      try {
        const terms = ['ずっと真夜中でいいのに。', 'ZUTOMAYO'];
        for (const term of terms) {
          // 額外搜尋特定中文或日文，確保沒有漏網之魚
          const searchUrl = encodeURI(`https://itunes.apple.com/search?term=${term}&entity=song&country=jp&lang=ja_jp&limit=200`);
          const searchRes = await fetch(searchUrl);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const searchTracks = searchData.results.filter((item: any) => item.wrapperType === 'track' && item.artistId === ARTIST_ID);
            
            collections = collections.map((col: any) => {
              const matchedTrack = searchTracks.find((s: any) => s.collectionId === col.collectionId);
              if (matchedTrack && matchedTrack.trackName) {
                if (col.collectionType === 'Single' || col.collectionName.endsWith('- Single') || col.collectionName.endsWith('- EP')) {
                  if (/^[a-zA-Z0-9\s'-]+$/.test(col.collectionName.replace(' - Single', '').replace(' - EP', ''))) {
                    const suffix = col.collectionName.endsWith('- EP') ? ' - EP' : ' - Single';
                    return { ...col, collectionName: `${matchedTrack.trackName}${suffix}` };
                  }
                }
              }
              return col;
            });
          }
        }
      } catch (e) {
        console.error('⚠️ 嘗試從 search API 補強日文名稱時失敗:', e);
      }
      // 避免 API 頻率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return collections;
  } catch (err) {
    console.error(`⚠️ 無法獲取 ${region} 區域的資料:`, err);
    return [];
  }
}

async function fetchAndUploadCovers() {
  try {
    // 確保資料表存在
    await sequelize.authenticate();
    await AppleMusicAlbumModel.sync({ alter: true });
    
    console.log(`🔍 正在搜尋 ZUTOMAYO (Artist ID: ${ARTIST_ID}) 跨區域專輯...`);
    
    // 1. Fetch albums from all specified regions
    let allCollections: any[] = [];
    
    // Batch processing to speed up requests (concurrency of 10)
    // 為了避免觸發 Apple Music API Rate Limit，將並行數降低至 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < REGIONS.length; i += BATCH_SIZE) {
      const batchRegions = REGIONS.slice(i, i + BATCH_SIZE);
      console.log(`📍 正在並發拉取區域資料 (${i + 1}/${REGIONS.length}): ${batchRegions.join(', ')}...`);
      
      const batchPromises = batchRegions.map(region => fetchAlbumsFromRegion(region));
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(collections => {
        allCollections = [...allCollections, ...collections];
      });
      
      // 增加延遲避免 Rate Limit (1500ms)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // 2. Deduplicate and prioritize JP region metadata
    // Apple Music Collection ID is unique across regions
    // 處理去重複，我們制定一個國家優先權順序
  // 根據地區決定抓取語言，並為後續去重時提供「優先保留」順序
  const getRegionPriority = (region: string) => {
    const priorities: Record<string, number> = { 'jp': 1, 'cn': 2, 'tw': 3, 'hk': 4 };
    return priorities[region.toLowerCase()] || 99;
  };

  const uniqueCollectionsMap = new Map<number, any>();
  
  for (const album of allCollections) {
    const existing = uniqueCollectionsMap.get(album.collectionId);
    
    if (!existing) {
      uniqueCollectionsMap.set(album.collectionId, album);
    } else {
      // 如果已經存在，比較優先權，保留優先權較高的國家資料
      const existingPriority = getRegionPriority(existing._region);
      const newPriority = getRegionPriority(album._region);
      
      if (newPriority < existingPriority) {
        uniqueCollectionsMap.set(album.collectionId, album);
      }
    }
  }
  
  const collectionsToProcess = Array.from(uniqueCollectionsMap.values());

    console.log(`\n✅ 跨區去重後，共找到 ${collectionsToProcess.length} 張獨特專輯/單曲\n`);

    let successCount = 0;
    let failCount = 0;

    // 3. Iterate through each unique album
    for (const col of collectionsToProcess) {
      const { collectionId, artworkUrl100, artistName, releaseDate, trackCount, collectionType, primaryGenreName, _region } = col;
      if (!artworkUrl100) continue;

      // 替換為最高清解析度與極低壓縮比的 URL (-999.jpg)
      const highResUrl = artworkUrl100.replace('100x100bb.jpg', '10000x10000-999.jpg');
      const fallbackUrl = artworkUrl100.replace('100x100bb.jpg', '10000x10000bb.jpg'); // 備用方案
      
      // 建立安全且乾淨的檔案名稱
      // 產生安全且友善的檔案名稱 (優先將日文轉為羅馬音，避免 R2 路徑編碼問題)
      // 注意：這裡我們刻意保留 originalName，不用修復後的日文來命名，以確保 URL 乾淨
      let originalNameForUrl = col.originalName || col.collectionName;
      
      let safeName = (originalNameForUrl || 'Unknown')
        .normalize('NFD') // 將重音/特殊拉丁字母拆解 (例如 Ō 變成 O + ̄ )
        .replace(/[\u0300-\u036f]/g, '') // 移除拆解出來的重音符號 (例如 ̄ )
        .replace(/[^a-zA-Z0-9]/g, '_') // 保證最終 URL 絕對乾淨，全日文/漢字會變成底線
        .replace(/_+/g, '_') // 合併多個底線
        .replace(/^_|_$/g, ''); // 移除頭尾底線
        
      // 如果過濾後變成空字串 (例如原本全是日文漢字，如「沈香学」)，則 fallback 使用 ID
      if (!safeName) safeName = String(col.collectionId);
      
      // 我們不先決定副檔名，先查出目前的 url 來決定是 jpg 還是 png
      let fileNameBase = `covers/zutomayo/${safeName}`;
      
      // 如果發生檔名衝突（例如中港台三地都有各自的 2024 特別版，但檔名被洗成一樣的 `ZUTOMAYO_2024`）
      // 我們加上區域代碼以確保它們都能被獨立儲存
      if (fileNameBase.includes('ZUTOMAYO_2024')) {
        fileNameBase = `${fileNameBase}_${_region.toUpperCase()}`;
      }
      
      // 統一修復特殊版的名稱排版（把半形的 2024 跟後面的中文字之間補上一個半形空格，以符合 ZUTOMAYO 官方其他語言版本的排版習慣，也方便未來手動維護）
      let finalDisplayName = col.collectionName;
      if (finalDisplayName === 'ZUTOMAYO - 2024 中国特别版') {
        finalDisplayName = 'ZUTOMAYO - 2024 中国特別版'; // 順手把簡體轉繁體
      } else if (finalDisplayName === 'ZUTOMAYO - 2026  Special Edition') {
        finalDisplayName = 'ZUTOMAYO - 2026 Special Edition'; // 修復 Apple Music 上多出的一個空白
      }

      console.log(`\n📥 正在處理: ${finalDisplayName}`);

      const metadata = {
        'album-name': Buffer.from(finalDisplayName || '').toString('base64'),
        'artist-name': Buffer.from(artistName || '').toString('base64'),
        'release-date': releaseDate || '',
        'track-count': String(trackCount || 0),
        'collection-type': collectionType || '',
        'genre': Buffer.from(primaryGenreName || '').toString('base64'),
        'apple-region': _region || 'unknown'
      };

      let needsDownload = true;
      let headResponse: any = null;
      let existingFileName = '';
      let isLossless = false;
      let currentUrl = '';
      const existingAlbum = await AppleMusicAlbumModel.findOne({ where: { collection_id: String(collectionId) } });

      try {
        // 先檢查 R2 是否已經存在該檔案 (因為我們之前可能存成了 .jpg)
        // 我們依序檢查 png 和 jpg 兩個後綴
        try {
          existingFileName = `${fileNameBase}.png`;
          headResponse = await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: existingFileName
          }));
        } catch (e: any) {
          if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
            existingFileName = `${fileNameBase}.jpg`;
            headResponse = await s3Client.send(new HeadObjectCommand({
              Bucket: BUCKET_NAME,
              Key: existingFileName
            }));
          } else {
            throw e;
          }
        }
        
        const existingSourceUrl = headResponse?.Metadata?.['source-url'] || '';
        
        // 如果 R2 裡已經有 source-url 紀錄，且附檔名符合 source-url，則不需要重新下載
        if (existingSourceUrl) {
          const isCorrectExtension = 
            (existingSourceUrl.endsWith('.png') && existingFileName.endsWith('.png')) ||
            (existingSourceUrl.endsWith('.jpg') && existingFileName.endsWith('.jpg'));
            
          // 我們不再比較 existingAlbum?.album_name === finalDisplayName
          // 這樣才能保護使用者在資料庫手動修改的名稱不被 Apple Music 的更新覆蓋
          if (isCorrectExtension) {
            needsDownload = false;
            currentUrl = existingSourceUrl;
            isLossless = (headResponse?.Metadata?.['is-lossless'] || 'false') === 'true';
          } else {
            console.log(`ℹ️ 發現附檔名不符或檔案遺失，準備重新下載與修正...`);
          }
        }
      } catch (headErr: any) {
        if (headErr.name !== 'NotFound' && headErr.$metadata?.httpStatusCode !== 404) {
          throw headErr;
        }
      }

      try {
        let finalFileName = existingFileName;
        const r2Url = `https://${process.env.R2_PUBLIC_DOMAIN || 'r2.dan.tw'}`;

        if (!needsDownload && existingFileName) {
          // 只更新 Metadata 與 DB
          console.log(`ℹ️ 圖片已存在於 R2 且資訊完整，正在更新 Metadata...`);
          
          await s3Client.send(new CopyObjectCommand({
            Bucket: BUCKET_NAME,
            CopySource: `${BUCKET_NAME}/${encodeURI(finalFileName)}`,
            Key: finalFileName,
            MetadataDirective: 'REPLACE',
            ContentType: finalFileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
            Metadata: {
              ...metadata,
              'source-url': currentUrl,
              'is-lossless': isLossless ? 'true' : 'false'
            }
          }));
        } else {
          // 檔案不存在或需要重新下載
          console.log(`🔽 準備從 Apple Music 下載並寫入正確的 Metadata 與檔案格式...`);
          
          const pngUrl = artworkUrl100.replace('100x100bb.jpg', '10000x10000-999.png');
          const jpgUrl = artworkUrl100.replace('100x100bb.jpg', '10000x10000-999.jpg');
          const fallbackUrl = artworkUrl100.replace('100x100bb.jpg', '10000x10000bb.jpg');

          let imgRes = await fetch(pngUrl);
          
          if (imgRes.ok) {
            currentUrl = pngUrl;
            isLossless = true;
            console.log(`🔗 成功獲取 PNG 無損版本 (-999.png)`);
          } else {
            imgRes = await fetch(jpgUrl);
            if (imgRes.ok) {
              currentUrl = jpgUrl;
              isLossless = true;
              console.log(`🔗 成功獲取 JPG 無損版本 (-999.jpg)`);
            } else {
              console.log(`⚠️ 無法獲取無損版本，退而求其次使用普通高清版本 (bb.jpg)...`);
              imgRes = await fetch(fallbackUrl);
              currentUrl = fallbackUrl;
              isLossless = false;
          if (!imgRes.ok) {
            throw new Error(`無法下載圖片，HTTP 狀態碼: ${imgRes.status}`);
          }
          console.log(`🔗 成功獲取 URL: ${currentUrl}`);
          
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = currentUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
          finalFileName = currentUrl.endsWith('.png') ? `${fileNameBase}.png` : `${fileNameBase}.jpg`;
          
          console.log(`📤 正在上傳至 R2: ${finalFileName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
          
          // 上傳至 R2，並將基礎資訊寫入 Metadata
          await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: finalFileName,
            Body: buffer,
            ContentType: contentType,
            Metadata: {
              ...metadata,
              'source-url': currentUrl,
              'is-lossless': isLossless ? 'true' : 'false'
            }
          }));
        }

        // 將資料更新/寫入資料庫 (無論是更新或重新下載都執行)
        const finalR2Url = `${r2Url}/${finalFileName}`;

        if (existingAlbum) {
          // 只更新非名稱相關的欄位，保護使用者可能手動編輯過的 album_name
          await existingAlbum.update({
            artist_name: artistName || '',
            release_date: releaseDate ? new Date(releaseDate) : null,
            track_count: trackCount || 0,
            collection_type: collectionType || '',
            genre: primaryGenreName || '',
            apple_region: _region || 'unknown',
            source_url: currentUrl,
            r2_url: finalR2Url,
            is_lossless: isLossless
          });
        } else {
          // 只有第一次建立時，才會寫入 Apple API 回傳的 finalDisplayName
          await AppleMusicAlbumModel.create({
            collection_id: String(collectionId),
            album_name: finalDisplayName || '',
            artist_name: artistName || '',
            release_date: releaseDate ? new Date(releaseDate) : null,
            track_count: trackCount || 0,
            collection_type: collectionType || '',
            genre: primaryGenreName || '',
            apple_region: _region || 'unknown',
            source_url: currentUrl,
            r2_url: finalR2Url,
            is_lossless: isLossless
          });
        }

        console.log(`🎉 成功處理並寫入資料庫: ${finalFileName}`);
        successCount++;
      } catch (err) {
        console.error(`❌ 處理失敗 (${finalDisplayName}):`, err);
        failCount++;
      }
      
      // 避免請求過快，大幅增加處理每張專輯後的延遲 (1200ms)
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    
    console.log('\n========================================');
    console.log(`🏁 處理完成！成功: ${successCount}，失敗: ${failCount}`);
    console.log('========================================');
    
    // 關閉資料庫連線
    await sequelize.close();
    
  } catch (error) {
    console.error('執行過程中發生未預期錯誤:', error);
  }
}

fetchAndUploadCovers();
