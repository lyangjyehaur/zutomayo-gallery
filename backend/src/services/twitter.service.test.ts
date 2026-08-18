import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TwitterService,
  buildCanonicalTweetUrl,
} from './twitter.service.js';

const rssItem = {
  title: 'Artist Name (@artist_handle): ずとまよ fanart #ずとまよファンアート #ZTMY',
  link: 'https://x.com/zutomayo_art/status/1111111111111111111',
  pubDate: 'Fri, 22 May 2026 12:34:56 GMT',
  isoDate: '2026-05-22T12:34:56.000Z',
  creator: 'Artist Name (@artist_handle)',
  categories: ['ずとまよファンアート', 'ZTMY'],
  contentSnippet: 'fallback snippet',
  description: [
    'Artist Name (@artist_handle): ずとまよ fanart #ずとまよファンアート #ZTMY',
    '&amp;lt;img src=&amp;quot;https://pbs.twimg.com/media/img_a.jpg?format=jpg&amp;amp;name=small&amp;quot;&amp;gt;',
    '&amp;lt;img src=&amp;quot;https://pbs.twimg.com/media/img_b.png?format=png&amp;quot;&amp;gt;',
    '&amp;lt;video poster=&amp;quot;https://pbs.twimg.com/ext_tw_video_thumb/111/pu/img/thumb.jpg?format=jpg&amp;amp;name=small&amp;quot; src=&amp;quot;https://video.twimg.com/ext_tw_video/111/pu/vid/720x1280/video.mp4?tag=12&amp;quot;&amp;gt;&amp;lt;/video&amp;gt;',
  ].join(' '),
};

test('extractMediaFromRssItem parses double-escaped RSS media and metadata', async () => {
  const media = await TwitterService.extractMediaFromRssItem(rssItem, {
    fetch: async () => {
      throw new Error('x.com unavailable');
    },
  });

  assert.equal(media.length, 3);
  assert.deepEqual(
    media.map((item) => item.type),
    ['image', 'image', 'video'],
  );
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/img_a.jpg?format=jpg&name=orig');
  assert.equal(media[1].url, 'https://pbs.twimg.com/media/img_b.png?format=png&name=orig');
  assert.equal(media[2].url, 'https://video.twimg.com/ext_tw_video/111/pu/vid/720x1280/video.mp4?tag=12');
  assert.equal(media[2].thumbnail, 'https://pbs.twimg.com/ext_tw_video_thumb/111/pu/img/thumb.jpg?format=jpg&name=orig');
  assert.equal(media[0].tweet_id, '1111111111111111111');
  assert.equal(media[0].tweet_url, buildCanonicalTweetUrl('1111111111111111111'));
  assert.equal(media[0].requested_tweet_id, '1111111111111111111');
  assert.equal(media[0].user_name, 'Artist Name');
  assert.equal(media[0].user_screen_name, 'artist_handle');
  assert.equal(media[0].date, '2026-05-22T12:34:56.000Z');
  assert.deepEqual(media[0].hashtags, ['ずとまよファンアート', 'ZTMY']);
});

test('extractMediaFromTweet gracefully falls back to RSS item when x.com enrichment fails', async () => {
  const media = await TwitterService.extractMediaFromTweet(rssItem.link, rssItem, {
    fetch: async () => ({
      ok: false,
      statusText: 'Forbidden',
      text: async () => '',
    } as Response),
  });

  assert.equal(media.length, 3);
  assert.equal(media[0].tweet_id, '1111111111111111111');
  assert.equal(media[0].user_screen_name, 'artist_handle');
});

