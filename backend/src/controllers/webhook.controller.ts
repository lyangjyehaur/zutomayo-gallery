import { Request, Response } from 'express';

export const handleWalineWebhook = async (req: Request, res: Response) => {
  try {
    const { BARK_KEY } = process.env;
    if (!BARK_KEY) {
      console.warn('Waline Webhook received, but BARK_KEY is not configured');
      return res.status(200).json({ success: true, message: 'BARK_KEY not set' });
    }

    const payload = req.body;
    console.log('Received Waline webhook:', JSON.stringify(payload).substring(0, 500));

    // 解析 Waline 的 webhook 數據格式
    // Waline 的 webhook 結構通常是 { type: 'new_comment', data: { comment: { nick: '...', comment: '...', url: '...' } } }
    let commentData = payload?.data?.comment || payload?.data || payload;
    
    // 過濾掉可能的心跳測試或非評論事件
    if (payload.type && payload.type !== 'new_comment') {
       return res.status(200).json({ success: true, message: 'Ignored non-comment event' });
    }

    const nick = commentData.nick || '匿名';
    // 去除 HTML 標籤
    const rawComment = commentData.comment || '無內容';
    const comment = rawComment.replace(/<[^>]*>?/gm, ''); 
    const url = commentData.url || '';

    // 組合 Bark 推送內容
    const title = encodeURIComponent(`畫廊新留言: ${nick}`);
    const body = encodeURIComponent(`${comment}\n\n頁面: ${url}`);
    
    // 如果 BARK_KEY 包含完整的 URL (例如 https://api.day.app/xxx)，就直接使用
    // 如果只有 key，就拼上預設的 https://api.day.app
    let barkUrl = '';
    if (BARK_KEY.startsWith('http')) {
       barkUrl = `${BARK_KEY}/${title}/${body}`;
    } else {
       barkUrl = `https://api.day.app/${BARK_KEY}/${title}/${body}`;
    }

    // 加上圖示和分組參數
    barkUrl += '?group=Waline&icon=https://gallery.ztmr.club/favicon.ico';

    console.log(`Sending to Bark: ${barkUrl}`);
    const response = await fetch(barkUrl);
    
    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Bark notification sent' });
    } else {
      console.error('Bark API Error:', await response.text());
      return res.status(500).json({ success: false, error: 'Failed to send Bark notification' });
    }
  } catch (error) {
    console.error('Error handling Waline webhook:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
