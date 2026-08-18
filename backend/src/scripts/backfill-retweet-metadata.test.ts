import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeRetweetBackfillCli,
  mergeRetweetHandles,
  runRetweetBackfill,
  type BackfillCandidate,
  type BackfillDeps,
  type BackfillRecord,
  type RetweetBackfillOptions,
} from './backfill-retweet-metadata.js';

const candidate: BackfillCandidate = {
  id: 'duplicate-retweet',
  tweet_id: '1111111111111111111',
  original_url: 'https://x.com/i/status/1111111111111111111',
  media_url: 'https://pbs.twimg.com/media/MEDIA_ONE?format=jpg&name=small',
  thumbnail_url: null,
  original_thumbnail_url: null,
  author_name: 'Legacy Author',
  author_handle: 'legacy_author',
  retweeted_by_handle: null,
  source_text: 'RT @original_artist: original text',
  status: 'pending',
};

const resolvedMedia = [{
  url: 'https://pbs.twimg.com/media/MEDIA_ONE?format=jpg&name=orig',
  type: 'image',
  text: 'original text',
  user_name: 'Original Artist',
  user_screen_name: 'original_artist',
  tweet_id: '2222222222222222222',
  tweet_url: 'https://x.com/original_artist/status/2222222222222222222',
  requested_tweet_id: '1111111111111111111',
  retweeted_by_handle: 'zutomayo_art',
}];

const options: RetweetBackfillOptions = {
  apply: false,
  delayMs: 1,
};

const createDeps = (overrides: Partial<BackfillDeps> = {}) => {
  const updates: Array<{ id: string; values: Record<string, unknown> }> = [];
  let transactions = 0;
  let sleeps = 0;

  const deps: BackfillDeps = {
    listCandidates: async () => [candidate],
    resolveTweet: async () => resolvedMedia,
    findCanonicalRecords: async () => [],
    updateRecord: async (record, values) => {
      updates.push({ id: record.id, values });
    },
    transaction: async (operation) => {
      transactions += 1;
      return operation({});
    },
    sleep: async () => {
      sleeps += 1;
    },
    log: () => {},
    error: () => {},
    ...overrides,
  };

  return {
    deps,
    updates,
    getTransactions: () => transactions,
    getSleeps: () => sleeps,
  };
};

test('mergeRetweetHandles preserves order and deduplicates case-insensitively', () => {
  assert.equal(
    mergeRetweetHandles('zutomayo_art,Another_Official', ['ZUTOMAYO_ART', 'third_official']),
    'zutomayo_art,Another_Official,third_official',
  );
});

test('dry-run plans duplicate merge-and-reject without writes', async () => {
  const canonical: BackfillRecord = {
    ...candidate,
    id: 'canonical-original',
    tweet_id: '2222222222222222222',
    original_url: 'https://x.com/original_artist/status/2222222222222222222',
    retweeted_by_handle: 'another_official',
  };
  const fixture = createDeps({
    findCanonicalRecords: async () => [canonical],
  });

  const summary = await runRetweetBackfill(options, fixture.deps);

  assert.equal(summary.planned, 1);
  assert.equal(summary.duplicates, 1);
  assert.equal(summary.applied, 0);
  assert.equal(fixture.updates.length, 0);
  assert.equal(fixture.getTransactions(), 0);
  assert.equal(fixture.getSleeps(), 1);
});

test('apply merges the retweeter into canonical rows and rejects the duplicate atomically', async () => {
  const canonical: BackfillRecord = {
    ...candidate,
    id: 'canonical-original',
    tweet_id: '2222222222222222222',
    original_url: 'https://x.com/original_artist/status/2222222222222222222',
    retweeted_by_handle: 'another_official',
  };
  const fixture = createDeps({
    findCanonicalRecords: async () => [canonical],
  });

  const summary = await runRetweetBackfill({ ...options, apply: true }, fixture.deps);

  assert.equal(summary.applied, 1);
  assert.equal(summary.duplicates, 1);
  assert.equal(fixture.getTransactions(), 1);
  assert.deepEqual(fixture.updates, [
    {
      id: 'canonical-original',
      values: { retweeted_by_handle: 'another_official,zutomayo_art' },
    },
    {
      id: 'duplicate-retweet',
      values: {
        author_handle: 'original_artist',
        author_name: 'Original Artist',
        source_text: 'original text',
        status: 'rejected',
      },
    },
  ]);
});

test('apply canonicalizes a non-duplicate record in place', async () => {
  const fixture = createDeps();

  const summary = await runRetweetBackfill({ ...options, apply: true }, fixture.deps);

  assert.equal(summary.applied, 1);
  assert.equal(summary.duplicates, 0);
  assert.equal(fixture.getTransactions(), 1);
  assert.deepEqual(fixture.updates, [{
    id: 'duplicate-retweet',
    values: {
      author_handle: 'original_artist',
      author_name: 'Original Artist',
      media_url: 'https://pbs.twimg.com/media/MEDIA_ONE?format=jpg&name=orig',
      original_url: 'https://x.com/original_artist/status/2222222222222222222',
      retweeted_by_handle: 'zutomayo_art',
      source_text: 'original text',
      tweet_id: '2222222222222222222',
    },
  }]);
});

test('empty and failed resolution paths are throttled', async () => {
  const empty = createDeps({ resolveTweet: async () => [] });
  const emptySummary = await runRetweetBackfill(options, empty.deps);
  assert.equal(emptySummary.skipped, 1);
  assert.equal(empty.getSleeps(), 1);

  const failed = createDeps({ resolveTweet: async () => { throw new Error('network failed'); } });
  const failedSummary = await runRetweetBackfill(options, failed.deps);
  assert.equal(failedSummary.failed, 1);
  assert.equal(failed.getSleeps(), 1);
});

test('fatal CLI failures return non-zero and still close the database', async () => {
  let closed = 0;
  const exitCode = await executeRetweetBackfillCli({
    argv: ['--apply'],
    env: {
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_NAME: 'gallery_test',
    },
    loadDeps: async () => ({
      ...createDeps({ listCandidates: async () => { throw new Error('query failed'); } }).deps,
      close: async () => { closed += 1; },
    }),
    log: () => {},
    error: () => {},
  });

  assert.equal(exitCode, 1);
  assert.equal(closed, 1);
});

test('production apply requires an exact database-name confirmation before loading dependencies', async () => {
  let loaded = 0;
  const exitCode = await executeRetweetBackfillCli({
    argv: ['--apply'],
    env: {
      NODE_ENV: 'production',
      DB_HOST: 'db.internal.example',
      DB_NAME: 'gallery_production',
    },
    loadDeps: async () => {
      loaded += 1;
      return {
        ...createDeps().deps,
        close: async () => {},
      };
    },
    log: () => {},
    error: () => {},
  });

  assert.equal(exitCode, 1);
  assert.equal(loaded, 0);
});
