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
export async function getV2MVsAsLegacyJSON(): Promise<MVItem[]> {
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

  return mvs.map(mvRecord => {
    const mv: any = mvRecord.toJSON();
    
    // 轉換畫師
    const artists = mv.creators?.map((a: any) => a.name) || [];
    
    // 轉換專輯
    const albums = mv.albums?.map((a: any) => a.name) || [];
    
    // 轉換關鍵字
    const keywords = mv.keywords?.map((k: any) => k.name) || [];

    // 轉換圖片 (區分 cover 和 gallery)
    const coverImages: string[] = [];
    const galleryImages: any[] = [];

    if (mv.images) {
      for (const img of mv.images) {
        const usage = img.MVImage?.usage;
        if (usage === 'cover') {
          coverImages.push(img.url);
        } else {
          // 組合回舊版的 MVImage
          const mappedImg: any = {
            url: img.url,
            original_url: img.original_url,
            thumbnail: img.thumbnail_url,
            caption: img.caption,
            type: img.type,
            width: img.width,
            height: img.height,
          };
          
          if (img.fanart_meta) {
            mappedImg.tweetUrl = img.fanart_meta.tweet_url;
            mappedImg.tweetText = img.fanart_meta.tweet_text;
            mappedImg.tweetAuthor = img.fanart_meta.tweet_author;
            mappedImg.tweetHandle = img.fanart_meta.tweet_handle;
            mappedImg.tweetDate = img.fanart_meta.tweet_date;
          }
          
          galleryImages.push(mappedImg);
        }
      }
    }

    return {
      id: mv.id,
      title: mv.title,
      year: mv.year,
      date: mv.date,
      youtube: mv.youtube,
      bilibili: mv.bilibili,
      description: mv.description,
      artist: artists,
      album: albums,
      keywords: keywords,
      coverImages: coverImages,
      images: galleryImages,
    } as MVItem;
  });
}

/**
 * 將前端傳來的 V1 JSONB 結構，拆解並儲存到 V2 關聯式資料庫
 */
export async function saveLegacyJSONToV2(mvs: MVItem[], transaction?: any): Promise<void> {
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
      const artists = Array.isArray(mv.artist) ? mv.artist : (mv.artist ? String(mv.artist).split(',') : []);
      for (const artistName of artists) {
        const artistId = await getOrCreateArtist(artistName);
        if (artistId) {
          await MVArtistModel.create({ mv_id: mv.id, artist_id: artistId, role: 'unknown' }, { transaction: t });
        }
      }

      // 4. Rebuild Albums
      const albums = Array.isArray(mv.album) ? mv.album : (mv.album ? String(mv.album).split(',') : []);
      for (const albumName of albums) {
        const albumId = await getOrCreateAlbum(albumName);
        if (albumId) {
          await MVAlbumModel.create({ mv_id: mv.id, album_id: albumId, track_number: 0 }, { transaction: t });
        }
      }

      // 5. Rebuild Keywords
      const keywords = Array.isArray(mv.keywords) ? mv.keywords : (mv.keywords ? String(mv.keywords).split(',') : []);
      for (const keyword of keywords) {
        const keywordName = typeof keyword === 'string' ? keyword : keyword.text;
        const keywordId = await getOrCreateKeyword(keywordName);
        if (keywordId) {
          await MVKeywordModel.create({ mv_id: mv.id, keyword_id: keywordId }, { transaction: t });
        }
      }

      // 6. Rebuild Cover Images
      if (Array.isArray(mv.coverImages)) {
        for (let i = 0; i < mv.coverImages.length; i++) {
          const url = mv.coverImages[i];
          if (!url) continue;
          
          let [image] = await ImageModel.findOrCreate({
            where: { original_url: url },
            defaults: { id: uuidv4(), type: 'cover', url: url },
            transaction: t
          });
          
          await MVImageModel.create({ mv_id: mv.id, image_id: image.get('id'), usage: 'cover', order_index: i }, { transaction: t });
        }
      }

      // 7. Rebuild Gallery Images
      if (Array.isArray(mv.images)) {
        for (let i = 0; i < mv.images.length; i++) {
          const img = mv.images[i];
          const url = typeof img === 'string' ? img : img.url;
          if (!url) continue;

          const isFanart = typeof img !== 'string' && img.type === 'fanart';
          const imgType = isFanart ? 'fanart' : 'official';
          const originalUrl = typeof img === 'string' ? url : (img.original_url || url);

          let [image] = await ImageModel.findOrCreate({
            where: { original_url: originalUrl },
            defaults: {
              id: uuidv4(),
              type: imgType,
              url: url,
              thumbnail_url: typeof img === 'string' ? null : img.thumbnail,
              caption: typeof img === 'string' ? null : img.caption,
            },
            transaction: t
          });

          const imageId = image.get('id');

          if (isFanart) {
            await FanartMetadataModel.upsert({
              image_id: imageId,
              tweet_url: img.tweetUrl,
              tweet_text: img.tweetText,
              tweet_author: img.tweetAuthor,
              tweet_handle: img.tweetHandle,
              tweet_date: img.tweetDate ? new Date(img.tweetDate) : new Date(),
              status: 'organized'
            }, { transaction: t });
          }

          await MVImageModel.create({ mv_id: mv.id, image_id: imageId, usage: 'gallery', order_index: i }, { transaction: t });
        }
      }
    }

    if (!transaction) await t.commit();
  } catch (error) {
    if (!transaction) await t.rollback();
    throw error;
  }
}
