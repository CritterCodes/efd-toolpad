import { describe, it, expect } from 'vitest';
import { createBinaryStlVolumeAccumulator, mm3ToCm3, looksAscii } from '@/lib/stlVolumeStream';

/**
 * STREAMING STL VOLUME — the authoritative pricing input.
 *
 * Owner, 2026-07-31: "we cant rely on the client to enter the volume, it has to be calculated." Volume
 * feeds `estimateMetalCost`, which sets the mounting cost and therefore the RETAIL PRICE. So it must be
 * measured server-side, and it must be right.
 *
 * Streaming rather than buffering because a real manufacturing STL here is 91 MB ≈ 1.9M triangles;
 * `lib/stlParser` materialises every vertex first. The hazard streaming introduces is CHUNK BOUNDARIES —
 * a triangle split across two network chunks must still be counted exactly once, which is what most of
 * these tests exercise.
 *
 * Volumes are checked against shapes whose exact volume is known analytically, not against recorded
 * output, so a wrong implementation can't be blessed by its own result.
 */

/** Build a binary STL buffer from triangles: [[v1,v2,v3], ...] with v = [x,y,z]. */
function binaryStl(triangles) {
  const buf = Buffer.alloc(84 + triangles.length * 50);
  buf.write('test stl', 0, 'ascii');
  buf.writeUInt32LE(triangles.length, 80);
  triangles.forEach((tri, i) => {
    const o = 84 + i * 50;
    buf.writeFloatLE(0, o); buf.writeFloatLE(0, o + 4); buf.writeFloatLE(0, o + 8);   // normal, unused
    tri.flat().forEach((v, j) => buf.writeFloatLE(v, o + 12 + j * 4));
    buf.writeUInt16LE(0, o + 48);
  });
  return buf;
}

/** Closed unit cube (2 triangles per face), volume exactly 1 mm³. */
function unitCube() {
  const v = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const quads = [
    [0,3,2,1], // bottom
    [4,5,6,7], // top
    [0,1,5,4], // front
    [1,2,6,5], // right
    [2,3,7,6], // back
    [3,0,4,7], // left
  ];
  return quads.flatMap(([a,b,c,d]) => [[v[a],v[b],v[c]], [v[a],v[c],v[d]]]);
}

const volumeOf = (buffer, chunkSize = null) => {
  const acc = createBinaryStlVolumeAccumulator();
  if (!chunkSize) acc.push(buffer);
  else for (let i = 0; i < buffer.length; i += chunkSize) acc.push(buffer.subarray(i, i + chunkSize));
  return acc.result();
};

describe('volume is numerically correct', () => {
  it('measures a unit cube as exactly 1 mm³', () => {
    const { volumeMm3, triangles, complete } = volumeOf(binaryStl(unitCube()));
    expect(complete).toBe(true);
    expect(triangles).toBe(12);
    expect(volumeMm3).toBeCloseTo(1, 6);
  });

  it('scales with the cube (a 10mm cube is 1000 mm³ = 1 cm³)', () => {
    const scaled = unitCube().map((t) => t.map((v) => v.map((n) => n * 10)));
    const { volumeMm3 } = volumeOf(binaryStl(scaled));
    expect(volumeMm3).toBeCloseTo(1000, 3);
    expect(mm3ToCm3(volumeMm3)).toBe(1);
  });

  it('is winding-independent — a reversed mesh must not read as negative', () => {
    // Real CAD exports have inconsistent winding; a signed sum would otherwise price a piece at ~0.
    const flipped = unitCube().map(([a, b, c]) => [a, c, b]);
    expect(volumeOf(binaryStl(flipped)).volumeMm3).toBeCloseTo(1, 6);
  });

  it('is translation-invariant (the tetrahedron sum is about the origin)', () => {
    const moved = unitCube().map((t) => t.map(([x, y, z]) => [x + 50, y - 30, z + 7]));
    expect(volumeOf(binaryStl(moved)).volumeMm3).toBeCloseTo(1, 4);
  });
});

describe('chunk boundaries — the hazard streaming introduces', () => {
  const cube = binaryStl(unitCube());

  it('gives the same answer at every chunk size, including pathological ones', () => {
    // 1 byte at a time splits the header AND every triangle; 50 aligns exactly; 37 never aligns.
    for (const size of [1, 3, 17, 37, 49, 50, 51, 83, 84, 85, 128, 999]) {
      const { volumeMm3, triangles, complete } = volumeOf(cube, size);
      expect(complete, `chunk size ${size}`).toBe(true);
      expect(triangles, `chunk size ${size}`).toBe(12);
      expect(volumeMm3, `chunk size ${size}`).toBeCloseTo(1, 6);
    }
  });

  it('handles a header split across chunks', () => {
    const acc = createBinaryStlVolumeAccumulator();
    acc.push(cube.subarray(0, 40));    // less than the 84-byte header
    acc.push(cube.subarray(40));
    expect(acc.result().volumeMm3).toBeCloseTo(1, 6);
  });

  it('tolerates empty chunks between real ones', () => {
    const acc = createBinaryStlVolumeAccumulator();
    acc.push(Buffer.alloc(0));
    acc.push(cube.subarray(0, 200));
    acc.push(Buffer.alloc(0));
    acc.push(cube.subarray(200));
    expect(acc.result().volumeMm3).toBeCloseTo(1, 6);
  });
});

describe('refuses to guess', () => {
  it('returns null when the stream is TRUNCATED rather than a too-small volume', () => {
    // Half a file must not silently price as half a piece.
    const cube = binaryStl(unitCube());
    const { volumeMm3, complete, triangles, declaredTriangles } = volumeOf(cube.subarray(0, 84 + 6 * 50));
    expect(complete).toBe(false);
    expect(volumeMm3).toBeNull();
    expect(triangles).toBe(6);
    expect(declaredTriangles).toBe(12);
  });

  it('returns null for a header-only file and for nothing at all', () => {
    const empty = Buffer.alloc(84); empty.writeUInt32LE(0, 80);
    expect(volumeOf(empty).volumeMm3).toBeNull();
    expect(volumeOf(Buffer.alloc(0)).volumeMm3).toBeNull();
    expect(volumeOf(Buffer.alloc(10)).volumeMm3).toBeNull();
  });

  it('detects ASCII STL, which this accumulator cannot sum', () => {
    expect(looksAscii(Buffer.from('solid ring\nfacet normal'))).toBe(true);
    expect(looksAscii(Buffer.from('SOLID RING'))).toBe(true);
    expect(looksAscii(binaryStl(unitCube()))).toBe(false);
  });
});

describe('mm3ToCm3', () => {
  it('converts and rounds to 3dp', () => {
    expect(mm3ToCm3(1000)).toBe(1);
    expect(mm3ToCm3(1234.5)).toBe(1.235);
    expect(mm3ToCm3(2867)).toBe(2.867);
  });
  it('rejects zero, negative and junk rather than returning 0', () => {
    // A 0 would read as "free metal"; null means "unknown" and shows as not-calculated.
    for (const v of [0, -5, NaN, undefined, null, 'abc']) expect(mm3ToCm3(v)).toBeNull();
  });
});
