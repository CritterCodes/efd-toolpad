import { describe, expect, it } from 'vitest';
import { generateArtisanNavigation } from './artisanNavigation';

function navigationSegments(navigation) {
  return navigation.flatMap((item) => item.segment ?? []);
}

describe('artisan navigation', () => {
  it('always exposes completed work history to artisans', () => {
    const segments = navigationSegments(generateArtisanNavigation());

    expect(segments).toContain('dashboard/artisan/my-work');
  });

  it('keeps repair intake and bench work restricted to on-site repair staff', () => {
    const standardArtisan = navigationSegments(generateArtisanNavigation());
    const repairArtisan = navigationSegments(
      generateArtisanNavigation([], { repairOps: true }, { isOnsite: true }),
    );

    expect(standardArtisan).not.toContain('dashboard/repairs/new');
    expect(standardArtisan).not.toContain('dashboard/repairs/my-bench');
    expect(repairArtisan).toContain('dashboard/repairs/new');
    expect(repairArtisan).toContain('dashboard/repairs/my-bench');
    expect(repairArtisan.filter((segment) => segment === 'dashboard/artisan/my-work')).toHaveLength(1);
  });
});
