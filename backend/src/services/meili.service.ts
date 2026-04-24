import { Meilisearch } from 'meilisearch';
import { Fanart } from './pg.service.js';
import { getV2MVsAsLegacyJSON } from './v2_mapper.js';

const isProduction = process.env.NODE_ENV === 'production';
const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_MASTER_KEY = process.env.MEILI_MASTER_KEY || 'Ztmr_Meili_Master_Key_2026!';

export const meiliClient = new Meilisearch({
  host: MEILI_HOST,
  apiKey: MEILI_MASTER_KEY,
});

export const initMeiliSearch = async () => {
  // 本地開發時若沒提供 MEILI_HOST 則跳過
  if (!isProduction && !process.env.MEILI_HOST) {
    console.log('[Meilisearch] Skipped initialization in development environment');
    return;
  }
  try {
    const health = await meiliClient.health();
    console.log('[Meilisearch] Status:', health.status);

    // ==========================================
    // 1. 初始化 MVs 索引
    // ==========================================
    const mvIndex = meiliClient.index('mvs');
    await mvIndex.updateSettings({
      searchableAttributes: ['title', 'description', 'artist', 'album', 'keywords_text'],
      filterableAttributes: ['year'],
      sortableAttributes: ['date'],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      }
    });

    // ==========================================
    // 2. 初始化 Fanarts 索引
    // ==========================================
    const fanartIndex = meiliClient.index('fanarts');
    await fanartIndex.updateSettings({
      searchableAttributes: ['tweetText', 'tweetAuthor', 'tweetHandle'],
      filterableAttributes: ['status'],
      sortableAttributes: ['tweetDate'],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      }
    });

    console.log('[Meilisearch] Indices settings updated.');
  } catch (error) {
    console.error('[Meilisearch] Initialization failed:', error);
  }
};

export const syncDataToMeili = async () => {
  if (!isProduction && !process.env.MEILI_HOST) return;
  try {
    console.log('[Meilisearch] Starting data sync...');

    // 1. 處理 MVs
    const mvs = await getV2MVsAsLegacyJSON();
    const mvDocs = mvs.map(mv => {
      // 處理 keywords 為純文字以便搜尋
      let keywords_text = [];
      if (Array.isArray(mv.keywords)) {
        keywords_text = mv.keywords.map((k: any) => typeof k === 'string' ? k : k.text);
      }
      
      return {
        id: mv.id,
        title: mv.title,
        description: mv.description,
        artist: Array.isArray(mv.artist) ? mv.artist : [mv.artist],
        album: Array.isArray(mv.album) ? mv.album : [mv.album],
        keywords_text,
        year: mv.year,
        date: mv.date ? new Date(mv.date).getTime() : null,
      };
    });

    if (mvDocs.length > 0) {
      const response = await meiliClient.index('mvs').addDocuments(mvDocs);
      console.log(`[Meilisearch] Enqueued ${mvDocs.length} MVs. Task UID: ${response.taskUid}`);
    }

    // 2. 處理 Fanarts
    const fanarts = await Fanart.findAll();
    const fanartDocs = fanarts.map(row => {
      const fa = row.toJSON() as any;
      return {
        id: fa.id,
        tweetText: fa.tweetText,
        tweetAuthor: fa.tweetAuthor,
        tweetHandle: fa.tweetHandle,
        status: fa.status,
        tweetDate: fa.tweetDate ? new Date(fa.tweetDate).getTime() : null,
      };
    });

    if (fanartDocs.length > 0) {
      const response = await meiliClient.index('fanarts').addDocuments(fanartDocs);
      console.log(`[Meilisearch] Enqueued ${fanartDocs.length} Fanarts. Task UID: ${response.taskUid}`);
    }

    console.log('[Meilisearch] Sync process completed.');
  } catch (error) {
    console.error('[Meilisearch] Failed to sync data:', error);
  }
};