test('extractMediaFromTweet resolves URL-only media from x.com application JSON state', async () => {
  const tweetUrl = 'https://x.com/state_artist/status/4444444444444444444';
  const html = `
    <html><body>
      <script type="application/json">${JSON.stringify({
        data: {
          tweet: {
            __typename: 'Tweet',
            rest_id: '4444444444444444444',
            core: { user_results: { result: { legacy: { name: 'State Artist', screen_name: 'state_artist' } } } },
            legacy: {
              full_text: 'state text #StateTag',
              created_at: 'Fri May 22 08:09:10 +0000 2026',
              favorite_count: 7,
              retweet_count: 2,
              entities: { hashtags: [{ text: 'StateTag' }] },
              extended_entities: {
                media: [{
                  type: 'photo',
                  url: 'https://t.co/not-the-image',
                  media_url_https: 'https://pbs.twimg.com/media/state.jpg?format=jpg&name=small',
                }],
              },
            },
          },
        },
      })}</script>
    </body></html>`;

  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({
      ok: true,
      text: async () => html,
    } as Response),
  });

  assert.equal(media.length, 1);
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/state.jpg?format=jpg&name=orig');
  assert.equal(media[0].tweet_id, '4444444444444444444');
  assert.equal(media[0].tweet_url, buildCanonicalTweetUrl('4444444444444444444'));
  assert.equal(media[0].requested_tweet_id, '4444444444444444444');
  assert.equal(media[0].user_name, 'State Artist');
  assert.equal(media[0].user_screen_name, 'state_artist');
  assert.equal(media[0].text, 'state text #StateTag');
  assert.deepEqual(media[0].hashtags, ['StateTag']);
});

test('extractMediaFromTweet resolves URL-only media from x.com OpenGraph and Twitter card meta tags', async () => {
  const tweetUrl = 'https://x.com/meta_artist/status/5555555555555555555';
  const html = `
    <html><head>
      <meta property="og:title" content="Meta Artist on X: meta text #MetaTag">
      <meta name="twitter:description" content="meta text #MetaTag">
      <meta property="og:image" content="https://pbs.twimg.com/media/meta.jpg?format=jpg&amp;name=small">
      <meta name="twitter:image" content="https://pbs.twimg.com/media/meta.jpg?format=jpg&amp;name=medium">
      <meta property="og:video" content="https://video.twimg.com/ext_tw_video/555/pu/vid/720x1280/meta.mp4?tag=12">
      <meta name="twitter:player:stream" content="https://video.twimg.com/ext_tw_video/555/pu/vid/720x1280/meta.mp4?tag=12">
    </head></html>`;

  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({
      ok: true,
      text: async () => html,
    } as Response),
  });

  assert.equal(media.length, 2);
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/meta.jpg?format=jpg&name=orig');
  assert.equal(media[0].type, 'image');
  assert.equal(media[0].tweet_id, '5555555555555555555');
  assert.equal(media[0].tweet_url, buildCanonicalTweetUrl('5555555555555555555'));
  assert.equal(media[0].requested_tweet_id, '5555555555555555555');
  assert.equal(media[0].text, 'meta text #MetaTag');
  assert.deepEqual(media[0].hashtags, ['MetaTag']);
  assert.equal(media[1].url, 'https://video.twimg.com/ext_tw_video/555/pu/vid/720x1280/meta.mp4?tag=12');
  assert.equal(media[1].type, 'video');
  assert.equal(media[1].thumbnail, 'https://pbs.twimg.com/media/meta.jpg?format=jpg&name=orig');
});

test('extractMediaFromTweet returns empty URL-only media gracefully when x.com fetch fails', async () => {
  const media = await TwitterService.extractMediaFromTweet('https://x.com/no_fallback/status/6666666666666666666', undefined, {
    fetch: async () => {
      throw new Error('network unavailable');
    },
  });

  assert.deepEqual(media, []);
});

test('extractMediaFromTweet enriches retweets from x.com JSON state and canonicalizes original tweet', async () => {
  const html = `
    <html><body>
      <script>window.__INITIAL_STATE__ = ${JSON.stringify({
        entries: {
          retweet: {
            __typename: 'Tweet',
            rest_id: '1111111111111111111',
            core: { user_results: { result: { legacy: { name: 'Official Retweeter', screen_name: 'zutomayo_art' } } } },
            legacy: {
              retweeted_status_result: {
                result: {
                  __typename: 'Tweet',
                  rest_id: '2222222222222222222',
                  core: { user_results: { result: { legacy: { name: 'Original Artist', screen_name: 'original_artist' } } } },
                  legacy: {
                    full_text: 'original text #OriginalTag',
                    created_at: 'Fri May 22 10:11:12 +0000 2026',
                    favorite_count: 12,
                    retweet_count: 3,
                    entities: { hashtags: [{ text: 'OriginalTag' }] },
                    extended_entities: {
                      media: [{
                        type: 'photo',
                        media_url_https: 'https://pbs.twimg.com/media/original.jpg?format=jpg&name=small',
                      }],
                    },
                  },
                },
              },
            },
          },
        },
      })};</script>
    </body></html>`;

  const media = await TwitterService.extractMediaFromTweet(rssItem.link, rssItem, {
    fetch: async () => ({
      ok: true,
      text: async () => html,
    } as Response),
  });

  assert.equal(media.length, 1);
  assert.equal(media[0].tweet_id, '2222222222222222222');
  assert.equal(media[0].tweet_url, buildCanonicalTweetUrl('2222222222222222222'));
  assert.equal(media[0].requested_tweet_id, '1111111111111111111');
  assert.equal(media[0].retweeted_by_handle, 'zutomayo_art');
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/original.jpg?format=jpg&name=orig');
  assert.equal(media[0].user_name, 'Original Artist');
  assert.equal(media[0].user_screen_name, 'original_artist');
  assert.deepEqual(media[0].hashtags, ['OriginalTag']);
});

