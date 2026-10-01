import { describe, it, expect, vi } from 'vitest';
import { normalizePath, routeFromPageFile, recordPageOpen } from './pageOpens';

describe('page-open log (retire what nobody uses)', () => {
  it('folds ids so every repair counts as one page', () => {
    expect(normalizePath('/dashboard/repairs/repair-6e9d2249')).toBe('/dashboard/repairs/:id');
    expect(normalizePath('/dashboard/clients/64b7f0c2a1b2c3d4e5f60718?tab=repairs')).toBe('/dashboard/clients/:id');
    expect(normalizePath('/dashboard/repairs/my-bench/')).toBe('/dashboard/repairs/my-bench');
    expect(normalizePath('/dashboard/analytics/reports/labor-pipeline')).toBe('/dashboard/analytics/reports/labor-pipeline');
  });

  it("matches a page file's URLs to the same shape", () => {
    expect(routeFromPageFile('src/app/dashboard/repairs/[repairID]/page.js')).toBe('/dashboard/repairs/:id');
    expect(routeFromPageFile(String.raw`src\app\dashboard\(admin)\settings\page.js`)).toBe('/dashboard/settings');
    expect(routeFromPageFile('src/app/dashboard/page.js')).toBe('/dashboard');
  });

  it('counts per day, role and page — no user — and ignores anything outside the dashboard', async () => {
    const updateOne = vi.fn(async () => ({}));
    const dbi = { collection: () => ({ updateOne }) };
    const r = await recordPageOpen(dbi, { pathname: '/dashboard/repairs/repair-1a2b3c4d', role: 'admin', at: new Date('2026-10-01T12:00:00Z') });
    expect(r).toEqual({ day: '2026-10-01', role: 'admin', path: '/dashboard/repairs/:id' });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: '2026-10-01|admin|/dashboard/repairs/:id' },
      { $inc: { count: 1 }, $setOnInsert: { day: '2026-10-01', role: 'admin', path: '/dashboard/repairs/:id' } },
      { upsert: true },
    );
    expect(await recordPageOpen(dbi, { pathname: '/auth/signin', role: 'admin' })).toBeNull();
  });
});
