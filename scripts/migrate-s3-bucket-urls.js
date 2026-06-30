/**
 * Scrub legacy AWS-S3 image URLs → MinIO (tech-debt #28).
 *
 * Migrated/legacy docs carry `https://<bucket>.s3.<region>.amazonaws.com/<key>` URLs that no
 * longer resolve now that storage is MinIO. This rewrites every such string (recursively, any
 * field, any collection) to `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/<key>`, preserving the key.
 *
 *   node scripts/migrate-s3-bucket-urls.js            # DRY RUN — survey only, no writes
 *   node scripts/migrate-s3-bucket-urls.js --verify   # HEAD-check every target exists on MinIO (no writes)
 *   node scripts/migrate-s3-bucket-urls.js --apply    # write the changes
 *
 * ALWAYS run --verify and confirm 0 missing before --apply: repointing a URL whose object
 * isn't on MinIO would turn a (possibly still-working) S3 image into a 404.
 *
 * Reads MONGODB_URI / MONGO_DB_NAME / MINIO_PUBLIC_URL / MINIO_BUCKET from .env.local.
 */
import fs from 'node:fs';
import { MongoClient } from 'mongodb';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');
const VERIFY = process.argv.includes('--verify');
const COPY = process.argv.includes('--copy'); // copy missing objects S3 → MinIO (no DB writes)
const targetUrls = new Set(); // every distinct MinIO URL we'd point at (for existence checks)