test('extractMediaFromTweet canonicalizes RSS fallback media when x.com state only identifies original tweet', async () => {
  const html = `
    <script>window.__INITIAL_STATE__ = ${JSON.stringify({
      retweet: {
        rest_id: '1111111111111111111',
        legacy: {
          retweeted_status_result: {
            result: {
              rest_id: '3333333333333333333',
              legacy: { full_text: 'original without media #FallbackCanonical' },
            },
          },
        },
      },
    })};</script>`;

  const media = await TwitterService.extractMediaFromTweet(rssItem.link, rssItem, {
    fetch: async () => ({
      ok: true,
      text: async () => html,
    } as Response),
  });

  assert.equal(media.length, 3);
  assert.equal(media[0].tweet_id, '3333333333333333333');
  assert.equal(media[0].tweet_url, buildCanonicalTweetUrl('3333333333333333333'));
  assert.equal(media[0].requested_tweet_id, '1111111111111111111');
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/img_a.jpg?format=jpg&name=orig');
  assert.deepEqual(media[0].hashtags, ['FallbackCanonical']);
});

test('extractMediaFromTweet does not canonicalize quote tweets to the quoted tweet', async () => {
  const tweetUrl = 'https://x.com/quote_artist/status/7777777777777777777';
  const html = `
    <script>window.__INITIAL_STATE__ = ${JSON.stringify({
      quote: {
        rest_id: '7777777777777777777',
        core: { user_results: { result: { legacy: { name: 'Quote Artist', screen_name: 'quote_artist' } } } },
        legacy: {
          full_text: 'quote text #QuoteTag',
          created_at: 'Fri May 22 09:10:11 +0000 2026',
          entities: { hashtags: [{ text: 'QuoteTag' }] },
          extended_entities: {
            media: [{
              type: 'photo',
              media_url_https: 'https://pbs.twimg.com/media/quote.jpg?format=jpg&name=small',
            }],
          },
          quoted_status_result: {
            result: {
              rest_id: '8888888888888888888',
              core: { user_results: { result: { legacy: { name: 'Quoted Artist', screen_name: 'quoted_artist' } } } },
              legacy: {
                full_text: 'quoted text #QuotedTag',
                extended_entities: {
                  media: [{
                    type: 'photo',
                    media_url_https: 'https://pbs.twimg.com/media/quoted.jpg?format=jpg&name=small',
                  }],
                },
              },
            },
          },
        },
      },
    })};</script>`;

  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({
      ok: true,
      text: async () => html,
    } as Response),
  });

  assert.equal(media.length, 1);
  assert.equal(media[0].tweet_id, '7777777777777777777');
  assert.equal(media[0].tweet_url, buildCanonicalTweetUrl('7777777777777777777'));
  assert.equal(media[0].requested_tweet_id, '7777777777777777777');
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/quote.jpg?format=jpg&name=orig');
  assert.equal(media[0].user_screen_name, 'quote_artist');
  assert.deepEqual(media[0].hashtags, ['QuoteTag']);
});

