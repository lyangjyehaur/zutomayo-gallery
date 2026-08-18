import 'dotenv/config';

import { pathToFileURL } from 'node:url';
import { Op } from 'sequelize';
import { requireConfiguredUrl } from '../config/urls.js';

type TransactionToken = unknown;

type ResolvedTwitterMedia = {
  url: string;
  thumbnail?: string;
  text?: string;
  user_name?: string;
  user_screen_name?: string;
  tweet_id?: string;
  tweet_url?: string;
  requested_tweet_id?: string;
  retweeted_by_handle?: string;
};

export type BackfillRecord = {
  id: string;
  tweet_id: string | null;
  original_url: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  original_thumbnail_url: string | null;
  author_name: string | null;
  author_handle: string | null;
  retweeted_by_handle: string | null;
  source_text: string | null;
  status: string | null;
  raw?: unknown;
};

export type BackfillCandidate = BackfillRecord;

export type RetweetBackfillOptions = {
  apply: boolean;
  delayMs: number;
};

export type RetweetBackfillSummary = {
  scanned: number;
  planned: number;
  applied: number;
  duplicates: number;
  skipped: number;
  failed: number;
};

export type BackfillDeps = {
  listCandidates: () => Promise<BackfillCandidate[]>;
  resolveTweet: (url: string) => Promise<ResolvedTwitterMedia[]>;
  findCanonicalRecords: (
    tweetId: string,
    excludeId: string,
    transaction?: TransactionToken,
    lock?: boolean,
  ) => Promise<BackfillRecord[]>;
  updateRecord: (
    record: BackfillRecord,
    values: Record<string, unknown>,
    transaction?: TransactionToken,
  ) => Promise<void>;
  transaction: <T>(operation: (transaction: TransactionToken) => Promise<T>) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
  error: (message: string, error?: unknown) => void;
};

type BackfillPlan = {
  kind: 'duplicate' | 'canonicalize';
  sourceTweetId: string;
  candidateUpdates: Record<string, unknown>;
  canonicalUpdates: Array<{
    record: BackfillRecord;
    values: Record<string, unknown>;
  }>;
};

type CliDeps = BackfillDeps & { close: () => Promise<void> };

type CliContext = {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  loadDeps?: () => Promise<CliDeps>;
  log?: (message: string) => void;
  error?: (message: string, error?: unknown) => void;
};

const recordFields = [
  'id',
  'tweet_id',
  'original_url',
  'media_url',
  'thumbnail_url',
  'original_thumbnail_url',
  'author_name',
  'author_handle',
  'retweeted_by_handle',
  'source_text',
  'status',
] as const;

const toRecord = (model: any): BackfillRecord => {
  const result = Object.fromEntries(recordFields.map((field) => [field, model.get(field) ?? null]));
  return { ...(result as Omit<BackfillRecord, 'raw'>), raw: model };
};

const splitHandles = (value: unknown): string[] => (
  typeof value === 'string'
    ? value.split(',').map((handle) => handle.trim()).filter(Boolean)
    : []
);

export const mergeRetweetHandles = (current: unknown, additions: Array<unknown>): string => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const handle of [...splitHandles(current), ...additions.flatMap(splitHandles)]) {
    const normalized = handle.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(handle);
  }
  return result.join(',');
};

const stripRetweetPrefix = (value: string): string => {
  const match = value.match(/^RT @[A-Za-z0-9_]+:\s*([\s\S]*)$/);
  return (match?.[1] || value).trim();
};

const mediaIdentity = (url: string | null | undefined): string => {
  if (!url) return '';
  const match = url.match(
    /\/(media|ext_tw_video|ext_tw_video_thumb|amplify_video|amplify_video_thumb|tweet_video|tweet_video_thumb)\/([A-Za-z0-9_-]+)/,
  );
  if (!match) return url.toLowerCase().split('?')[0];
  const family = match[1]
    .replace('_thumb', '')
    .replace('ext_tw_video', 'video')
    .replace('amplify_video', 'video')
    .replace('tweet_video', 'video');
  return `${family}:${match[2]}`;
};

const selectResolvedMedia = (
  candidateMediaUrl: string | null,
  mediaList: ResolvedTwitterMedia[],
): ResolvedTwitterMedia | null => {
  const identity = mediaIdentity(candidateMediaUrl);
  const matched = identity
    ? mediaList.find((media) => mediaIdentity(media.url) === identity)
    : undefined;
  if (matched) return matched;
  return mediaList.length === 1 ? mediaList[0] : null;
};

const changedValues = (
  record: BackfillRecord,
  proposed: Record<string, unknown>,
): Record<string, unknown> => Object.fromEntries(
  Object.entries(proposed).filter(([field, value]) => String(record[field as keyof BackfillRecord] ?? '') !== String(value ?? '')),
);

