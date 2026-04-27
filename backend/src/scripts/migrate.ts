import 'dotenv/config';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../services/pg.service.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const umzug = new Umzug({
  migrations: {
    glob: ['../migrations/*.ts', { cwd: __dirname }],
    resolve: ({ name, path: migrationPath, context }) => {
      // Import the migration dynamically
      return {
        name,
        up: async () => {
          if (!migrationPath) throw new Error('Migration path is missing');
          const migration = await import(migrationPath);
          return migration.up({ context });
        },
        down: async () => {
          if (!migrationPath) throw new Error('Migration path is missing');
          const migration = await import(migrationPath);
          return migration.down({ context });
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export const migrator = umzug;

async function run() {
  const cmd = process.argv[2];

  try {
    if (cmd === 'up') {
      await migrator.up();
      console.log('All migrations performed successfully');
    } else if (cmd === 'down') {
      await migrator.down();
      console.log('Migration reverted successfully');
    } else {
      console.log('Please specify "up" or "down"');
    }
  } catch (error) {
    console.error('Migration failed', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Check if this script is run directly
if (process.argv[1] && (process.argv[1].includes('migrate.ts') || process.argv[1].includes('migrate.js'))) {
  run();
}