// x.com 2024+ 將 SSR 從 __INITIAL_STATE__ JSON 遷移到 RSC (React Server Components) payload。
// 此測試驗證建構路徑③ buildMediaFromRscPayload 能從 RSC 格式正確抓出多張圖片。
test('extractMediaFromTweet parses multiple images from x.com RSC payload', async () => {
  const tweetUrl = 'https://x.com/zutomayo/status/2073719137424273488';
  // 簡化的 RSC payload fixture（節錄真實 x.com SSR 結構的關鍵欄位）
  const html = `
<!DOCTYPE html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","url":"https://x.com/"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SocialMediaPosting","articleBody":"イチジク煙 キャラデザ\\nお楽しみ。。。。 https://t.co/gYOgZMnwYL","author":{"@type":"Person","alternateName":"@zutomayo","name":"ACAねこスキル (ずっと真夜中でいいのに。)","url":"https://x.com/zutomayo"},"dateCreated":"2026-07-05T10:42:24.000Z","datePublished":"2026-07-05T10:42:24.000Z","headline":"イチジク煙 キャラデザ\\nお楽しみ。。。。 https://t.co/gYOgZMnwYL","identifier":"2073719137424273488","image":"https://pbs.twimg.com/media/HMdUkInbEAApmNe.jpg:large","interactionStatistic":[{"@type":"InteractionCounter","interactionType":"https://schema.org/LikeAction","name":"Likes","userInteractionCount":3275},{"@type":"InteractionCounter","interactionType":"https://schema.org/InteractAction","name":"Retweets","userInteractionCount":542},{"@type":"InteractionCounter","interactionType":"https://schema.org/InteractAction","name":"Replies","userInteractionCount":64},{"@type":"InteractionCounter","interactionType":"https://schema.org/ViewAction","userInteractionCount":82933}],"mainEntityOfPage":"https://x.com/zutomayo/status/2073719137424273488","text":"イチジク煙 キャラデザ\\nお楽しみ。。。。 https://t.co/gYOgZMnwYL","url":"https://x.com/zutomayo/status/2073719137424273488"}</script>
</head><body>
<script nonce="abc">window.__INITIAL_DATA__={"appMetadata":{"appVersion":"abc123"}}</script>
<script nonce="def">
"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==":$R[1]={__id:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==",__typename:"ApiTweet",rest_id:"2073719137424273488",id:"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==",core:$R[2]={__ref:"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:core"},legacy:$R[3]={__ref:"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:legacy"}},
"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:core":$R[4]={__id:"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:core",__typename:"TweetCore",user_results:$R[5]={__ref:"VXNlclJlc3VsdHM6OTg2Mjc1MjAyMDMwOTA3Mzky"}},
"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:legacy":$R[6]={__id:"VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:legacy",__typename:"TweetLegacy",full_text:"イチジク煙 キャラデザ\\nお楽しみ。。。。 https://t.co/gYOgZMnwYL",favorite_count:3275,retweet_count:542,reply_count:64,view_count:82933,created_at:"Sat Jul 05 10:42:24 +0000 2026"},
"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:0":$R[7]={__id:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:0",__typename:"ApiMediaEntity",id_str:"2073719133192261632",type:"photo",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/media/HMdUkInbEAApmNe.jpg",ext_alt_text:null,additional_media_info:null,original_info:$R[8]={__ref:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:0:original_info"},ext_playlists:$R[9]={__refs:$R[10]=[]},video_info:null,sensitive_media_warning:null,indices:$R[11]=[21,44]},
"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:0:original_info":$R[12]={__id:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:0:original_info",__typename:"OriginalMediaInfo",width:1200,height:1500},
"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:1":$R[13]={__id:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:1",__typename:"ApiMediaEntity",id_str:"2073719133133574145",type:"photo",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/media/HMdUkIZbkAERzDH.jpg",ext_alt_text:null,additional_media_info:null,original_info:$R[14]={__ref:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:1:original_info"},video_info:null},
"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:2":$R[15]={__id:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:2",__typename:"ApiMediaEntity",id_str:"2073719133162868736",type:"photo",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/media/HMdUkIgakAA-2YN.jpg",ext_alt_text:null,additional_media_info:null,original_info:$R[16]={__ref:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:2:original_info"},video_info:null},
"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:3":$R[17]={__id:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:3",__typename:"ApiMediaEntity",id_str:"2073719133125132288",type:"photo",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/media/HMdUkIXawAAVcqV.jpg",ext_alt_text:null,additional_media_info:null,original_info:$R[18]={__ref:"client:VHdlZXQ6MjA3MzcxOTEzNzQyNDI3MzQ4OA==:media_entities2:3:original_info"},video_info:null}
</script>
<meta property="og:image" content="https://pbs.twimg.com/media/HMdUkInbEAApmNe.jpg:large">
<meta name="twitter:card" content="summary_large_image">
</body></html>`;
  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({ ok: true, text: async () => html } as Response),
  });

  assert.equal(media.length, 4, '應抓到 4 張圖片');
  assert.equal(media[0].type, 'image');
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/HMdUkInbEAApmNe.jpg?name=orig');
  assert.equal(media[1].url, 'https://pbs.twimg.com/media/HMdUkIZbkAERzDH.jpg?name=orig');
  assert.equal(media[2].url, 'https://pbs.twimg.com/media/HMdUkIgakAA-2YN.jpg?name=orig');
  assert.equal(media[3].url, 'https://pbs.twimg.com/media/HMdUkIXawAAVcqV.jpg?name=orig');
  assert.equal(media[0].tweet_id, '2073719137424273488');
  assert.equal(media[0].requested_tweet_id, '2073719137424273488');
  assert.equal(media[0].user_screen_name, 'zutomayo');
  assert.equal(media[0].user_name, 'ACAねこスキル (ずっと真夜中でいいのに。)');
  assert.equal(media[0].date, '2026-07-05T10:42:24.000Z');
  assert.equal(media[0].like_count, 3275);
  assert.equal(media[0].retweet_count, 542);
  assert.equal(media[0].view_count, 82933);
  assert.ok(media[0].text?.includes('イチジク煙'));
  // 每張圖都應帶有相同的 common metadata
  for (const item of media) {
    assert.equal(item.user_screen_name, 'zutomayo');
    assert.equal(item.like_count, 3275);
  }
});