const buildPlan = (
  candidateRecord: BackfillCandidate,
  mediaList: ResolvedTwitterMedia[],
  canonicalRecords: BackfillRecord[],
): BackfillPlan | null => {
  const firstMedia = mediaList[0];
  const sourceTweetId = firstMedia?.tweet_id || '';
  const selectedMedia = selectResolvedMedia(candidateRecord.media_url, mediaList);
  if (!sourceTweetId || !selectedMedia) return null;

  const retweetedBy = mergeRetweetHandles(candidateRecord.retweeted_by_handle, [
    firstMedia.retweeted_by_handle,
  ]);
  if (!retweetedBy) return null;

  const sourceText = stripRetweetPrefix(selectedMedia.text || candidateRecord.source_text || '');
  const sharedUpdates = changedValues(candidateRecord, {
    author_handle: selectedMedia.user_screen_name || candidateRecord.author_handle,
    author_name: selectedMedia.user_name || candidateRecord.author_name,
    source_text: sourceText || candidateRecord.source_text,
  });

  if (canonicalRecords.length > 0) {
    return {
      kind: 'duplicate',
      sourceTweetId,
      canonicalUpdates: canonicalRecords.flatMap((record) => {
        const merged = mergeRetweetHandles(record.retweeted_by_handle, [retweetedBy]);
        const values = changedValues(record, { retweeted_by_handle: merged });
        return Object.keys(values).length > 0 ? [{ record, values }] : [];
      }),
      candidateUpdates: {
        ...sharedUpdates,
        ...changedValues(candidateRecord, { status: 'rejected' }),
      },
    };
  }

  return {
    kind: 'canonicalize',
    sourceTweetId,
    canonicalUpdates: [],
    candidateUpdates: changedValues(candidateRecord, {
      tweet_id: sourceTweetId,
      original_url: selectedMedia.tweet_url || (() => {
        const twitterWebOrigin = requireConfiguredUrl('TWITTER_WEB_ORIGIN');
        return selectedMedia.user_screen_name
          ? `${twitterWebOrigin}/${selectedMedia.user_screen_name}/status/${sourceTweetId}`
          : `${twitterWebOrigin}/i/status/${sourceTweetId}`;
      })(),
      media_url: selectedMedia.url,
      author_handle: selectedMedia.user_screen_name || candidateRecord.author_handle,
      author_name: selectedMedia.user_name || candidateRecord.author_name,
      retweeted_by_handle: retweetedBy,
      source_text: sourceText || candidateRecord.source_text,
      ...(selectedMedia.thumbnail
        ? {
          thumbnail_url: selectedMedia.thumbnail,
          original_thumbnail_url: selectedMedia.thumbnail,
        }
        : {}),
    }),
  };
};

const hasWrites = (plan: BackfillPlan): boolean => (
  Object.keys(plan.candidateUpdates).length > 0 || plan.canonicalUpdates.length > 0
);

