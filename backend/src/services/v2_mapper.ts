import {
  MVModel,
  ImageModel,
  ArtistModel,
  AlbumModel,
  KeywordModel,
  FanartMetadataModel,
  MVImageModel,
  MVArtistModel,
  MVAlbumModel,
  MVKeywordModel,
  sequelize
} from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { MVItem, MVImage } from '../types.js';

/**
 * 讀取 V2 關聯式資料庫，並轉換回前端期望的 V1 JSONB 結構
 */
export async function getMVsFromDB(): Promise<MVItem[]> {
  const mvs = await MVModel.findAll({
    include: [
      { model: ArtistModel, as: 'creators' },
      { model: AlbumModel, as: 'albums' },
      { model: KeywordModel, as: 'keywords' },
      { 
        model: ImageModel, 
        as: 'images',
        include: [{ model: FanartMetadataModel, as: 'fanart_meta' }]
      }
    ],
    order: [
      ['date', 'DESC'],
      [{ model: ImageModel, as: 'images' }, MVImageModel, 'order_index', 'ASC']
    ]
  });

  return mvs.map(mvRecord => mvRecord.toJSON() as MVItem);
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
      await MVImageModel.destroy({ where: { mv_id: mv.id }, transaction: t });

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
        const keywordId = await getOrCreateKeyword(keyword.name);
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

          const isFanart = img.type === 'fanart';
          const originalUrl = img.original_url || url;
          const usage = img.MVImage?.usage || 'gallery';

          let [image] = await ImageModel.findOrCreate({
            where: { original_url: originalUrl },
            defaults: {
              id: img.id || uuidv4(),
              type: img.type || 'official',
              url: url,
              thumbnail_url: img.thumbnail_url || null,
              caption: img.caption || null,
              width: img.width || null,
              height: img.height || null,
            },
            transaction: t
          });

          const imageId = image.get('id');

          if (isFanart && img.fanart_meta) {
            await FanartMetadataModel.upsert({
              image_id: imageId,
              tweet_url: img.fanart_meta.tweet_url,
              tweet_text: img.fanart_meta.tweet_text,
              tweet_author: img.fanart_meta.tweet_author,
              tweet_handle: img.fanart_meta.tweet_handle,
              tweet_date: img.fanart_meta.tweet_date ? new Date(img.fanart_meta.tweet_date) : new Date(),
              status: 'organized'
            }, { transaction: t });
          }

          await MVImageModel.create({ 
            mv_id: mv.id, 
            image_id: imageId, 
            usage: usage, 
            order_index: img.MVImage?.order_index ?? i 
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
