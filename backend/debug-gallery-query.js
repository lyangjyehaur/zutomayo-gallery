import 'dotenv/config';
import { Sequelize, Op, QueryTypes } from 'sequelize';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'zutomayo_gallery';
const DB_USER = process.env.DB_USER || 'zutomayo_gallery';
const DB_PASS = process.env.DB_PASS || '';
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
});
async function main() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');
        // Test 1: Reproduce the two-step query (Step 1 - ID pagination)
        console.log('\n=== Test 1: Step 1 - ID pagination with subQuery:false + sort_key ===');
        const seed = 'vrohz008';
        const limit = 48;
        const offset = 0;
        const sql1 = `
      SELECT DISTINCT "Media"."id", "Media"."group_id",
        md5('${seed}' || "Media"."group_id"::text) AS "sort_key"
      FROM "media" AS "Media"
      INNER JOIN "media_groups" AS "group" ON "Media"."group_id" = "group"."id"
        AND "group"."status" = 'organized'
      WHERE "Media"."type" = 'fanart'
        AND NOT (
          "Media"."url" ILIKE '%ytimg.com%' OR "Media"."url" ILIKE '%youtube.com%' OR "Media"."url" ILIKE '%youtu.be%'
          OR "Media"."original_url" ILIKE '%ytimg.com%' OR "Media"."original_url" ILIKE '%youtube.com%' OR "Media"."original_url" ILIKE '%youtu.be%'
        )
      ORDER BY "sort_key" ASC, "Media"."group_id" ASC, "Media"."id" ASC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;
        try {
            const [idRows] = await sequelize.query(sql1, { type: QueryTypes.SELECT });
            console.log(`✅ Step 1 OK: got ${idRows.length} rows`);
            if (idRows.length > 0) {
                console.log('First row sample:', JSON.stringify(idRows[0]));
            }
        }
        catch (e) {
            console.error('❌ Step 1 FAILED:', e.message);
        }
        // Test 2: What Sequelize actually generates for the two-step query
        console.log('\n=== Test 2: Sequelize-generated query (Step 1) ===');
        try {
            const { MediaModel, MediaGroupModel } = await import('../src/models/index.js');
            const idFindOptions = {
                where: {
                    type: 'fanart',
                    [Op.not]: {
                        [Op.or]: [
                            { url: { [Op.iLike]: '%ytimg.com%' } },
                            { url: { [Op.iLike]: '%youtube.com%' } },
                            { url: { [Op.iLike]: '%youtu.be%' } },
                            { original_url: { [Op.iLike]: '%ytimg.com%' } },
                            { original_url: { [Op.iLike]: '%youtube.com%' } },
                            { original_url: { [Op.iLike]: '%youtu.be%' } },
                        ],
                    },
                },
                distinct: true,
                include: [
                    { model: MediaGroupModel, as: 'group', where: { status: 'organized' }, required: true }
                ],
                order: [
                    Sequelize.literal('sort_key ASC'),
                    ['group_id', 'ASC'],
                    ['id', 'ASC']
                ],
                subQuery: false,
                limit: limit + 1,
                offset,
                attributes: {
                    include: [
                        [Sequelize.literal(`md5('${seed}' || "Media"."group_id"::text)`), 'sort_key']
                    ]
                },
                logging: (sql) => {
                    console.log('Generated SQL:', sql.substring(0, 2000));
                }
            };
            const rows = await MediaModel.findAll(idFindOptions);
            console.log(`✅ Sequelize Step 1 OK: got ${rows.length} rows`);
        }
        catch (e) {
            console.error('❌ Sequelize Step 1 FAILED:', e.message);
            console.error('Full error:', e.original?.message || e);
        }
        // Test 3: Step 2 - fetch full data by IDs
        console.log('\n=== Test 3: Step 2 - Fetch full data with MV include ===');
        try {
            const { MediaModel, MediaGroupModel, MVModel } = await import('../src/models/index.js');
            // First get some IDs
            const idRows = await MediaModel.findAll({
                where: { type: 'fanart' },
                attributes: ['id'],
                limit: 5,
                include: [
                    { model: MediaGroupModel, as: 'group', where: { status: 'organized' }, required: true }
                ],
                distinct: true,
                logging: false,
            });
            const ids = idRows.map(r => r.get('id'));
            console.log('Sample IDs:', ids);
            const dataRows = await MediaModel.findAll({
                where: { id: { [Op.in]: ids } },
                include: [
                    { model: MediaGroupModel, as: 'group', required: true },
                    { model: MVModel, as: 'mvs', through: { attributes: [] }, attributes: ['id', 'title'], required: false, separate: true }
                ],
                logging: (sql) => {
                    console.log('Step 2 SQL:', sql.substring(0, 1000));
                }
            });
            console.log(`✅ Step 2 OK: got ${dataRows.length} rows with MV data`);
            if (dataRows.length > 0) {
                const sample = dataRows[0].toJSON();
                console.log('Sample mvs:', JSON.stringify(sample.mvs));
            }
        }
        catch (e) {
            console.error('❌ Step 2 FAILED:', e.message);
            if (e.original)
                console.error('SQL Error:', e.original.message);
        }
    }
    catch (e) {
        console.error('Connection failed:', e.message);
    }
    finally {
        await sequelize.close();
    }
}
main();
