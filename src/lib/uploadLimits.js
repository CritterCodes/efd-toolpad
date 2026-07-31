/**
 * Upload size limits — the serverless body ceiling, made visible.
 *
 * Every upload in this app posts the whole file through a Next.js route handler, and a serverless
 * function's request body is capped at ~4.5 MB on Vercel. Nothing checked that, so an oversized file
 * produced an opaque failure with no hint of the real cause: a 91 MB `tireRing.stl` failed on both the
 * design CAD tab and the CAD work-order route, while the GLB of the same model (a fraction of the size)
 * uploaded fine — which looked like "STL is broken" rather than "the file is too big".
 *
 * This is a STOPGAP that makes the wall legible. The real fix is a presigned PUT straight to MinIO so
 * the file never passes through the function at all — `@aws-sdk/s3-request-presigner` is already
 * available and MinIO supports it with `forcePathStyle`. That also needs MinIO CORS to allow PUT from
 * the admin origin.
 *
 * DO NOT ADVISE SHRINKING AN STL HERE (owner, 2026-07-31). The STL on a design or a CAD work order is
 * the MANUFACTURING file — it is uploaded here and then sent to Carrera to cast from. Its resolution is
 * a product-quality decision, not a transport one, and telling someone to re-export it smaller to fit
 * an upload limit risks a degraded physical piece. The viewer already has its own small file
 * (`designModel.glbUrl`); the STL is manufacturing + volume math only.
 *
 * So there is NO user-side workaround: a 91 MB manufacturing STL is legitimate and must upload as-is.
 * Presigned PUT straight to MinIO is the required fix, not an optimisation. Until it lands this guard
 * exists only to explain the wall instead of failing opaquely — it must not imply the file is wrong.
 */

/** Vercel's serverless request-body ceiling. Real limit is ~4.5 MB; leave headroom for the multipart envelope. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Human-readable size, e.g. "91.4 MB". PURE. */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * Rough triangle count of a BINARY STL from its byte size — 84-byte header + 50 bytes per triangle.
 * Turns an unhelpful "too big" into the number the CAD author can actually act on. PURE.
 */
export function estimateStlTriangles(bytes) {
  const n = Math.max(0, Math.round(((Number(bytes) || 0) - 84) / 50));
  if (n >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Reject a file that cannot survive the serverless body limit, with a message that explains the cause
 * and the way out. Returns null when the file is fine. PURE.
 */
export function uploadSizeError(file, { max = MAX_UPLOAD_BYTES } = {}) {
  const size = Number(file?.size);
  if (!Number.isFinite(size) || size <= max) return null;
  const isStl = /\.stl$/i.test(file?.name || '');
  return [
    `${file?.name || 'This file'} is ${formatBytes(size)} — over the current ${formatBytes(max)} upload limit.`,
    // NEVER suggest re-exporting an STL smaller: it's the manufacturing file Carrera casts from, so its
    // resolution is a product decision. The limit is our transport problem, not the file's fault.
    isStl
      ? 'This is a server limit, not a problem with your file — a manufacturing STL is meant to be this size. Direct upload for large CAD files is being built; until then it can\'t go through this form.'
      : 'Try a smaller or more compressed version, or wait for direct upload.',
  ].join(' ');
}
