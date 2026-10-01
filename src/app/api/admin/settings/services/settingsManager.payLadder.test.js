import { describe, it, expect, vi } from 'vitest';
import { ladderFromSettings, DEFAULT_LADDER } from '@/services/pay/payLadder';

/**
 * EFD-DEFECTS P6: the guide reads the pay ladder from SettingsManagerService.getSettings(), which used to leave
 * `payLadder` out — so /api/guide always showed the default ladder, never the one the owner edited.
 */
const EDITED = {
  tiers: [
    { key: 'bench', label: 'Bench jeweler', rate: 32, summary: 'Edited', requirements: ['Bench test'] },
    { key: 'master', label: 'Master', rate: 55, summary: 'Edited', requirements: [] },
  ],
};

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(),
    _instance: {
      collection: () => ({
        findOne: async () => ({ _id: 'repair_task_admin_settings', pricing: { wage: 50 }, payLadder: EDITED }),
      }),
    },
  },
}));

describe('getSettings carries the published pay ladder', () => {
  it('returns the edited ladder, so the guide shows it', async () => {
    const { default: SettingsManagerService } = await import('./settingsManager.service.js');
    const settings = await SettingsManagerService.getSettings();
    expect(settings.payLadder).toEqual(EDITED);
    const ladder = ladderFromSettings(settings);
    expect(ladder.tiers.map((t) => t.rate)).toEqual([32, 55]);
    expect(ladder.tiers.map((t) => t.rate)).not.toEqual(DEFAULT_LADDER.tiers.map((t) => t.rate));
  });
});
