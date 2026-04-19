export interface TwitterMedia {
  url: string;        // 真實的直連網址 (圖片或 mp4)
  type: string;       // 'image', 'video', 'gif'
  thumbnail?: string; // 如果是影片，這裡會有預覽圖網址
}

export const TwitterService = {
  /**
   * 解析推文網址，獲取真實媒體資源 (圖片、最高畫質 MP4)
   * 使用開源免費的 vxtwitter API，免登入免 Cookie
   * @param tweetUrl 原始推文網址 (例如: https://x.com/zutomayo/status/123456789)
   */
  async extractMediaFromTweet(tweetUrl: string): Promise<TwitterMedia[]> {
    try {
      // 1. 從網址中提取推文 ID
      const match = tweetUrl.match(/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/);
      if (!match || !match[1]) {
        throw new Error('無效的推文網址格式');
      }
      
      const tweetId = match[1];

      // 2. 呼叫 vxtwitter 的免費開源 API
      const apiUrl = `https://api.vxtwitter.com/Twitter/status/${tweetId}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`無法獲取推文資料: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 3. 整理並返回媒體資料
      const mediaList: TwitterMedia[] = [];
      
      if (data.media_extended && data.media_extended.length > 0) {
        data.media_extended.forEach((media: any) => {
          mediaList.push({
            url: media.url, 
            type: media.type, // 'image', 'video', 'gif'
            thumbnail: media.thumbnail_url || undefined
          });
        });
      }

      return mediaList;

    } catch (error) {
      console.error('推文解析失敗:', error);
      throw error;
    }
  }
};