test('extractMediaFromTweet falls back to og:image when RSC payload has no media entities', async () => {
  const tweetUrl = 'https://x.com/zutomayo/status/9999999999999999999';
  const html = `
<html><head>
<script type="application/ld+json">{"@type":"WebSite","url":"https://x.com/"}</script>
<meta property="og:image" content="https://pbs.twimg.com/media/fallback.jpg:large">
<meta name="twitter:description" content="fallback text">
</head><body></body></html>`;
  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({ ok: true, text: async () => html } as Response),
  });

  // RSC payload 無 ApiMediaEntity，應退化到 buildMediaFromHtmlMeta
  assert.equal(media.length, 1);
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/fallback.jpg:large?name=orig');
  assert.equal(media[0].type, 'image');
  assert.equal(media[0].text, 'fallback text');
});

// x.com RSC payload 的 video_info 使用 $R[N]={__ref:"..."} 引用結構，
// 實際 variant 定義散落在 HTML 各處。此測試驗證 buildMediaFromRscPayload
// 能正確解析 video + image 混合推文，並選最高 bitrate mp4。
test('extractMediaFromTweet parses mixed image+video from x.com RSC payload with ref video_info', async () => {
  const tweetUrl = 'https://x.com/takingyo0714/status/2074103702668083303';
  const html = `
<!DOCTYPE html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SocialMediaPosting","articleBody":"test video+image","author":{"@type":"Person","alternateName":"@takingyo0714","name":"TAkingyo"},"dateCreated":"2026-07-06T12:10:32.000Z","datePublished":"2026-07-06T12:10:32.000Z","identifier":"2074103702668083303","image":"https://pbs.twimg.com/media/HMiyPncboAIlurt.jpg:large","mainEntityOfPage":"https://x.com/takingyo0714/status/2074103702668083303","text":"test video+image","url":"https://x.com/takingyo0714/status/2074103702668083303"}</script>
</head><body>
<script nonce="abc">
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:0":$R[10]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:0",__typename:"ApiMediaEntity",id_str:"2074103609760129026",type:"photo",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/media/HMiyPncboAIlurt.jpg",ext_alt_text:null,additional_media_info:null,original_info:$R[11]={__ref:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:0:original_info"},ext_playlists:$R[12]={__refs:$R[13]=[]},video_info:null,sensitive_media_warning:null,indices:$R[14]=[149,172]},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:0:original_info":$R[15]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:0:original_info",__typename:"ApiMediaEntityOriginalInfo",width:2000,height:1500},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1":$R[16]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1",__typename:"ApiMediaEntity",id_str:"2074103609764323328",type:"video",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/amplify_video_thumb/2074103609764323328/img/rsrvCBz-s5bJCg0u.jpg",ext_alt_text:null,additional_media_info:$R[17]={__ref:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:additional_media_info"},original_info:$R[18]={__ref:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:original_info"},ext_playlists:$R[19]={__refs:$R[20]=[]},video_info:$R[21]={__ref:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info"},sensitive_media_warning:null,indices:$R[22]=[173,196]},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:original_info":$R[23]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:original_info",__typename:"ApiMediaEntityOriginalInfo",width:1920,height:1080},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info":$R[24]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info",__typename:"ApiMediaEntityVideoInfo",duration_millis:4433,variants:$R[25]={__refs:$R[26]=["client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:0","client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:1","client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:2","client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:3","client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:4"]}},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:0":$R[27]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:0",__typename:"ApiMediaEntityVideoVariant",bitrate:null,content_type:"application/x-mpegURL",url:"https://video.twimg.com/amplify_video/2074103609764323328/pl/Wnlgi6Uj1vqFr0s-.m3u8?tag=28"},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:1":$R[28]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:1",__typename:"ApiMediaEntityVideoVariant",bitrate:256000,content_type:"video/mp4",url:"https://video.twimg.com/amplify_video/2074103609764323328/vid/avc1/480x270/HEG7y31_YI_yEn7c.mp4?tag=28"},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:2":$R[29]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:2",__typename:"ApiMediaEntityVideoVariant",bitrate:832000,content_type:"video/mp4",url:"https://video.twimg.com/amplify_video/2074103609764323328/vid/avc1/640x360/v-O0OcLCECqnYopn.mp4?tag=28"},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:3":$R[30]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:3",__typename:"ApiMediaEntityVideoVariant",bitrate:2176000,content_type:"video/mp4",url:"https://video.twimg.com/amplify_video/2074103609764323328/vid/avc1/1280x720/blE2959dm0jeuAWh.mp4?tag=28"},
"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:4":$R[31]={__id:"client:VHdlZXQ6MjA3NDEwMzcwMjY2ODA4MzMwMw==:media_entities2:1:video_info:variants:4",__typename:"ApiMediaEntityVideoVariant",bitrate:4096000,content_type:"video/mp4",url:"https://video.twimg.com/amplify_video/2074103609764323328/vid/avc1/1920x1080/zMSfSSuxZllXN2xn.mp4?tag=28"}
</script>
<meta property="og:image" content="https://pbs.twimg.com/media/HMiyPncboAIlurt.jpg:large">
</body></html>`;
  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({ ok: true, text: async () => html } as Response),
  });

  assert.equal(media.length, 2, '應抓到 1 image + 1 video');
  assert.equal(media[0].type, 'image');
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/HMiyPncboAIlurt.jpg?name=orig');
  assert.equal(media[1].type, 'video');
  // 應選最高 bitrate (4096000) 的 mp4
  assert.equal(media[1].url, 'https://video.twimg.com/amplify_video/2074103609764323328/vid/avc1/1920x1080/zMSfSSuxZllXN2xn.mp4?tag=28');
  assert.equal(media[1].thumbnail, 'https://pbs.twimg.com/amplify_video_thumb/2074103609764323328/img/rsrvCBz-s5bJCg0u.jpg?name=orig');
  assert.equal(media[1].user_screen_name, 'takingyo0714');
  assert.equal(media[1].date, '2026-07-06T12:10:32.000Z');
});

