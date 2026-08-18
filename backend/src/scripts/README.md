# Backend Maintenance Scripts

## Retweet Metadata Backfill

`backfill-retweet-metadata.ts` repairs legacy RSS retweet rows whose stored URL still uses
`/i/status/{requestedTweetId}`. It only scans rows matching all of these conditions:

- `source = 'rss'`
- `original_url` contains `/i/status/`
- `source_text` starts with `RT @handle:`

The command is dry-run by default:

```bash
cd backend
npm run backfill:retweet-metadata
```

Review the printed database host/name and planned actions before applying:

```bash
cd backend
npm run backfill:retweet-metadata -- --apply
```

For `NODE_ENV=production` or any non-local database host, `--apply` is rejected unless the
database name is confirmed exactly:

```bash
npm run backfill:retweet-metadata -- --apply --confirm-production=your_database_name
```

Optional `--delay-ms=<number>` controls the delay after every processed row. The default is
500 ms, including success, empty-result, and failure paths.

When the canonical original tweet is not already present, the row is updated in place with
the original tweet ID, URL, author, media URL, cleaned source text, and reliable retweeter
metadata. When canonical rows already exist, the retweeter handle is merged into every
canonical row, while the duplicate is retained for audit and marked `rejected`. The script
never deletes staging rows. Each applied candidate runs in a transaction, and Sequelize is
closed in `finally`; fatal errors return a non-zero exit code.
