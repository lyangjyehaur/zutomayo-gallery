import {
  MVModel,
  MediaModel,
  ArtistModel,
  AlbumModel,
  KeywordModel,
  MediaGroupModel,
  MVMediaModel,
  MVArtistModel,
  MVAlbumModel,
  MVKeywordModel,
  sequelize
} from '../models/index.js';
import { nanoid } from 'nanoid';
const generateShortId = () => nanoid(16);
import { MVItem, MVMedia } from '../types.js';

/**
 * 讀取 V2 關聯式資料庫，並轉換回前端期望的 V1 JSONB 結構
 */
export async function getMVsFromDB(): Promise<MVItem[]> {
  const mvs = await MVModel.findAll({
    include: [
      { model: ArtistModel, as: 'creators', through: { attributes: ['role'] } },
      { model: AlbumModel, as: 'albums', through: { attributes: ['track_number'] } },
      { model: KeywordModel, as: 'keywords', through: { attributes: [] } },
      { 
        model: MediaModel, 
        as: 'images',
        through: { attributes: ['usage', 'order_index'] },
        include: [{ model: MediaGroupModel, as: 'group' }]
      }
    ],
    order: [
      ['date', 'DESC'],
      [{ model: MediaModel, as: 'images' }, MVMediaModel, 'order_index', 'ASC']
    ]
  });

  // R2 直連優化：不再需要將 r2.dan.tw 轉換為 assets.ztmr.club/r2
  const formatMediaUrl = (url: string) => {
    return url;
  };

  return mvs.map((mvRecord) => {
    const mv = mvRecord.toJSON() as any;

    // Flatten creators role
    if (mv.creators) {
      mv.creators = mv.creators.map((c: any) => ({
        ...c,
        role: c.MVArtist?.role || c.role || 'unknown'
      }));
    }

    // Flatten keywords text (for frontend compatibility)
    if (mv.keywords) {
      mv.keywords = mv.keywords.map((k: any) => ({
        ...k,
        text: k.name // provide text for frontend
      }));
    }

    // Flatten images usage, order_index and format url
    if (mv.images) {
      mv.images = mv.images.map((img: any) => ({
        ...img,
        url: formatMediaUrl(img.url),
        thumbnail_url: formatMediaUrl(img.thumbnail_url),
        tags: Array.isArray(img.tags) ? img.tags.map((t: any) => (t === 'tag:aca-ne' ? 'tag:acane' : t)) : [],
        usage: img.MVMedia?.usage || img.usage || 'gallery',
        order_index: img.MVMedia?.order_index ?? img.order_index ?? 0
      }));
    }

    // format direct video and cover urls
    if (mv.video_url) mv.video_url = formatMediaUrl(mv.video_url);
    if (mv.cover_url) mv.cover_url = formatMediaUrl(mv.cover_url);
    if (mv.twitter_cover_url) mv.twitter_cover_url = formatMediaUrl(mv.twitter_cover_url);
    if (mv.twitter_video_url) mv.twitter_video_url = formatMediaUrl(mv.twitter_video_url);
    if (mv.youtube_cover_url) mv.youtube_cover_url = formatMediaUrl(mv.youtube_cover_url);

    return mv as MVItem;
  });
}