// x.com 對年齡限制/敏感推文用 BlurredMediaTombstone 取代 ApiMediaEntity，
// 只暴露 blurred_image_url（模糊縮圖），但媒體 ID 是真實的，可構建 orig URL。
// 此測試驗證 buildMediaFromPreloadImages 能從 BlurredMediaTombstone 抓到媒體。
test('extractMediaFromTweet parses media from BlurredMediaTombstone for age-restricted tweets', async () => {
  const tweetUrl = 'https://x.com/8root5/status/2074109200159199293';
  const html = `
<!DOCTYPE html><html><head>
<meta property="og:site_name" content="X (formerly Twitter)">
<meta property="og:image" content="https://abs.twimg.com/rweb/ssr/default/v2/og/image.png">
<meta property="og:title" content="Post">
</head><body>
<script nonce="abc">
"client:TweetResults:2074109200159199293:result":$R[10]={__id:"client:TweetResults:2074109200159199293:result",__typename:"TweetResults",result:$R[11]={__ref:"client:TweetResults:2074109200159199293:result:tombstone"}},
"client:TweetResults:2074109200159199293:result:tombstone":$R[12]={__id:"client:TweetResults:2074109200159199293:result:tombstone",__typename:"BlurredMediaTombstone",blurred_image_url:"https://pbs.twimg.com/media/GxJIrSUagAAK-ZP?format=jpg&name=240x240",text:$R[13]={__ref:"client:TweetResults:2074109200159199293:result:tombstone:text"},user_results:$R[14]={__ref:"VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2"}},
"client:VHdlZXQ6MjA3NDEwOTIwMDE1OTE5OTI5Mw==:core":$R[15]={__id:"client:VHdlZXQ6MjA3NDEwOTIwMDE1OTE5OTI5Mw==:core",__typename:"TweetCore",user_results:$R[16]={__ref:"VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2"}},
"client:VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2":$R[17]={__id:"client:VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2",__typename:"ApiUser",legacy:$R[18]={__ref:"VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2:legacy"}},
"VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2:legacy":$R[19]={__id:"VXNlclJlc3VsdHM6ODc4NjA2OTQxNjcyNDUyMDk2:legacy",__typename:"UserLegacy",screen_name:"8root5",name:"8root"}
</script>
</body></html>`;
  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({ ok: false, status: 404, text: async () => html } as Response),
  });

  assert.equal(media.length, 1, '應從 BlurredMediaTombstone 抓到 1 張圖片');
  assert.equal(media[0].type, 'image');
  // 應升級為 orig 解析度
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/GxJIrSUagAAK-ZP?format=jpg&name=orig');
  assert.equal(media[0].tweet_id, '2074109200159199293');
});

