import * as fs from 'fs';
const filePath = '/Users/lyangjyehaur/Projects/zutomayo-gallery/backend/crawler/dataset_twitter-x-data-tweet-scraper-pay-per-result-cheapest_2026-04-27_21-02-12-822.json';
try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const tweets = JSON.parse(fileContent);
    if (!Array.isArray(tweets)) {
        console.error('JSON 內容不是一個陣列');
        process.exit(1);
    }
    const uniqueIds = new Set();
    tweets.forEach((tweet) => {
        // 嘗試抓取 id 或 id_str
        const id = tweet.id || tweet.id_str;
        if (id) {
            uniqueIds.add(String(id));
        }
    });
    console.log(`檔案中的總資料筆數: ${tweets.length}`);
    console.log(`不重複的推文 ID 數量 (Set Size): ${uniqueIds.size}`);
    console.log(`不重複的 ID 列表:\n`, Array.from(uniqueIds));
}
catch (error) {
    console.error('讀取或解析檔案時發生錯誤:', error);
}
