# Prod Cutover Runbook — DB swap (no in-place prod migration)

**Strategy (owner's, safest):** never run migrations against the live prod DB. Instead, clone prod
into a staging DB, migrate + scrub the clone, verify it, then **swap**: preserve the old prod under a
`-legacy` name and promote the migrated clone into `efd-database`. Legacy data is fully preserved
before anything is overwritten, so it can never be lost.

Rehearsed end-to-end on 2026-06-30 (49,141 docs). All commands below are proven on `efd-db-migrate`.

## Prereqs
- MongoDB Database Tools installed. `MDB_BIN="C:/Program Files/MongoDB/Tools/100/bin"`.
- `.env.local` has `MONGODB_URI`, AWS creds, MinIO creds.
- Branch `chore/react-19-upgrade` (= `feat/manufacturing-production-cycle`) is what deploys.

## ⚠ Timing: clone FRESH at cutover
Prod keeps changing (new repairs, and **any custom jobs recorded in the legacy system between now and
cutover**). The clone goes stale immediately. So the real cutover **re-clones prod at that moment** —
the fresh clone + `s7b` sweep in exactly the jobs recorded since. Do it in a short maintenance window
to avoid losing writes that land after the clone. (This month's custom jobs: record them in the live
legacy system now; the cutover clone will carry them into the new system automatically.)

## Step 1 — Clone prod → staging (read-only on prod)
```bash
MDB_BIN="$MDB_BIN" CLONE_SOURCE_DB=efd-database CLONE_TARGET_DB=efd-db-migrate \
  CLONE_DUMP_DIR="<scratch>/_dbdump" node --env-file=.env.local scripts/clone-prod-to-dev.mjs
```

## Step 2 — Migrate the clone (in order). Dry-run first, then apply.
```bash
for m in s0-workorder-spine s1-billing-modes s2-sale-service-work-orders \
         s3-drops-designs s4-pieces s7-custom-orders s7b-customtickets-to-customorders; do
  MIGRATE_DB=efd-db-migrate node --env-file=.env.local scripts/migrations/$m.mjs --dry-run --skip-backup
done
# review s7b landscape report (statuses all mapped?), then re-run WITHOUT --dry-run to apply.
```
Rehearsal results: 362 workOrders; `repairLaborLogs→laborLogs` (151); `repairPayrollBatches→payrollBatches`;
billing.mode on 362; 18 customTickets→customOrders (statuses mapped, spec + historical quotes preserved).

## Step 3 — Scrub images S3 → MinIO on the clone
```bash
MIGRATE_DB=efd-db-migrate node scripts/migrate-s3-bucket-urls.js --verify   # → lists missing
MIGRATE_DB=efd-db-migrate node scripts/migrate-s3-bucket-urls.js --copy     # copy missing S3→MinIO
MIGRATE_DB=efd-db-migrate node scripts/migrate-s3-bucket-urls.js --verify   # expect 0 missing
MIGRATE_DB=efd-db-migrate node scripts/migrate-s3-bucket-urls.js --apply    # rewrite URLs (0 remaining after)
```
Rehearsal: 673 URLs across 388 docs; 52 objects copied; 0 remaining.

## Step 4 — Smoke-test the clone (before swap)
Point a local admin at the clone (`MONGO_DB_NAME=efd-db-migrate`) and click through: customs list/detail,
a repair's labor + payroll, the bench, products. Confirm no runtime errors.

## Step 5 — The SWAP (Mongo has no native rename → dump/restore)
```bash
# 5a. Preserve legacy FIRST (nothing is overwritten until this succeeds):
mongodump  --uri="<uri>/efd-database"  --out=<swap>/legacy-dump
mongorestore --uri="<uri>" --nsFrom='efd-database.*' --nsTo='efd-database-legacy.*' --drop <swap>/legacy-dump
# 5b. Promote the migrated clone into the prod name:
mongodump  --uri="<uri>/efd-db-migrate" --out=<swap>/migrate-dump
mongorestore --uri="<uri>" --nsFrom='efd-db-migrate.*' --nsTo='efd-database.*' --drop <swap>/migrate-dump
```
After 5b, `efd-database` holds the migrated data; `efd-database-legacy` holds the untouched pre-cutover prod.

## Step 6 — Deploy + verify
- Merge/deploy `chore/react-19-upgrade` to `main` (Vercel). `MONGO_DB_NAME` stays `efd-database`.
- Smoke-test prod. **Rollback = repoint `MONGO_DB_NAME` back to `efd-database-legacy` + redeploy old build.**

## Open items before a real cutover
- **Customer names on migrated customs:** legacy `userID` does NOT resolve to the `clients` collection
  (kept as `legacyUserID`). Reconcile (`userID`→`users`→`clients`) so migrated custom jobs show names.
- **efd-shop** deploys from its own repo and must be cut over in lockstep (shares `products`/`customOrders`).
- The 2 orphaned labor logs (deleted repair `repair-9ae1a6e0`) are expected/known.
