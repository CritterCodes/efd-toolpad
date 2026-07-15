import { describe, expect, it } from 'vitest';
import { buildArtisanShopUrl, isOnsiteRepairOpsUser } from './artisanDashboardLinks';

describe('artisan dashboard links', () => {
  it('builds the signed-in artisan storefront URL from their profile slug', () => {
    expect(buildArtisanShopUrl('vernon-mcnabb')).toBe(
      'https://shop.engelfinedesign.com/vendors/vernon-mcnabb',
    );
    expect(buildArtisanShopUrl('Vernon & Co', 'https://preview.shop.example/')).toBe(
      'https://preview.shop.example/vendors/Vernon%20%26%20Co',
    );
    expect(buildArtisanShopUrl('')).toBeNull();
  });

  it('allows bench links only for on-site repair operations artisans', () => {
    expect(isOnsiteRepairOpsUser({
      employment: { isOnsite: true },
      staffCapabilities: { repairOps: true },
    })).toBe(true);
    expect(isOnsiteRepairOpsUser({
      employment: { isOnsite: false },
      staffCapabilities: { repairOps: true },
    })).toBe(false);
    expect(isOnsiteRepairOpsUser({
      employment: { isOnsite: true },
      staffCapabilities: {},
    })).toBe(false);
  });
});
