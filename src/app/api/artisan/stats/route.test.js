import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

vi.mock('@/../auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/analyticsService', () => ({
  AnalyticsService: {
    getAnalyticsData: vi.fn(),
    generateTimeSeriesData: vi.fn(),
  },
}));

import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/analyticsService';
import { GET } from './route';

describe('GET /api/artisan/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({
      user: { userID: 'user-artisan', businessName: 'Test Artisan' },
    });
    AnalyticsService.getAnalyticsData.mockResolvedValue({
      profileViews: { total: 3, views: [] },
      ratings: { average: 0, total: 0 },
    });
    AnalyticsService.generateTimeSeriesData.mockReturnValue([
      { date: '2026-07-15', value: 3 },
    ]);
  });

  it('honors the dashboard timeline and never fabricates commerce metrics', async () => {
    const response = await GET(new Request('https://admin.example/api/artisan/stats?timeline=last_7_days'));

    expect(response._status).toBe(200);
    expect(AnalyticsService.getAnalyticsData).toHaveBeenCalledWith(
      'user-artisan',
      'Test Artisan',
      'last_7_days',
    );
    expect(response._data.timeSeries.profileViews).toEqual([
      { date: '2026-07-15', value: 3 },
    ]);
    expect(response._data.timeSeries.revenue).toEqual([]);
    expect(response._data.timeSeries.productsSold).toEqual([]);
  });
});
