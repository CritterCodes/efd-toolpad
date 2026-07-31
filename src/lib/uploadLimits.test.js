import { describe, it, expect } from 'vitest';
import { uploadSizeError, formatBytes, estimateStlTriangles, MAX_UPLOAD_BYTES } from '@/lib/uploadLimits';

/**
 * Reported 2026-07-31: a 91 MB `tireRing.stl` failed to upload on the design CAD/3D tab AND on the CAD
 * work-order route, while the GLB of the same model uploaded fine. That asymmetry read as "STL upload
 * is broken" — it was actually the serverless request-body ceiling (~4.5 MB), which nothing checked, so
 * the real cause was invisible.
 */

const file = (name, mb) => ({ name, size: Math.round(mb * 1024 * 1024) });

describe('uploadSizeError', () => {
  it('rejects the reported 91 MB STL and names the size', () => {
    const msg = uploadSizeError(file('tireRing.stl', 89.2));
    expect(msg).toContain('tireRing.stl');
    expect(msg).toContain('89.2 MB');
    expect(msg).toContain('4 MB');
  });

  it('NEVER tells an STL author to shrink the file — it is the manufacturing file Carrera casts from', () => {
    // Owner corrected this twice on 2026-07-31: first that Shapr3D offers no ASCII/binary choice, then
    // that this STL is the MANUFACTURING file sent to Carrera. Advising a smaller re-export risks a
    // degraded physical piece, so the message must own the limit as ours.
    const msg = uploadSizeError(file('tireRing.stl', 89.2));
    expect(msg).toMatch(/server limit/i);
    expect(msg).toMatch(/not a problem with your file/i);
    expect(msg).not.toMatch(/ASCII|BINARY|lower resolution|re-export at|decimat/i);
  });

  it('passes files at or under the limit', () => {
    expect(uploadSizeError({ name: 'small.stl', size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(uploadSizeError(file('model.glb', 1.2))).toBeNull();
  });

  it('never blocks on a missing or unreadable size', () => {
    // A guard that fires on bad metadata would break uploads it was meant to protect.
    for (const f of [undefined, null, {}, { name: 'x.stl' }, { name: 'x.stl', size: 'abc' }, { size: NaN }]) {
      expect(uploadSizeError(f)).toBeNull();
    }
  });
});

describe('estimateStlTriangles', () => {
  it('converts binary-STL bytes to a triangle count the CAD author can act on', () => {
    expect(estimateStlTriangles(91355 * 1024)).toBe('1.9M');   // the reported file
    expect(estimateStlTriangles(84 + 50 * 150_000)).toBe('150k');
    expect(estimateStlTriangles(84 + 50 * 12)).toBe('12');
  });
  it('never goes negative on a tiny or junk size', () => {
    expect(estimateStlTriangles(0)).toBe('0');
    expect(estimateStlTriangles(undefined)).toBe('0');
  });
});

describe('formatBytes', () => {
  it('scales B / KB / MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(91355 * 1024)).toBe('89.2 MB');   // the reported file, as Explorer showed it
  });
  it('handles junk', () => {
    expect(formatBytes(undefined)).toBe('0 B');
    expect(formatBytes('abc')).toBe('0 B');
  });
});
