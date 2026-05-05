import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { sequelize as newDb, MVModel, KeywordModel, MVKeywordModel } from '../models/index.js';
import { nanoid } from 'nanoid';
const generateShortId = () => nanoid(16);

const OLD_DB_NAME = process.env.OLD_DB_NAME || process.env.DB_NAME || 'zutomayo_gallery';
const OLD_DB_USER = process.env.OLD_DB_USER || process.env.DB_USER || 'zutomayo_gallery';
const OLD_DB_PASS = process.env.OLD_DB_PASS || process.env.DB_PASS || '';
const OLD_DB_HOST = process.env.OLD_DB_HOST || process.env.DB_HOST || '127.0.0.1';
const OLD_DB_PORT = parseInt(process.env.OLD_DB_PORT || process.env.DB_PORT || '5432', 10);

if (!OLD_DB_PASS) {
  throw new Error('Missing OLD_DB_PASS (or DB_PASS) for fix_keywords script');
}

const oldDb = new Sequelize(OLD_DB_NAME, OLD_DB_USER, OLD_DB_PASS, {
  host: OLD_DB_HOST,
  port: OLD_DB_PORT,
  dialect: 'postgres',
  logging: false,
});

async function fix() {
  console.log('Fixing keywords from V1 DB...');
  const [mvs] = await oldDb.query('SELECT id, keywords FROM mvs');
  
  const keywordMap = new Map();
  
  const getOrCreateKeyword = async (keywordObj: any) => {
    if (!keywordObj) return null;
    let name = '';
    let lang = 'zh-Hant';
    
    if (typeof keywordObj === 'string') {
      name = keywordObj.trim();
    } else {
      name = String(keywordObj.text || keywordObj.name || '').trim();
      lang = keywordObj.lang || 'zh-Hant';
    }
    
    if (!name) return null;

    const cacheKey = `${name}_${lang}`;
    if (!keywordMap.has(cacheKey)) {
      const [keyword] = await KeywordModel.findOrCreate({ 
        where: { name, lang },
        defaults: { name, lang }
      });
      keywordMap.set(cacheKey, keyword.get('id'));
    }
    return keywordMap.get(cacheKey);
  };

  // First delete all wrong keywords
  await KeywordModel.destroy({ where: { name: '[object Object]' } });

  for (const mv of mvs as any[]) {
    if (!mv.keywords) continue;
    const keywords = Array.isArray(mv.keywords) ? mv.keywords : (typeof mv.keywords === 'string' && mv.keywords.startsWith('[') ? JSON.parse(mv.keywords) : [mv.keywords]);
    for (const kw of keywords) {
      const keywordId = await getOrCreateKeyword(kw);
      if (keywordId) {
        await MVKeywordModel.findOrCreate({ where: { mv_id: mv.id, keyword_id: keywordId } });
      }
    }
  }

  console.log('Keywords fixed!');
  process.exit(0);
}
fix();
