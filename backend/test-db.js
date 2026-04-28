import 'dotenv/config';
import { sequelize as pgSequelize } from './src/services/pg.service.js';
import { sequelize as modelSequelize } from './src/models/index.js';
async function test() {
    console.log("pg.service.ts sequelize config:");
    console.log({
        host: pgSequelize.config.host,
        port: pgSequelize.config.port,
        database: pgSequelize.config.database,
        username: pgSequelize.config.username,
    });
    console.log("\nmodels/index.ts sequelize config:");
    console.log({
        host: modelSequelize.config.host,
        port: modelSequelize.config.port,
        database: modelSequelize.config.database,
        username: modelSequelize.config.username,
    });
    try {
        await pgSequelize.authenticate();
        console.log("\npgSequelize authenticated successfully.");
    }
    catch (err) {
        console.error("\npgSequelize authentication failed:", err);
    }
    try {
        await modelSequelize.authenticate();
        console.log("modelSequelize authenticated successfully.");
    }
    catch (err) {
        console.error("modelSequelize authentication failed:", err);
    }
    // Test if we can create a dummy table with modelSequelize
    try {
        const { DataTypes } = await import('sequelize');
        const Dummy = modelSequelize.define('DummyTest', {
            id: { type: DataTypes.INTEGER, primaryKey: true }
        });
        await Dummy.sync({ force: true });
        console.log("Successfully created DummyTest table with modelSequelize.");
        await Dummy.drop();
        console.log("Successfully dropped DummyTest table.");
    }
    catch (err) {
        console.error("Failed to create/drop table with modelSequelize:", err);
    }
    process.exit(0);
}
test();
