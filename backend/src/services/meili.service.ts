import { Meilisearch } from 'meilisearch';
import { getMVsFromDB } from './v2_mapper.js';
import { logger } from '../utils/logger.js';

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
    logger.info('[Meilisearch] Skipped initialization in development environment');
    return;
  }
  try {
    const health = await meiliClient.health();
    logger.info({ status: health.status }, '[Meilisearch] Status');

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

    logger.info('[Meilisearch] Indices settings updated.');
  } catch (error) {
    logger.error({ err: error }, '[Meilisearch] Initialization failed');
  }
};

export const syncDataToMeili = async () => {
  if (!isProduction && !process.env.MEILI_HOST) return;
  try {
    logger.info('[Meilisearch] Starting data sync...');

    // 1. 處理 MVs
    const mvs = await getMVsFromDB();
    const mvDocs = mvs.map(mv => {
      // 處理 keywords 為純文字以便搜尋
      let keywords_text: string[] = [];
      if (Array.isArray(mv.keywords)) {
        keywords_text = mv.keywords.map(k => k.name);
      }
      
      return {
        id: mv.id,
        title: mv.title,
        description: mv.description,
        artist: Array.isArray(mv.creators) ? mv.creators.map(c => c.name) : [],
        album: Array.isArray(mv.albums) ? mv.albums.map(a => a.name) : [],
        keywords_text,
        year: mv.year,
        date: mv.date ? new Date(mv.date).getTime() : null,
      };
    });

    if (mvDocs.length > 0) {
      const response = await meiliClient.index('mvs').addDocuments(mvDocs);
      logger.info({ count: mvDocs.length, taskUid: response.taskUid }, '[Meilisearch] Enqueued MVs');
    }

    // 2. 處理 Fanarts (已經整合到 V2，這裡可以從 images 表中篩選 type=fanart，但通常 Fanart 不直接建獨立文件，而是跟著 MV)
    // 為了相容前端 /api/search?type=fanart，我們直接從 MVs 裡拆出 fanart
    const fanartDocs = mvs.flatMap(mv => {
    const fanarts = mv.images?.filter(img => img.type === 'fanart') || [];
    return fanarts.map(fa => ({
      id: fa.id,
      mv_id: mv.id,
      tweetText: fa.group?.source_text || '',
      tweetAuthor: fa.group?.author_name || '',
      tweetHandle: fa.group?.author_handle || '',
      status: fa.group?.status || 'pending',
      tweetDate: fa.group?.post_date ? new Date(fa.group.post_date).getTime() : null,
    }));
  });

    if (fanartDocs.length > 0) {
      const response = await meiliClient.index('fanarts').addDocuments(fanartDocs);
      logger.info({ count: fanartDocs.length, taskUid: response.taskUid }, '[Meilisearch] Enqueued Fanarts');
    }

    logger.info('[Meilisearch] Sync process completed.');
  } catch (error) {
    logger.error({ err: error }, '[Meilisearch] Failed to sync data');
  }
};