// x.com 的 animated_gif 在 RSC payload 中 type 為 "animated_gif"，
// mp4 url 格式為 tweet_video/{MEDIA_ID}.mp4（不包含 ApiMediaEntity 的 id_str）。
// 此測試驗證 findRscVideoMp4Url 能從 media_url_https 提取媒體 ID 並找到 mp4。
test('extractMediaFromTweet parses animated_gif from x.com RSC payload', async () => {
  const tweetUrl = 'https://x.com/TENATR121/status/2074105048355983601';
  const html = `
<!DOCTYPE html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SocialMediaPosting","articleBody":"test gif","author":{"@type":"Person","alternateName":"@TENATR121","name":"テナテル"},"dateCreated":"2026-07-06T12:15:53.000Z","datePublished":"2026-07-06T12:15:53.000Z","identifier":"2074105048355983601","mainEntityOfPage":"https://x.com/TENATR121/status/2074105048355983601"}</script>
<meta property="og:image" content="https://pbs.twimg.com/profile_images/1344531712601063425/9Km8IVkU_200x200.jpg">
</head><body>
<script nonce="abc">
"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0":$R[10]={__id:"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0",__typename:"ApiMediaEntity",id_str:"2074105036603559936",type:"animated_gif",source_status_id_str:null,media_url_https:"https://pbs.twimg.com/tweet_video_thumb/HMiziq2akAASJBB.jpg",ext_alt_text:null,additional_media_info:null,original_info:$R[11]={__ref:"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:original_info"},ext_playlists:$R[12]={__refs:$R[13]=[]},video_info:$R[14]={__ref:"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:video_info"},sensitive_media_warning:null,indices:$R[15]=[149,172]},
"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:video_info":$R[16]={__id:"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:video_info",__typename:"ApiMediaEntityVideoInfo",duration_millis:0,variants:$R[17]={__refs:$R[18]=["client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:video_info:variants:0"]}},
"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:video_info:variants:0":$R[19]={__id:"client:VHdlZXQ6MjA3NDEwNTA0ODM1NTk4MzYwMQ==:media_entities2:0:video_info:variants:0",__typename:"ApiMediaEntityVideoVariant",bitrate:0,content_type:"video/mp4",url:"https://video.twimg.com/tweet_video/HMiziq2akAASJBB.mp4"}
</script>
</body></html>`;
  const media = await TwitterService.extractMediaFromTweet(tweetUrl, undefined, {
    fetch: async () => ({ ok: true, text: async () => html } as Response),
  });

  assert.equal(media.length, 1, '應抓到 1 個 animated_gif');
  assert.equal(media[0].type, 'gif');
  assert.equal(media[0].url, 'https://video.twimg.com/tweet_video/HMiziq2akAASJBB.mp4');
  assert.equal(media[0].thumbnail, 'https://pbs.twimg.com/tweet_video_thumb/HMiziq2akAASJBB.jpg?name=orig');
  assert.equal(media[0].user_screen_name, 'TENATR121');
});

