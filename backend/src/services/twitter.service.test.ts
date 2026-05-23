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
