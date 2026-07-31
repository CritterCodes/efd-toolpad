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
 * CAD files are the reason this hurts. Shapr3D — the CAD tool in use here — exports BINARY STL and
 * offers no ASCII option, so the lever is the EXPORT RESOLUTION (tessellation quality), not the format.
 * Binary STL runs ~50 bytes per triangle, so the reported 91 MB file is ~1.8 MILLION triangles for a
 * wedding band; 50k–200k is ample. Advice has to point at export quality, or it isn't actionable.
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
    `${file?.name || 'This file'} is ${formatBytes(size)} — over the ${formatBytes(max)} upload limit.`,
    isStl
      // Shapr3D writes binary STL and has no ASCII option, so format is not the lever — export
      // resolution is. ~50 bytes/triangle means this size is a triangle-count problem.
      ? `That's roughly ${estimateStlTriangles(size)} triangles. Re-export at a lower resolution — a ring needs well under 200k.`
      : 'Try exporting a smaller or more compressed version.',
    'Direct large-file upload is coming; for now the file has to fit under the limit.',
  ].join(' ');
}
