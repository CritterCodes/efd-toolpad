/**
 * Seed / re-seed the disposable DEV preview admin used by the Claude Preview harness
 * (scripts/dev-preview.mjs). DEV-only — refuses to touch prod. Idempotent (upsert by
 * email). Password is bcrypt-hashed exactly as AuthService.login expects; status must
 * be 'verified'. Run: MIGRATE_DB=efd-database-DEV node --env-file=.env.local scripts/seed-dev-preview-admin.mjs
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const DB = process.env.MIGRATE_DB || 'efd-database-DEV';
if (DB === 'efd-database') {
  console.error('✖ Refusing to seed the DEV preview admin into PRODUCTION (efd-database).');
  process.exit(1);
}
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('✖ MONGODB_URI required (node --env-file=.env.local ...).'); process.exit(1); }

const EMAIL = 'dev-preview-admin@efd.local';
const PASSWORD = 'DevPreview!2026';

const client = new MongoClient(uri);
await client.connect();
try {
  const users = client.db(DB).collection('users');
  const existing = await users.findOne({ email: { $regex: new RegExp(`^${EMAIL}$`, 'i') } });
  const password = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();
  const set = {
    userID: existing?.userID || `dev-preview-${randomUUID().slice(0, 8)}`,
    firstName: 'Dev', lastName: 'Preview',
    email: EMAIL,
    password,
    role: 'admin',
    status: 'verified',
    updatedAt: now,
  };
  await users.updateOne(
    { email: { $regex: new RegExp(`^${EMAIL}$`, 'i') } },
    { $set: set, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  console.log(`✔ ${existing ? 'updated' : 'created'} ${EMAIL} on ${DB} (role=admin, status=verified, userID=${set.userID})`);
} finally {
  await client.close();
}