// --- env (no secret values printed) ---
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
const { MONGODB_URI, MONGO_DB_NAME } = env;
const MINIO_PUBLIC_URL = (env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');
const MINIO_BUCKET = env.MINIO_BUCKET || env.AWS_BUCKET_NAME;
if (!MONGODB_URI || !MONGO_DB_NAME || !MINIO_PUBLIC_URL || !MINIO_BUCKET) {
  console.error('Missing MONGODB_URI / MONGO_DB_NAME / MINIO_PUBLIC_URL / MINIO_BUCKET');
  process.exit(1);
}

const MINIO_PREFIX = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/`;
const isS3Url = (s) => typeof s === 'string' && /\.amazonaws\.com\//.test(s);

/** AWS S3 URL → MinIO URL (key preserved). Returns null if not convertible. */
function toMinio(url) {
  try {
    const u = new URL(url);
    let key = u.pathname.replace(/^\//, '');
    // path-style: s3.<region>.amazonaws.com/<bucket>/<key>  → drop the bucket segment
    if (/^s3[.-]/.test(u.hostname)) {
      const i = key.indexOf('/');
      key = i >= 0 ? key.slice(i + 1) : key;
    }
    // virtual-hosted: <bucket>.s3.<region>.amazonaws.com/<key> → pathname is already the key
    if (!key) return null;
    return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;
  } catch { return null; }
}

/** Recursively rewrite S3 URL strings in-place; returns count of strings changed + sample pairs. */
function rewrite(node, samples, stats, path = '') {
  let changed = 0;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (isS3Url(node[i])) {
        const next = toMinio(node[i]);
        if (next && next !== node[i]) { if (samples.length < 5) samples.push([node[i], next]); stats[`${path}[]`] = (stats[`${path}[]`] || 0) + 1; targetUrls.add(next); node[i] = next; changed++; }
      } else if (node[i] && typeof node[i] === 'object') changed += rewrite(node[i], samples, stats, `${path}[]`);
    }
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const p = path ? `${path}.${k}` : k;
      if (isS3Url(node[k])) {
        const next = toMinio(node[k]);
        if (next && next !== node[k]) { if (samples.length < 5) samples.push([node[k], next]); stats[p] = (stats[p] || 0) + 1; targetUrls.add(next); node[k] = next; changed++; }
      } else if (node[k] && typeof node[k] === 'object') changed += rewrite(node[k], samples, stats, p);
    }
  }
  return changed;
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db(MONGO_DB_NAME);
const collections = (await db.listCollections().toArray()).map((c) => c.name);

console.log(`Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'} | db=${MONGO_DB_NAME} | MinIO=${MINIO_PUBLIC_URL}/${MINIO_BUCKET}\n`);
let grandDocs = 0, grandUrls = 0, grandWritten = 0;
const allSamples = [];

for (const name of collections) {
  const col = db.collection(name);
  const cursor = col.find({});
  let docsAffected = 0, urlsInCol = 0, written = 0;
  const fieldStats = {};
  for await (const doc of cursor) {
    const samples = [];
    const stats = {};
    const n = rewrite(doc, samples, stats);
    if (n > 0) {
      docsAffected++; urlsInCol += n;
      for (const [k, v] of Object.entries(stats)) fieldStats[k] = (fieldStats[k] || 0) + v;
      if (allSamples.length < 6) allSamples.push(...samples.slice(0, 1));
      if (APPLY) { await col.replaceOne({ _id: doc._id }, doc); written++; }
    }
  }
  if (docsAffected > 0) {
    grandDocs += docsAffected; grandUrls += urlsInCol; grandWritten += written;
    console.log(`  ${name}: ${docsAffected} docs, ${urlsInCol} URLs${APPLY ? ` (wrote ${written})` : ''}`);
    console.log(`     fields: ${Object.entries(fieldStats).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  }
}

console.log(`\nTOTAL: ${grandDocs} docs, ${grandUrls} S3 URLs${APPLY ? ` — wrote ${grandWritten} docs` : ' (dry run — nothing written)'}`);
if (allSamples.length) { console.log('\nSample rewrites (old → new):'); for (const [a, b] of allSamples) console.log(`  ${a}\n  → ${b}`); }

if (VERIFY) {
  const urls = [...targetUrls];
  console.log(`\nVerifying ${urls.length} distinct target objects exist on MinIO (HEAD)...`);
  let present = 0; const missingUrls = [];
  const CONC = 12;
  for (let i = 0; i < urls.length; i += CONC) {
    const results = await Promise.all(urls.slice(i, i + CONC).map(async (u) => {
      try { const r = await fetch(u, { method: 'HEAD' }); return { u, ok: r.status === 200 }; }
      catch { return { u, ok: false }; }
    }));
    for (const r of results) { if (r.ok) present++; else missingUrls.push(r.u); }
  }
  console.log(`  on MinIO: present ${present} | missing ${missingUrls.length}`);

  // For everything missing on MinIO, ask S3 authoritatively (headObject: 404=gone, 403=denied).
  let recoverable = 0, gone = 0, denied = 0; const recoverableSamples = [];
  if (missingUrls.length) {
    const s3 = new S3Client({ region: env.AWS_REGION, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });
    console.log(`  checking those ${missingUrls.length} on S3 (${env.AWS_BUCKET_NAME})...`);
    for (let i = 0; i < missingUrls.length; i += CONC) {
      await Promise.all(missingUrls.slice(i, i + CONC).map(async (u) => {
        const key = u.startsWith(MINIO_PREFIX) ? u.slice(MINIO_PREFIX.length) : null;
        if (!key) { gone++; return; }
        try { await s3.send(new HeadObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key })); recoverable++; if (recoverableSamples.length < 5) recoverableSamples.push(key); }
        catch (e) { const code = e?.$metadata?.httpStatusCode; if (code === 403) denied++; else gone++; }
      }));
    }
    console.log(`  of the missing: on S3 (recoverable) ${recoverable} | gone (404) ${gone} | access-denied (403) ${denied}`);
    if (recoverableSamples.length) { console.log('  recoverable sample keys:'); recoverableSamples.forEach((k) => console.log('    ' + k)); }
  }

  console.log(missingUrls.length === 0
    ? '\n✅ Every target exists on MinIO — safe to --apply.'
    : recoverable > 0
      ? `\n�a️  ${recoverable} objects are still on S3 → copy S3→MinIO first, re-verify, then --apply. (${gone} gone, ${denied} denied.)`
      : `\n⛔ ${missingUrls.length} missing on MinIO and not recoverable from S3 (gone ${gone}, denied ${denied}). URL scrub can't fix these.`);
}
if (COPY) {
  const urls = [...targetUrls];
  const minio = new S3Client({
    region: 'us-east-1',
    endpoint: `${env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT || 9000}`,
    forcePathStyle: true,
    credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
  });
  const s3 = new S3Client({ region: env.AWS_REGION, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });

  console.log(`\nCopy mode: finding objects missing on MinIO among ${urls.length} targets...`);
  const missingKeys = [];
  const CONC = 12;
  for (let i = 0; i < urls.length; i += CONC) {
    const res = await Promise.all(urls.slice(i, i + CONC).map(async (u) => {
      try { const r = await fetch(u, { method: 'HEAD' }); return { u, ok: r.status === 200 }; } catch { return { u, ok: false }; }
    }));
    for (const r of res) if (!r.ok && r.u.startsWith(MINIO_PREFIX)) missingKeys.push(r.u.slice(MINIO_PREFIX.length));
  }
  console.log(`  ${missingKeys.length} objects to copy S3 → MinIO`);
  let copied = 0, failed = 0; const failSamples = [];
  for (let i = 0; i < missingKeys.length; i += 6) {
    await Promise.all(missingKeys.slice(i, i + 6).map(async (key) => {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key }));
        const body = await obj.Body.transformToByteArray();
        await minio.send(new PutObjectCommand({ Bucket: MINIO_BUCKET, Key: key, Body: body, ContentType: obj.ContentType || 'application/octet-stream' }));
        copied++;
      } catch (e) { failed++; if (failSamples.length < 8) failSamples.push(`${key} :: ${e.name || e.message}`); }
    }));
    process.stdout.write(`\r  copied ${copied}/${missingKeys.length} (failed ${failed})...`);
  }
  console.log(`\n  DONE: copied ${copied}, failed ${failed}`);
  if (failSamples.length) { console.log('  failures:'); failSamples.forEach((f) => console.log('    ' + f)); }
  console.log('\nNext: re-run with --verify (expect 0 missing), then --apply.');
}
await client.close();