export const runRetweetBackfill = async (
  options: RetweetBackfillOptions,
  deps: BackfillDeps,
): Promise<RetweetBackfillSummary> => {
  const candidates = await deps.listCandidates();
  const summary: RetweetBackfillSummary = {
    scanned: candidates.length,
    planned: 0,
    applied: 0,
    duplicates: 0,
    skipped: 0,
    failed: 0,
  };

  deps.log(`[Backfill] mode=${options.apply ? 'apply' : 'dry-run'} candidates=${candidates.length}`);

  for (const candidateRecord of candidates) {
    try {
      const originalUrl = candidateRecord.original_url || '';
      const mediaList = originalUrl ? await deps.resolveTweet(originalUrl) : [];
      if (mediaList.length === 0) {
        summary.skipped += 1;
        deps.log(`[Backfill] id=${candidateRecord.id} skipped: no resolved media`);
        continue;
      }

      const sourceTweetId = mediaList[0].tweet_id || '';
      if (!sourceTweetId || sourceTweetId === candidateRecord.tweet_id) {
        summary.skipped += 1;
        deps.log(`[Backfill] id=${candidateRecord.id} skipped: no canonical tweet change`);
        continue;
      }

      const canonicalRecords = await deps.findCanonicalRecords(sourceTweetId, candidateRecord.id);
      const plan = buildPlan(candidateRecord, mediaList, canonicalRecords);
      if (!plan || !hasWrites(plan)) {
        summary.skipped += 1;
        deps.log(`[Backfill] id=${candidateRecord.id} skipped: missing safe retweeter/media evidence or no changes`);
        continue;
      }

      summary.planned += 1;
      if (plan.kind === 'duplicate') summary.duplicates += 1;
      deps.log(
        `[Backfill] id=${candidateRecord.id} plan=${plan.kind} source_tweet=${plan.sourceTweetId}`,
      );

      if (!options.apply) continue;

      const appliedKind = await deps.transaction(async (transaction) => {
        const lockedCanonicalRecords = await deps.findCanonicalRecords(
          sourceTweetId,
          candidateRecord.id,
          transaction,
          true,
        );
        const lockedPlan = buildPlan(candidateRecord, mediaList, lockedCanonicalRecords);
        if (!lockedPlan || !hasWrites(lockedPlan)) return null;

        for (const update of lockedPlan.canonicalUpdates) {
          await deps.updateRecord(update.record, update.values, transaction);
        }
        if (Object.keys(lockedPlan.candidateUpdates).length > 0) {
          await deps.updateRecord(candidateRecord, lockedPlan.candidateUpdates, transaction);
        }
        return lockedPlan.kind;
      });

      if (appliedKind) {
        summary.applied += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      deps.error(`[Backfill] id=${candidateRecord.id} failed`, error);
    } finally {
      await deps.sleep(options.delayMs);
    }
  }

  deps.log(`[Backfill] summary=${JSON.stringify(summary)}`);
  return summary;
};

const parseCliOptions = (argv: string[]): RetweetBackfillOptions & { productionConfirmation?: string } => {
  let apply = false;
  let delayMs = 500;
  let productionConfirmation: string | undefined;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
    } else if (arg.startsWith('--delay-ms=')) {
      delayMs = Number(arg.slice('--delay-ms='.length));
      if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error('Invalid --delay-ms value');
    } else if (arg.startsWith('--confirm-production=')) {
      productionConfirmation = arg.slice('--confirm-production='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { apply, delayMs, productionConfirmation };
};

const isLocalDatabaseHost = (host: string): boolean => (
  ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase())
);

const loadDefaultDeps = async (): Promise<CliDeps> => {
  const [{ StagingFanartModel, sequelize }, { TwitterService }] = await Promise.all([
    import('../models/index.js'),
    import('../services/twitter.service.js'),
  ]);

  return {
    listCandidates: async () => {
      const records = await StagingFanartModel.findAll({
        where: {
          source: 'rss',
          original_url: { [Op.like]: '%/i/status/%' },
          source_text: { [Op.regexp]: '^RT @[A-Za-z0-9_]+:' },
        },
        attributes: [...recordFields],
        order: [['crawled_at', 'ASC'], ['id', 'ASC']],
      });
      return records.map(toRecord);
    },
    resolveTweet: (url) => TwitterService.extractMediaFromTweet(url),
    findCanonicalRecords: async (tweetId, excludeId, transaction, lock) => {
      const records = await StagingFanartModel.findAll({
        where: {
          tweet_id: tweetId,
          id: { [Op.ne]: excludeId },
        },
        attributes: [...recordFields],
        order: [['crawled_at', 'ASC'], ['id', 'ASC']],
        transaction: transaction as any,
        ...(lock ? { lock: true } : {}),
      });
      return records.map(toRecord);
    },
    updateRecord: async (record, values, transaction) => {
      const model = record.raw as any;
      if (!model?.update) throw new Error(`Record ${record.id} is not updateable`);
      await model.update(values, { transaction });
    },
    transaction: (operation) => sequelize.transaction((transaction) => operation(transaction)),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: console.log,
    error: console.error,
    close: () => sequelize.close(),
  };
};

export const executeRetweetBackfillCli = async (context: CliContext = {}): Promise<number> => {
  const argv = context.argv || process.argv.slice(2);
  const env = context.env || process.env;
  const log = context.log || console.log;
  const error = context.error || console.error;
  let deps: CliDeps | undefined;
  let exitCode = 0;

  try {
    const options = parseCliOptions(argv);
    const host = env.DB_HOST || '127.0.0.1';
    const database = env.DB_NAME || 'zutomayo_gallery';
    const productionTarget = env.NODE_ENV === 'production' || !isLocalDatabaseHost(host);

    log(`[Backfill] database host=${host} name=${database}`);
    log(`[Backfill] requested mode=${options.apply ? 'apply' : 'dry-run'}`);

    if (options.apply && productionTarget && options.productionConfirmation !== database) {
      throw new Error(
        `Production apply requires --confirm-production=${database}`,
      );
    }

    deps = await (context.loadDeps || loadDefaultDeps)();
    const summary = await runRetweetBackfill(options, {
      ...deps,
      log,
      error,
    });
    if (summary.failed > 0) exitCode = 2;
  } catch (caught) {
    error('[Backfill] fatal error', caught);
    exitCode = 1;
  } finally {
    if (deps) {
      try {
        await deps.close();
      } catch (closeError) {
        error('[Backfill] failed to close database', closeError);
        exitCode = 1;
      }
    }
  }

  return exitCode;
};

const isDirectExecution = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href,
);

if (isDirectExecution) {
  void executeRetweetBackfillCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
