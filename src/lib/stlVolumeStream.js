import { GetObjectCommand } from '@aws-sdk/client-s3';
import { storageClient, STORAGE_BUCKET } from '@/lib/storage';

/**
 * Compute an STL's volume by STREAMING it out of storage — server-side, authoritative.
 *
 * WHY THIS EXISTS (owner, 2026-07-31): "we cant rely on the client to enter the volume, it has to be
 * calculated." Volume feeds `estimateMetalCost`, which sets the mounting cost and therefore the retail
 * price, so a browser-supplied number is both untrustworthy (an artisan could understate it and lower
 * their own cost) and unreliable (the browser parser can fail outright on a very dense model). Since
 * direct-to-MinIO upload means the request never carries the bytes, the server fetches them itself.
 *
 * WHY STREAMING rather than reusing `lib/stlParser`: that one materialises every vertex before summing.
 * A real manufacturing STL here is 91 MB ≈ 1.9 MILLION triangles, so buffering means ~17M floats held
 * at once. Volume needs no geometry retained — the signed-tetrahedron sum is per-triangle — so this
 * accumulates as bytes arrive and holds only a partial record across chunk boundaries.
 *
 * Volume = Σ v1 · (v2 × v3) / 6 over all triangles. Uses the absolute value, so it is correct
 * regardless of triangle winding, and returns null rather than a wrong number on malformed input.
 */

const HEADER_BYTES = 84;      // 80-byte header + uint32 triangle count
const TRIANGLE_BYTES = 50;    // 12 float32 (normal + 3 vertices) + uint16 attribute

/** mm³ → cm³ at 3dp. STLs are authored in mm; the cost estimator works in cm³. */
export function mm3ToCm3(mm3) {
  if (!Number.isFinite(mm3) || mm3 <= 0) return null;
  return Math.round((mm3 / 1000) * 1000) / 1000;
}

/**
 * Signed-tetrahedron volume accumulator for BINARY STL, fed arbitrary byte chunks.
 * Exposed for testing: it is the whole numeric core, and it must be correct across chunk splits.
 */
export function createBinaryStlVolumeAccumulator() {
  let headerSeen = false;
  let declaredTriangles = 0;
  let trianglesRead = 0;
  let volumeMm3 = 0;
  let carry = Buffer.alloc(0);

  return {
    push(chunk) {
      let buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;

      if (!headerSeen) {
        if (buf.length < HEADER_BYTES) { carry = buf; return; }
        declaredTriangles = buf.readUInt32LE(80);
        buf = buf.subarray(HEADER_BYTES);
        headerSeen = true;
      }

      let offset = 0;
      while (buf.length - offset >= TRIANGLE_BYTES) {
        // Skip the 12-byte normal; the three vertices follow.
        const b = offset + 12;
        const v1x = buf.readFloatLE(b), v1y = buf.readFloatLE(b + 4), v1z = buf.readFloatLE(b + 8);
        const v2x = buf.readFloatLE(b + 12), v2y = buf.readFloatLE(b + 16), v2z = buf.readFloatLE(b + 20);
        const v3x = buf.readFloatLE(b + 24), v3y = buf.readFloatLE(b + 28), v3z = buf.readFloatLE(b + 32);
        // v1 · (v2 × v3)
        volumeMm3 += (
          v1x * (v2y * v3z - v2z * v3y)
          + v1y * (v2z * v3x - v2x * v3z)
          + v1z * (v2x * v3y - v2y * v3x)
        ) / 6;
        trianglesRead += 1;
        offset += TRIANGLE_BYTES;
      }
      // Keep only the incomplete tail for the next chunk.
      carry = offset < buf.length ? Buffer.from(buf.subarray(offset)) : Buffer.alloc(0);
    },

    /** @returns {{ volumeMm3:number|null, triangles:number, declaredTriangles:number, complete:boolean }} */
    result() {
      const complete = headerSeen && trianglesRead === declaredTriangles && trianglesRead > 0;
      return {
        volumeMm3: complete ? Math.abs(volumeMm3) : null,
        triangles: trianglesRead,
        declaredTriangles,
        complete,
      };
    },
  };
}

/** Binary STLs do NOT start with "solid"; ASCII ones do. */
export function looksAscii(firstBytes) {
  return Buffer.from(firstBytes).subarray(0, 5).toString('ascii').toLowerCase() === 'solid';
}

/**
 * Stream an object out of storage and return its volume in cm³, or null.
 *
 * BEST-EFFORT BY CONTRACT: every failure path returns null rather than throwing. Callers record the STL
 * and advance the work order regardless — a volume is a pricing convenience, and losing it must never
 * strand a work order the way an unguarded parse once did.
 */
export async function stlVolumeCm3FromStorage(key, { maxBytes = 600 * 1024 * 1024 } = {}) {
  try {
    const res = await storageClient.send(new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }));
    const body = res.Body;
    if (!body || typeof body[Symbol.asyncIterator] !== 'function') return null;

    const acc = createBinaryStlVolumeAccumulator();
    let seen = 0;
    let first = true;

    for await (const chunk of body) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (first) {
        first = false;
        // ASCII STL can't be summed this way. Rare here (Shapr3D writes binary), and a 91 MB ASCII file
        // shouldn't be buffered just to price it — so decline rather than risk the memory.
        if (looksAscii(buf)) {
          console.warn(`[stl] ${key} looks like ASCII STL — volume not computed (binary expected)`);
          return null;
        }
      }
      seen += buf.length;
      if (seen > maxBytes) {
        console.warn(`[stl] ${key} exceeded ${maxBytes} bytes while streaming — volume not computed`);
        return null;
      }
      acc.push(buf);
    }

    const { volumeMm3, triangles, declaredTriangles, complete } = acc.result();
    if (!complete) {
      console.warn(`[stl] ${key} triangle count mismatch (read ${triangles}, header says ${declaredTriangles}) — volume not computed`);
      return null;
    }
    return mm3ToCm3(volumeMm3);
  } catch (e) {
    console.error(`[stl] volume stream failed for ${key}:`, e?.message || e);
    return null;
  }
}
