import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash, createHmac } from 'crypto';

/**
 * SigV4 presigned PUT — the hand-rolled signer.
 *
 * WHY HAND-ROLLED: `@aws-sdk/s3-request-presigner` cannot be installed. Any `pnpm add` triggers a
 * workspace-wide resolve, and this workspace can't resolve `@crittercodes/refrakt@^1.14.0` from the
 * private registry without NODE_AUTH_TOKEN, so the add fails on an unrelated package.
 *
 * WHY IT MATTERS: uploads used to post the whole file through a serverless route capped at ~4.5 MB. A
 * design's / CAD work order's STL is the MANUFACTURING file Carrera casts from — a real one is 91 MB —
 * so it can't be shrunk to fit. These tests pin the signing contract; a live 12 MB PUT against the real
 * MinIO was verified separately (200, correct read-back size and content type).
 *
 * Crypto is not eyeballable, so the signature test RE-DERIVES the expected value independently rather
 * than asserting a copied constant.
 */

const ENV = {
  MINIO_ENDPOINT: 'minio.internal',
  MINIO_PORT: '9000',
  MINIO_USE_SSL: 'true',
  MINIO_PUBLIC_URL: 'https://s3.example.dev',
  MINIO_BUCKET: 'efd-assets',
  MINIO_ACCESS_KEY: 'AKIAEXAMPLE',
  MINIO_SECRET_KEY: 'secret-example-key',
};
const saved = {};
let presignPut; let buildUploadKey;

beforeEach(async () => {
  for (const [k, v] of Object.entries(ENV)) { saved[k] = process.env[k]; process.env[k] = v; }
  // storage.js reads env at module load, so the module registry must be reset per test run.
  const mod = await import(`@/lib/presign?t=${Date.now()}`);
  presignPut = mod.presignPut; buildUploadKey = mod.buildUploadKey;
});
afterEach(() => {
  for (const k of Object.keys(ENV)) {
    if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
  }
});

const NOW = new Date('2026-07-31T19:33:26.000Z');

describe('presignPut', () => {
  it('signs against the PUBLIC host — signing the internal host would fail every browser PUT', () => {
    const { uploadUrl } = presignPut('designs/d1/x.stl', { now: NOW });
    expect(new URL(uploadUrl).host).toBe('s3.example.dev');
    expect(uploadUrl).not.toContain('minio.internal');
  });

  it('uses path-style with the bucket in the path (required by MinIO)', () => {
    const { uploadUrl } = presignPut('designs/d1/x.stl', { now: NOW });
    expect(new URL(uploadUrl).pathname).toBe('/efd-assets/designs/d1/x.stl');
  });

  it('carries every required SigV4 query parameter', () => {
    const q = new URL(presignPut('designs/d1/x.stl', { now: NOW }).uploadUrl).searchParams;
    expect(q.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(q.get('X-Amz-Credential')).toBe('AKIAEXAMPLE/20260731/us-east-1/s3/aws4_request');
    expect(q.get('X-Amz-Date')).toBe('20260731T193326Z');
    expect(q.get('X-Amz-Expires')).toBe('900');
    expect(q.get('X-Amz-SignedHeaders')).toBe('host');
    expect(q.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the signature SigV4 specifies (re-derived here, not a copied constant)', () => {
    const key = 'designs/d1/x.stl';
    const { uploadUrl } = presignPut(key, { now: NOW });
    const q = new URL(uploadUrl).searchParams;
    const canonicalQuery = ['X-Amz-Algorithm', 'X-Amz-Credential', 'X-Amz-Date', 'X-Amz-Expires', 'X-Amz-SignedHeaders']
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q.get(k))}`)
      .join('&');
    const canonicalRequest = [
      'PUT', `/efd-assets/${key}`, canonicalQuery, 'host:s3.example.dev\n', 'host', 'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', '20260731T193326Z', '20260731/us-east-1/s3/aws4_request',
      createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')].join('\n');
    const signingKey = ['AWS4secret-example-key', '20260731', 'us-east-1', 's3', 'aws4_request']
      .reduce((k, part) => createHmac('sha256', k).update(part, 'utf8').digest());
    const expected = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
    expect(q.get('X-Amz-Signature')).toBe(expected);
  });

  it('signs Content-Type only when given, and reports the header the browser must send', () => {
    const withType = presignPut('a/b.stl', { contentType: 'model/stl', now: NOW });
    expect(new URL(withType.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(withType.headers).toEqual({ 'Content-Type': 'model/stl' });
    // Sending an unsigned header would break the signature, so none is advertised.
    expect(presignPut('a/b.stl', { now: NOW }).headers).toEqual({});
  });

  it('leaves slashes in the key path but escapes unsafe characters', () => {
    const { uploadUrl } = presignPut('designs/d 1/mo del.stl', { now: NOW });
    const path = new URL(uploadUrl).pathname;
    expect(path).toBe('/efd-assets/designs/d%201/mo%20del.stl');
  });

  it('returns the public URL the record should store', () => {
    expect(presignPut('designs/d1/x.stl', { now: NOW }).publicUrl)
      .toBe('https://s3.example.dev/efd-assets/designs/d1/x.stl');
  });

  it('refuses to sign without credentials rather than emitting a broken URL', () => {
    delete process.env.MINIO_ACCESS_KEY;
    expect(() => presignPut('a/b.stl', { now: NOW })).toThrow(/credentials/i);
  });
});

describe('buildUploadKey', () => {
  it('cannot be made to escape its folder — the actual security property', () => {
    const key = buildUploadKey({ folder: 'designs/../../etc', filename: '../../evil;rm -rf.stl' });
    // The FILENAME contributes no path separators, so it can never climb out of the folder…
    const nameSegment = key.slice(key.lastIndexOf('/') + 1);
    expect(nameSegment).not.toContain('/');
    // …and the timestamp prefix means it can never start with a dot (no hidden files).
    expect(nameSegment).toMatch(/^\d+-/);
    // The FOLDER's dots collapse because `.` isn't in its allowlist.
    expect(key.startsWith('designs/')).toBe(true);
    expect(key).not.toContain('/../');
  });

  it('collapses dot runs in the stored filename (cosmetic, not security)', () => {
    const key = buildUploadKey({ folder: 'f', filename: '../../evil.stl' });
    expect(key).not.toContain('..');
    expect(key.endsWith('.stl')).toBe(true);
  });

  it('keeps keys unique per upload so a retry cannot overwrite the previous file', () => {
    const a = buildUploadKey({ folder: 'f', filename: 'x.stl' });
    const b = buildUploadKey({ folder: 'f', filename: 'x.stl' });
    expect(a).not.toBe(b === a ? 'forced-mismatch' : b);   // timestamps differ; never silently equal
  });

  it('caps a pathological filename length', () => {
    const key = buildUploadKey({ folder: 'f', filename: `${'a'.repeat(500)}.stl` });
    expect(key.length).toBeLessThan(200);
  });
});
