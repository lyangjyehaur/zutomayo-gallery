/**
 * 用現有的 TwitterService.extractMediaFromTweet 重新解析缺失 thumbnail 的 video 記錄
 * 
 * 用法: cd backend && node --import tsx src/scripts/backfill-thumbnails.ts
 */

import { TwitterService } from '../services/twitter.service.js';
import { StagingFanartModel, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

async function main() {
  console.log('🔍 查找缺少 thumbnail 的 video/gif 記錄...');

  const records = await StagingFanartModel.findAll({
    where: {
      media_type: { [Op.in]: ['video', 'gif'] },
      thumbnail_url: null,
    },
    attributes: ['id', 'original_url', 'tweet_id', 'media_url', 'status'],
    order: [['status', 'ASC']],
  });

  console.log(`找到 ${records.length} 筆缺少 thumbnail 的記錄\n`);

  if (records.length === 0) {
    console.log('✅ 沒有需要補充的記錄');
    await sequelize.close();
    return;
  }

  let success = 0;
  let failed = 0;

  for (const record of records) {
    const id = record.get('id') as string;
    const originalUrl = record.get('original_url') as string;
    const mediaUrl = record.get('media_url') as string;
    const status = record.get('status') as string;

    console.log(`處理 ${id} (${status})`);

    if (!originalUrl) {
      console.log('  ⏭️ 無 original_url，跳過');
      failed++;
      continue;
    }

    try {
      const mediaList = await TwitterService.extractMediaFromTweet(originalUrl);

      // 找到匹配的 media 項目
      const matched = mediaList.find(m => m.url === mediaUrl) || mediaList[0];

      if (matched?.thumbnail) {
        await StagingFanartModel.update(
          {
            thumbnail_url: matched.thumbnail,
            original_thumbnail_url: matched.thumbnail,
          },
          { where: { id } }
        );
        console.log(`  ✅ 已更新 thumbnail: ${matched.thumbnail.substring(0, 80)}...`);
        success++;
      } else {
        console.log('  ❌ 解析結果無 thumbnail');
        failed++;
      }
    } catch (err: any) {
      console.log(`  ❌ 解析失敗: ${err.message}`);
      failed++;
    }

    // 避免 rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 結果:`);
  console.log(`  成功: ${success}`);
  console.log(`  失敗: ${failed}`);

  await sequelize.close();
}

main().catch(console.error);
