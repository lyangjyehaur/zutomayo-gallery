import 'dotenv/config';
import { syncModels } from './src/models/index.js';
async function syncDb() {
    try {
        console.log('Syncing database schema...');
        await syncModels();
        console.log('Database synced successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to sync database:', error);
        process.exit(1);
    }
}
syncDb();
