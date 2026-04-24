import 'dotenv/config';
import { sequelize } from './src/models/index.js';
async function cleanupOldTables() {
    try {
        const oldTablesToDrop = ['fanarts'];
        for (const tableName of oldTablesToDrop) {
            console.log(`Dropping legacy table ${tableName}...`);
            await sequelize.query(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
        }
        console.log('Database cleanup completed!');
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to cleanup database:', error);
        process.exit(1);
    }
}
cleanupOldTables();
