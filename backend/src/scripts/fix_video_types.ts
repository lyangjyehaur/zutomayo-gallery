import 'dotenv/config';
import { MediaModel } from '../models/index.js';
import { Op } from 'sequelize';
import { getTwitterVideoHosts, toSqlHostPatterns } from '../utils/media-source.js';

async function fixVideoTypes() {
  console.log('Fixing media_type for videos in V2 DB...');
  
  try {
    const updated = await MediaModel.update(
      { media_type: 'video' },
      { 
        where: { 
          media_type: 'image',
          [Op.or]: [
            { url: { [Op.like]: '%.mp4%' } },
            { original_url: { [Op.like]: '%.mp4%' } },
            ...toSqlHostPatterns(getTwitterVideoHosts()).flatMap((pattern) => [
              { url: { [Op.like]: pattern } },
              { original_url: { [Op.like]: pattern } },
            ]),
          ]
        } 
      }
    );
    console.log(`Updated ${updated[0]} records from image to video.`);
  } catch (e) {
    console.error('Error:', e);
  }

  process.exit(0);
}
fixVideoTypes();
