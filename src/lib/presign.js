import { createHash, createHmac } from 'crypto';
import { STORAGE_BUCKET, storageUrl } from '@/lib/storage';

/**
 * AWS SigV4 presigned PUT URLs — hand-rolled, zero new dependencies.
 *
 * WHY NOT `@aws-sdk/s3-request-presigner`: it can't be installed. Adding any dependency runs a
 * workspace-wide resolve, and this workspace currently cannot resolve `@crittercodes/refrakt@^1.14.0`
 * from the private GitHub registry without NODE_AUTH_TOKEN (unauthenticated, the registry only offers
 * 1.10.1). So `pnpm add` fails on an unrelated package. SigV4 query-signing is a short, well-specified
 * algorithm, so implementing it directly is cheaper than unblocking the install.
 *
 * WHY PRESIGNED UPLOADS AT ALL: every upload used to post the whole file through a Next.js route, and a
 * serverless request body is capped at ~4.5 MB. A design's or CAD work order's STL is the MANUFACTURING
 * file that gets sent to Carrera to cast from — a real one measured 91 MB — so its size is a
 * product-quality decision and cannot be reduced to fit a transport limit. A presigned PUT lets the
 * browser send the file straight to MinIO, so the function never touches the bytes.
 *
 * Verified against the live MinIO (RELEASE.2025-09-07, path-style) which already returns
 * `Access-Control-Allow-Methods: PUT` for the admin origin, so no bucket CORS change is needed.
 */

const ALGORITHM = 'AWS4-HMAC-SHA256';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';   // the browser holds the bytes; we can't hash them here

const sha256Hex = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value, 'utf8').digest();

/** RFC 3986 encoding. S3 requires each path SEGMENT encoded but `/` left intact. */
function uriEncode(value, encodeSlash = true) {
  const encoded = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return encodeSlash ? encoded : encoded.replace(/%2F/g, '/');
}

/** `20260731T193326Z` and `20260731`. */
function stamps(now) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function resolveConfig() {
  const endpoint = process.env.MINIO_ENDPOINT;
  if (endpoint) {
    const useSsl = process.env.MINIO_USE_SSL === 'true';
    const port = process.env.MINIO_PORT || 9000;
    // Sign against the PUBLIC host when there is one: the browser resolves that name, and SigV4 signs
    // the Host header — signing the internal host would make every browser PUT fail the signature.
    const publicUrl = process.env.MINIO_PUBLIC_URL;
    const base = publicUrl || `${useSsl ? 'https' : 'http'}://${endpoint}:${port}`;
    return {
      base: base.replace(/\/$/, ''),
      region: 'us-east-1',                 // MinIO ignores region but SigV4 requires one
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
      pathStyle: true,
    };
  }
  const region = process.env.AWS_REGION;
  return {
    base: `https://${STORAGE_BUCKET}.s3.${region}.amazonaws.com`,
    region,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    pathStyle: false,
  };
}

/**
 * Presign a PUT for one object key.
 * @returns {{ uploadUrl:string, publicUrl:string, key:string, expiresIn:number, headers:object }}
 */
export function presignPut(key, { expiresIn = 900, contentType = null, now = new Date() } = {}) {
  const cfg = resolveConfig();
  if (!cfg.accessKey || !cfg.secretKey) throw new Error('Storage credentials are not configured.');
  if (!STORAGE_BUCKET) throw new Error('Storage bucket is not configured.');

  const url = new URL(cfg.base);
  const host = url.host;
  const canonicalUri = cfg.pathStyle
    ? `/${STORAGE_BUCKET}/${uriEncode(key, false)}`
    : `/${uriEncode(key, false)}`;

  const { amzDate, dateStamp } = stamps(now);
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;

  // Content-Type must be SIGNED if the browser will send it, or S3 rejects the PUT.
  const signedHeaderNames = contentType ? ['content-type', 'host'] : ['host'];
  const canonicalHeaders = (contentType
    ? `content-type:${contentType}\nhost:${host}\n`
    : `host:${host}\n`);

  const query = {
    'X-Amz-Algorithm': ALGORITHM,
    'X-Amz-Credential': `${cfg.accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': signedHeaderNames.join(';'),
  };
  // Canonical query string must be sorted by key, with both key and value URI-encoded.
  const canonicalQuery = Object.keys(query).sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join('&');

  const canonicalRequest = [
    'PUT', canonicalUri, canonicalQuery, canonicalHeaders,
    signedHeaderNames.join(';'), UNSIGNED_PAYLOAD,
  ].join('\n');

  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join('\n');

  const signingKey = ['AWS4' + cfg.secretKey, dateStamp, cfg.region, 's3', 'aws4_request']
    .reduce((k, part) => hmac(k, part));
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return {
    uploadUrl: `${url.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`,
    publicUrl: storageUrl(key),
    key,
    expiresIn,
    // Exactly what the browser must send — anything else breaks the signature.
    headers: contentType ? { 'Content-Type': contentType } : {},
  };
}

/**
 * Build a safe object key. The SERVER decides this, never the client: a caller-supplied key on a signed
 * URL would let an authenticated artisan write anywhere in the bucket, including over someone else's
 * objects.
 */
export function buildUploadKey({ folder, filename, prefix = '' }) {
  // Folder: `.` is not in the allowlist, so any `..` already collapses to `__` — no traversal.
  const safeFolder = String(folder || 'misc').replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/^\/+|\/+$/g, '');
  // Filename: `/` is stripped, so the name can never escape the folder, and the timestamp prefix means
  // it can never begin with a dot. Collapsing runs of dots is therefore cosmetic, not a security fix —
  // it just keeps `../../evil.stl` from being stored as `.._.._evil.stl`.
  const safeName = String(filename || 'file')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(-120);
  return `${safeFolder}/${prefix}${Date.now()}-${safeName}`;
}
