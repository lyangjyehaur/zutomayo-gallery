import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });

const MV = sequelize.define('MV', {
  id: { type: DataTypes.STRING, primaryKey: true },
  images: { type: DataTypes.JSONB }
}, { tableName: 'mvs', timestamps: false });

const Fanart = sequelize.define('Fanart', {
  id: { type: DataTypes.STRING, primaryKey: true },
  media: { type: DataTypes.JSONB },
  tweetUrl: { type: DataTypes.STRING }
}, { tableName: 'fanarts', timestamps: false });

async function run() {
  const mv = await MV.findOne();
  console.log('Sample MV images:', JSON.stringify(mv?.toJSON().images, null, 2));
  
  const fa = await Fanart.findOne();
  console.log('Sample Fanart media:', JSON.stringify(fa?.toJSON().media, null, 2));
  process.exit(0);
}
run();