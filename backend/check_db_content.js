import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize('zutomayo_gallery', 'zutomayo_gallery', 'FBZNYC3HSJExdHX3', { host: '45.147.26.57', port: 5432, dialect: 'postgres', logging: false });

const MV = sequelize.define('MV', {
  id: { type: DataTypes.STRING, primaryKey: true },
  images: { type: DataTypes.JSONB }
}, { tableName: 'mvs', timestamps: false });

const Fanart = sequelize.define('Fanart', {
  id: { type: DataTypes.STRING, primaryKey: true },
  media: { type: DataTypes.JSONB }
}, { tableName: 'fanarts', timestamps: false });

async function run() {
  const mv = await MV.findOne({ where: { id: 'kansaete-kuyashiiwa' } }) || await MV.findOne();
  console.log('Sample MV:', mv?.id);
  console.log('Sample MV images:', JSON.stringify(mv?.toJSON().images, null, 2));
  
  const fa = await Fanart.findOne({ where: { status: 'organized' } });
  console.log('Sample Fanart id:', fa?.id);
  console.log('Sample Fanart media:', JSON.stringify(fa?.toJSON().media, null, 2));
  process.exit(0);
}
run();