export async function saveMVsToDB(mvs: MVItem[], transaction?: any): Promise<void> {
  const t = transaction || await sequelize.transaction();
  
  try {
    // 為了效能與簡化邏輯，這部分採用類似 migration 的 upsert 機制
    // 先找出或建立所有的 metadata (Artists, Albums, Keywords)
    const artistCache = new Map();
    const albumCache = new Map();
    const keywordCache = new Map();

    const getOrCreateArtist = async (name: string) => {
      const cleanName = String(name).trim();
      if (!cleanName) return null;
      if (!artistCache.has(cleanName)) {
        const [artist] = await ArtistModel.findOrCreate({ where: { name: cleanName }, transaction: t });
        artistCache.set(cleanName, artist.get('id'));
      }
      return artistCache.get(cleanName);
    };

    const getOrCreateAlbum = async (name: string) => {
      const cleanName = String(name).trim();
      if (!cleanName) return null;
      if (!albumCache.has(cleanName)) {
        const [album] = await AlbumModel.findOrCreate({ where: { name: cleanName }, transaction: t });
        albumCache.set(cleanName, album.get('id'));
      }
      return albumCache.get(cleanName);
    };

    const getOrCreateKeyword = async (name: string) => {
      const cleanName = String(name).trim();
      if (!cleanName) return null;
      if (!keywordCache.has(cleanName)) {
        const [keyword] = await KeywordModel.findOrCreate({ where: { name: cleanName }, transaction: t });
        keywordCache.set(cleanName, keyword.get('id'));
      }
      return keywordCache.get(cleanName);
    };

    for (const mv of mvs) {
      // 1. Upsert MV base info
      await MVModel.upsert({
        id: mv.id,
        title: mv.title,
        year: mv.year,
        date: mv.date || null,
        youtube: mv.youtube || '',
        bilibili: mv.bilibili || '',
        description: mv.description || '',
      }, { transaction: t });

      // 2. 清除舊關聯
      await MVArtistModel.destroy({ where: { mv_id: mv.id }, transaction: t });
      await MVAlbumModel.destroy({ where: { mv_id: mv.id }, transaction: t });
      await MVKeywordModel.destroy({ where: { mv_id: mv.id }, transaction: t });
      await MVMediaModel.destroy({ where: { mv_id: mv.id }, transaction: t });

      // 3. Rebuild Artists
      const creators = Array.isArray(mv.creators) ? mv.creators : [];
      for (const artist of creators) {
        const artistId = await getOrCreateArtist(artist.name);
        if (artistId) {
          await MVArtistModel.create({ mv_id: mv.id, artist_id: artistId, role: artist.role || 'unknown' }, { transaction: t });
        }
      }

      // 4. Rebuild Albums
      const albums = Array.isArray(mv.albums) ? mv.albums : [];
      for (const album of albums) {
        const albumId = await getOrCreateAlbum(album.name);
        if (albumId) {
          await MVAlbumModel.create({ mv_id: mv.id, album_id: albumId, track_number: 0 }, { transaction: t });
        }
      }

      // 5. Rebuild Keywords
      const keywords = Array.isArray(mv.keywords) ? mv.keywords : [];
      for (const keyword of keywords) {
        const keywordName = typeof keyword === 'object' ? (keyword.name || keyword.text) : keyword;
        if (!keywordName) continue;
        const keywordId = await getOrCreateKeyword(keywordName);
        if (keywordId) {
          await MVKeywordModel.create({ mv_id: mv.id, keyword_id: keywordId }, { transaction: t });
        }
      }

      // 6. Rebuild Images (Both Cover and Gallery)
      if (Array.isArray(mv.images)) {
        for (let i = 0; i < mv.images.length; i++) {
          const img = mv.images[i];
          const url = img.url;
          if (!url) continue;

          const originalUrl = img.original_url || url;
          const usage = img.MVMedia?.usage || img.usage || 'gallery';
          const desiredTags = Array.isArray((img as any).tags)
            ? Array.from(new Set((img as any).tags.map((t: any) => (t === 'tag:aca-ne' ? 'tag:acane' : t))))
            : undefined;

          let [image] = await MediaModel.findOrCreate({
            where: { original_url: originalUrl },
            defaults: {
              id: img.id || generateShortId(),
              type: img.type || 'official',
              media_type: 'image', // 預設為圖片，後續可擴充
              url: url,
              thumbnail_url: img.thumbnail_url || null,
              caption: img.caption || null,
              width: img.width || null,
              height: img.height || null,
              tags: desiredTags || [],
            },
            transaction: t
          });

          const imageId = image.get('id');
          if (desiredTags) {
            const currentTags = image.get('tags') as any;
            const nextTagsJson = JSON.stringify(desiredTags);
            const currentTagsJson = JSON.stringify(Array.isArray(currentTags) ? currentTags : []);
            if (nextTagsJson !== currentTagsJson) {
              await image.update({ tags: desiredTags }, { transaction: t });
            }
          }

          if (img.group) {
            let groupId = img.group.id;
            
            // Try to find by source_url if we don't have a specific ID but have a URL
            if (!groupId && img.group.source_url) {
              const existingGroup = await MediaGroupModel.findOne({
                where: { source_url: img.group.source_url },
                transaction: t
              });
              if (existingGroup) {
                groupId = existingGroup.get('id') as string;
              }
            }

            const [group] = await MediaGroupModel.upsert({
              id: groupId || generateShortId(),
              title: img.group.title || null,
              source_url: img.group.source_url || null,
              source_text: img.group.source_text || null,
              author_name: img.group.author_name || null,
              author_handle: img.group.author_handle || null,
              post_date: img.group.post_date ? new Date(img.group.post_date) : null,
              status: img.group.status || 'organized'
            }, { transaction: t });

            await image.update({ group_id: group.get('id') }, { transaction: t });
          }

          await MVMediaModel.create({ 
            mv_id: mv.id, 
            media_id: imageId, 
            usage: usage, 
            order_index: img.MVMedia?.order_index ?? img.order_index ?? i
          }, { transaction: t });
        }
      }
    }

    if (!transaction) await t.commit();
  } catch (error) {
    if (!transaction) await t.rollback();
    throw error;
  }
}
