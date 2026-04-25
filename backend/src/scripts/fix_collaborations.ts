import 'dotenv/config';
import { sequelize, MediaModel, ArtistMediaModel } from '../models/index.js';

async function fix() {
  console.log('Fixing collaborations...');
  
  // Find all media that are linked in ArtistMediaModel
  const links = await ArtistMediaModel.findAll();
  const mediaIds = links.map(link => link.get('media_id'));
  
  if (mediaIds.length > 0) {
    // Update all those media to have type = 'collaboration'
    await MediaModel.update(
      { type: 'collaboration' },
      { where: { id: mediaIds } }
    );
    console.log(`Updated ${mediaIds.length} media items to type 'collaboration'`);
  } else {
    console.log('No artist media links found.');
  }

  process.exit(0);
}
fix();
