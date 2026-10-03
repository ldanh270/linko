# Audit and soft-delete migration

`backfillAudit.ts` is dry-run by default. It reports legacy documents missing audit fields and previews index changes. It does not write to MongoDB without `--apply`.

## Runbook

1. Take and verify a restorable MongoDB backup. Record the restore point and pause writes that could introduce duplicate active usernames, emails, refresh tokens, or friend pairs.
2. Run `pnpm -C backend exec tsx scripts/backfillAudit.ts` against the target database and review every count and index action. Use an isolated test database first.
3. Run `pnpm -C backend exec tsx scripts/backfillAudit.ts --apply` to fill missing fields. Run it again; every count must be zero. This step does not change indexes.
4. Only after the backup and dry-run are reviewed, run `pnpm -C backend exec tsx scripts/backfillAudit.ts --apply --apply-indexes --backup-confirmed --dry-run-reviewed`. The script creates partial unique indexes for active records, drops their superseded unique indexes, then replaces the Session TTL index with a normal expiry index. Inspect the output and MongoDB index list.
5. Resume writes and verify login/logout, friendship requests, and active-only reads. Keep the backup until the release is accepted.

The script uses a reserved `SYSTEM` ObjectId for unknown historical actors. Historical IP addresses remain `null`; it never invents a client IP. If timestamps are absent, it derives `createdAt` from the ObjectId timestamp and uses that value for `updatedAt`. That value is an estimate, not proof of the original write time.

## Rollback

Restore the verified backup for a full rollback of data and indexes. For an index-only rollback, recreate the previous unique indexes and Session TTL index **only after** checking that the current active and deleted records still satisfy their old uniqueness rules. Re-enabling TTL can permanently delete expired Session documents; a backup is the only way to recover documents already removed by TTL. The backfill itself adds fields and cannot recover unknown original actor, IP, or exact timestamps.

Do not run this migration against production as part of F00 implementation or automated tests. Tests use `MongoMemoryReplSet` and clear the configured connection string before loading application code.
