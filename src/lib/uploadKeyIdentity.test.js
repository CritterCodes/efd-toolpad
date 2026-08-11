import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * INCIDENT: "That file does not belong to this work order." — a 91 MB STL uploaded successfully and
 * then attach-stl refused it with a 403.
 *
 * CAUSE. The client reconstructed the storage key from the public url:
 *     new URL(url).pathname.split('/').slice(2).join('/')     // "strip /<bucket>/"
 * That hardcodes "exactly one path segment precedes the key". storageUrl() builds
 * `${MINIO_PUBLIC_URL}/${BUCKET}/${key}`, so the assumption holds only while MINIO_PUBLIC_URL has no
 * path of its own. Give the base a path — a CDN prefix, a subpath — and every segment shifts, the
 * derived key is wrong, and attachCadStl's `key.startsWith('production/pieces/<sourceID>/')` check
 * correctly rejects it. The upload had worked; only the reference was wrong.
 *
 * It passed local testing because the dev MINIO_PUBLIC_URL is a bare origin, so the arithmetic
 * happened to work — the bug was latent in the ENVIRONMENT, not visible in the code path.
 *
 * FIX: the presign response already carries the exact key; directUpload returns it and callers use it
 * verbatim. These tests pin that the key is passed through, and demonstrate the derivation that must
 * never come back.
 */

const KEY = 'production/pieces/piece-123/stl/1700000000000-model.stl';
const ORIGINAL_ENV = { ...process.env };

// The derivation that caused the incident, kept here as the thing being ruled out.
const deriveKeyFromUrl = (url) => new URL(url).pathname.split('/').slice(2).join('/');

async function freshPresign() {
  vi.resetModules();
  return import('./presign');
}

beforeEach(() => {
  process.env.MINIO_ENDPOINT = 'storage.internal';
  process.env.MINIO_PORT = '9000';
  process.env.MINIO_USE_SSL = 'true';
  process.env.MINIO_ACCESS_KEY = 'test-access';
  process.env.MINIO_SECRET_KEY = 'test-secret';
  process.env.MINIO_BUCKET = 'efd-repair-images';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('presign returns the authoritative key', () => {
  it('hands back exactly the key it signed, for a bare-origin public url', async () => {
    process.env.MINIO_PUBLIC_URL = 'https://s3.example.dev';
    const { presignPut } = await freshPresign();
    expect(presignPut(KEY, { contentType: 'model/stl' }).key).toBe(KEY);
  });

  it('hands back exactly the key it signed even when the public base carries a PATH', async () => {
    // The production-shaped case that broke.
    process.env.MINIO_PUBLIC_URL = 'https://cdn.example.dev/storage';
    const { presignPut } = await freshPresign();
    expect(presignPut(KEY, { contentType: 'model/stl' }).key).toBe(KEY);
  });
});

describe('the derivation that caused the 403', () => {
  it('happens to be correct when the public base has NO path — why it passed locally', async () => {
    process.env.MINIO_PUBLIC_URL = 'https://s3.example.dev';
    const { presignPut } = await freshPresign();
    const signed = presignPut(KEY, { contentType: 'model/stl' });
    expect(deriveKeyFromUrl(signed.publicUrl)).toBe(KEY);   // the accident that hid the bug
  });

  it('is WRONG once the public base has a path — the production failure, reproduced', async () => {
    process.env.MINIO_PUBLIC_URL = 'https://cdn.example.dev/storage';
    const { presignPut } = await freshPresign();
    const signed = presignPut(KEY, { contentType: 'model/stl' });

    const derived = deriveKeyFromUrl(signed.publicUrl);
    expect(derived).not.toBe(signed.key);
    // And the wrongness is exactly what attachCadStl refuses: the prefix no longer matches.
    expect(derived.startsWith('production/pieces/piece-123/')).toBe(false);
    expect(signed.key.startsWith('production/pieces/piece-123/')).toBe(true);
  });

  it('is WRONG in virtual-host style too, where NO bucket segment precedes the key', async () => {
    // The other shape that triggers this: no MINIO_PUBLIC_URL, so storageUrl falls back to
    // https://<bucket>.s3.<region>.amazonaws.com/<key> — the bucket is in the HOST, not the path. The
    // derivation then strips the first real key segment ("production") instead of a bucket.
    delete process.env.MINIO_PUBLIC_URL;
    process.env.AWS_REGION = 'us-east-1';
    const { presignPut } = await freshPresign();
    const signed = presignPut(KEY, { contentType: 'model/stl' });

    expect(deriveKeyFromUrl(signed.publicUrl)).not.toBe(signed.key);
    expect(deriveKeyFromUrl(signed.publicUrl)).toBe('pieces/piece-123/stl/1700000000000-model.stl');
    expect(signed.key).toBe(KEY);
  });

  it('the signed key always satisfies the attach prefix check, whatever the base looks like', async () => {
    for (const base of ['https://s3.example.dev', 'https://cdn.example.dev/storage', 'https://x.dev/a/b/c']) {
      process.env.MINIO_PUBLIC_URL = base;
      const { presignPut } = await freshPresign();   // eslint-disable-line no-await-in-loop
      expect(presignPut(KEY).key.startsWith('production/pieces/piece-123/')).toBe(true);
    }
  });
});
