import 'dotenv/config';
import { MediaModel } from '../models/index.js';
import { Op } from 'sequelize';

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
            { url: { [Op.like]: '%video.twimg.com%' } },
            { original_url: { [Op.like]: '%.mp4%' } },
            { original_url: { [Op.like]: '%video.twimg.com%' } }
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