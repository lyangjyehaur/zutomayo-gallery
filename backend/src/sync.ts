import 'dotenv/config';
import { syncModels } from './models/index.js';

syncModels().then(() => {
  console.log('Database schema synchronized successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Failed to sync database:', err);
  process.exit(1);
});