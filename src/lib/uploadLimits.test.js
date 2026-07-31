import { describe, it, expect } from 'vitest';
import { uploadSizeError, formatBytes, MAX_UPLOAD_BYTES } from '@/lib/uploadLimits';

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

  it('tells an STL author the ASCII→binary trick (the actionable fix)', () => {
    expect(uploadSizeError(file('ring.STL', 20))).toContain('BINARY STL');
    // …and does not give STL advice for a file that isn't one.
    expect(uploadSizeError(file('render.png', 20))).not.toContain('BINARY STL');
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