test('extractMediaFromTweet excludes quoted-tweet media from RSC payload', async () => {
  const requestedTweetId = '1234567890123456789';
  const quotedTweetId = '9876543210987654321';
  const requestedTweetKey = Buffer.from(`Tweet:${requestedTweetId}`).toString('base64');
  const quotedTweetKey = Buffer.from(`Tweet:${quotedTweetId}`).toString('base64');
  const html = `
<html><head>
<script type="application/ld+json">{"@type":"SocialMediaPosting","identifier":"${requestedTweetId}","articleBody":"main post","author":{"name":"Main Artist","alternateName":"@main_artist"}}</script>
</head><body><script>
"client:${requestedTweetKey}:media_entities2:0":$R[1]={__id:"client:${requestedTweetKey}:media_entities2:0",__typename:"ApiMediaEntity",id_str:"1111111111111111111",type:"photo",media_url_https:"https://pbs.twimg.com/media/MAIN_MEDIA"},
"client:${quotedTweetKey}:media_entities2:0":$R[2]={__id:"client:${quotedTweetKey}:media_entities2:0",__typename:"ApiMediaEntity",id_str:"2222222222222222222",type:"photo",media_url_https:"https://pbs.twimg.com/media/QUOTED_MEDIA"}
</script></body></html>`;

  const media = await TwitterService.extractMediaFromTweet(
    `https://x.com/main_artist/status/${requestedTweetId}`,
    undefined,
    { fetch: async () => ({ ok: true, text: async () => html } as Response) },
  );

  assert.deepEqual(media.map((item) => item.url), [
    'https://pbs.twimg.com/media/MAIN_MEDIA?name=orig',
  ]);
  assert.equal(media[0].tweet_id, requestedTweetId);
});

test('extractMediaFromTweet deduplicates repeated RSC media entities', async () => {
  const requestedTweetId = '2234567890123456789';
  const requestedTweetKey = Buffer.from(`Tweet:${requestedTweetId}`).toString('base64');
  const html = `
<html><head>
<script type="application/ld+json">{"@type":"SocialMediaPosting","identifier":"${requestedTweetId}","articleBody":"duplicate media","author":{"name":"Artist","alternateName":"@artist"}}</script>
</head><body><script>
"client:${requestedTweetKey}:media_entities2:0":$R[1]={__id:"client:${requestedTweetKey}:media_entities2:0",__typename:"ApiMediaEntity",id_str:"3333333333333333333",type:"photo",media_url_https:"https://pbs.twimg.com/media/DUPLICATE_MEDIA"},
"client:${requestedTweetKey}:media_entities2:1":$R[2]={__id:"client:${requestedTweetKey}:media_entities2:1",__typename:"ApiMediaEntity",id_str:"3333333333333333333",type:"photo",media_url_https:"https://pbs.twimg.com/media/DUPLICATE_MEDIA"}
</script></body></html>`;

  const media = await TwitterService.extractMediaFromTweet(
    `https://x.com/artist/status/${requestedTweetId}`,
    undefined,
    { fetch: async () => ({ ok: true, text: async () => html } as Response) },
  );

  assert.equal(media.length, 1);
  assert.equal(media[0].url, 'https://pbs.twimg.com/media/DUPLICATE_MEDIA?name=orig');
});

test('extractMediaFromTweet rejects large non-2xx pages without requested tweet evidence', async () => {
  const requestedTweetId = '3234567890123456789';
  const html = `<html><body>${'x'.repeat(6000)}<link rel="preload" as="image" href="https://pbs.twimg.com/media/UNRELATED?format=jpg&amp;name=small"></body></html>`;

  const media = await TwitterService.extractMediaFromTweet(
    `https://x.com/missing/status/${requestedTweetId}`,
    undefined,
    {
      fetch: async () => ({
        ok: false,
        status: 404,
        text: async () => html,
      } as Response),
    },
  );

  assert.deepEqual(media, []);
});
