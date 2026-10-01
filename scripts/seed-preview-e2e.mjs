/**
 * Put the e2e accounts (<role>@views.check, one per role) on the DEV database, for the signed-in checks against
 * Vercel preview deploys (scripts/views-remote.mjs; owner, 2026-10-01, docs/OPEN-QUESTIONS.md Q1).
 *
 * The OWNER runs this, with a password they choose, and puts the same password in the GitHub secret
 * E2E_PREVIEW_PASSWORD. The password is only ever read from the environment: it isn't printed, stored in the repo,
 * or passed on the command line.
 *
 *   MONGODB_URI=<dev uri> MONGO_DB_NAME=efd-database-DEV E2E_PREVIEW_PASSWORD=<choose one> \
 *     node scripts/seed-preview-e2e.mjs
 *
 * DEV ONLY: refuses unless MONGO_DB_NAME is exactly efd-database-DEV. Idempotent (upsert by email); running it
 * again with a new password rotates it. `--remove` deletes the accounts again.
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { ACCOUNTS, userDoc, affiliateDoc } from '../e2e/views/seed.mjs';

const DB = process.env.MONGO_DB_NAME;
const uri = process.env.MONGODB_URI;
const password = process.env.E2E_PREVIEW_PASSWORD;
const remove = process.argv.includes('--remove');

if (DB !== 'efd-database-DEV') { console.error(`Refusing: MONGO_DB_NAME must be efd-database-DEV (got "${DB || ''}").`); process.exit(2); }
if (!uri) { console.error('MONGODB_URI is required.'); process.exit(2); }
if (!remove && (!password || password.length < 16)) { console.error('E2E_PREVIEW_PASSWORD is required (16+ characters).'); process.exit(2); }

const client = new MongoClient(uri);
await client.connect();
try {
  const dbi = client.db(DB);
  const users = dbi.collection('users');
  if (remove) {
    const r = await users.deleteMany({ email: { $in: ACCOUNTS.map((a) => a.email) } });
    await dbi.collection('affiliates').deleteOne({ affiliateId: 'aff_views' });
    console.log(`Removed ${r.deletedCount} e2e account(s) from ${DB}.`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    const now = new Date();
    for (const a of ACCOUNTS) {
      const { createdAt, ...doc } = userDoc(a, hash, now);
      await users.updateOne({ email: a.email }, { $set: doc, $setOnInsert: { createdAt } }, { upsert: true });
    }
    const { createdAt, ...aff } = affiliateDoc(now);
    await dbi.collection('affiliates').updateOne({ affiliateId: aff.affiliateId }, { $set: aff, $setOnInsert: { createdAt } }, { upsert: true });
    console.log(`Seeded ${ACCOUNTS.length} e2e accounts on ${DB}: ${ACCOUNTS.map((a) => a.email).join(', ')}.`);
  }
} finally {
  await client.close();
}
