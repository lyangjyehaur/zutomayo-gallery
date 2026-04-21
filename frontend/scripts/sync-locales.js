import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as OpenCC from 'opencc-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const SOURCE_LOCALE = 'zh-TW.json';

async function syncLocales() {
  console.log('🔄 正在同步多語言文件...');

  // 1. 讀取源文件 (繁體中文-台灣)
  const sourcePath = path.join(LOCALES_DIR, SOURCE_LOCALE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 找不到源文件: ${sourcePath}`);
    // 如果沒有，創建一個默認的
    fs.writeFileSync(sourcePath, JSON.stringify({
      "common": {
        "loading": "載入中...",
        "error": "發生錯誤",
        "save": "儲存",
        "cancel": "取消",
        "confirm": "確認"
      }
    }, null, 2));
    console.log(`✨ 已自動創建默認源文件: ${sourcePath}`);
  }

  const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

  // 2. 初始化 OpenCC 轉換器
  // tw2cn: 台灣正體 -> 簡體 (含用詞轉換，如「網路」->「網絡」)
  // twp2cn 是更精確的「台灣繁體到大陸簡體並包含習慣用語」的轉換模型
  const tw2cn = await OpenCC.Converter({ from: 'twp', to: 'cn' });
  // tw2hk: 台灣正體 -> 香港繁體
  const tw2hk = await OpenCC.Converter({ from: 'tw', to: 'hk' });

  // 遞歸轉換對象中的所有字符串
  function convertObject(obj, converter, existingObj = undefined) {
    if (typeof obj === 'string') {
      // 避免轉換包含日文假名或日文疊字符號的句子
      if (obj.match(/[\u3040-\u309F\u30A0-\u30FF\u3005]/)) {
        return obj;
      }
      return converter(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        convertObject(item, converter, existingObj && Array.isArray(existingObj) ? existingObj[index] : undefined)
      );
    }
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      for (const key in obj) {
        // 如果在目標文件中已經存在這個 key 的人工翻譯（且與原本 sourceData 經過 converter 轉換後的值不同），
        // 這裡可以選擇保留人工修改的值。但為了簡單起見，如果現有文件中已經有這個值，且不是空字符串，我們就直接保留現有值。
        // 注意：這意味著如果你修改了 zh-TW，但 zh-CN 已經有值，zh-CN 將不會更新。
        // 為了讓腳本更智能，我們可以比較「機器翻譯的舊值」和「當前值」，但這需要保存狀態。
        // 最簡單的做法是：維護一個 `overrides` 字典，或者只合併新增的 key。
        
        // 這裡我們採用增量合併的策略：如果目標文件已經有這個 key 的值，我們保留目標文件中的值。
        // 這樣人工修改的翻譯就不會被覆蓋。
        if (existingObj && existingObj[key] !== undefined) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                result[key] = convertObject(obj[key], converter, existingObj[key]);
            } else {
                // 保留現有的人工翻譯
                result[key] = existingObj[key];
            }
        } else {
            // 如果目標文件中沒有這個 key，則進行轉換
            result[key] = convertObject(obj[key], converter);
        }
      }
      return result;
    }
    return obj;
  }

  // 3. 生成簡體中文 (zh-CN)
  const cnPath = path.join(LOCALES_DIR, 'zh-CN.json');
  let existingCnData = {};
  if (fs.existsSync(cnPath)) {
    try { existingCnData = JSON.parse(fs.readFileSync(cnPath, 'utf-8')); } catch (e) {}
  }
  const cnData = convertObject(sourceData, tw2cn, existingCnData);
  fs.writeFileSync(
    cnPath,
    JSON.stringify(cnData, null, 2)
  );
  console.log('✅ 成功生成 zh-CN.json (簡體中文，保留人工修改)');

  // 4. 生成香港繁體 (zh-HK)
  const hkPath = path.join(LOCALES_DIR, 'zh-HK.json');
  let existingHkData = {};
  if (fs.existsSync(hkPath)) {
    try { existingHkData = JSON.parse(fs.readFileSync(hkPath, 'utf-8')); } catch (e) {}
  }
  const hkData = convertObject(sourceData, tw2hk, existingHkData);
  fs.writeFileSync(
    hkPath,
    JSON.stringify(hkData, null, 2)
  );
  console.log('✅ 成功生成 zh-HK.json (香港繁體，保留人工修改)');

  // 5. 確保日文和韓文文件存在 (預留給後續人工翻譯)
  const otherLocales = ['ja', 'ko'];
  otherLocales.forEach(locale => {
    const localePath = path.join(LOCALES_DIR, `${locale}.json`);
    if (!fs.existsSync(localePath)) {
      fs.writeFileSync(localePath, JSON.stringify({}, null, 2));
      console.log(`✨ 已創建預留語言文件: ${locale}.json`);
    }
  });

  console.log('🎉 多語言同步完成！');
}

syncLocales().catch(console.error);
