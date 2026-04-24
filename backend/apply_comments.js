import 'dotenv/config';
import { syncModels } from './src/models/index.js';
async function syncComments() {
    try {
        console.log('Syncing V2 model comments to database...');
        await syncModels();
        console.log('V2 models synced successfully.');
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to sync comments:', error);
        process.exit(1);
    }
}
syncComments();
