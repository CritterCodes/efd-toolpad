import { describe, it, expect } from 'vitest';
import { evalWindow } from '@/lib/rateLimit';

const WIN = 60_000;
const BASE = 16_666_667 * WIN; // a window-aligned epoch (start of a bucket)

describe('evalWindow (fixed-window verdict)', () => {
  it('allows up to and including the limit, blocks the next hit', () => {
    expect(evalWindow(BASE, 1, 120, WIN).allowed).toBe(true);
    expect(evalWindow(BASE, 120, 120, WIN).allowed).toBe(true);   // at limit → still allowed
    expect(evalWindow(BASE, 121, 120, WIN).allowed).toBe(false);  // over limit → blocked
  });

  it('computes resetAt at the next window boundary and a matching retryAfter', () => {
    const now = BASE + 30_000;                     // 30s into the bucket
    const r = evalWindow(now, 5, 120, WIN);
    expect(r.resetAt.getTime() % WIN).toBe(0);     // aligned to the window grid
    expect(r.resetAt.getTime()).toBe(BASE + WIN);
    expect(r.retryAfterSec).toBe(30);              // 30s left in the window
  });

  it('buckets are stable within a window and advance across it', () => {
    const a = evalWindow(BASE, 1, 10, WIN).bucket;
    const b = evalWindow(BASE + 59_999, 1, 10, WIN).bucket; // same window
    const c = evalWindow(BASE + 60_000, 1, 10, WIN).bucket; // next window
    expect(a).toBe(b);
    expect(c).toBe(a + 1);
  });
});
