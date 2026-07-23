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

  it('shows My Designs to design-authoring types (raw Title Case labels normalized)', () => {
    for (const type of ['Gem Cutter', 'Jeweler', 'Engraver', 'CAD Designer']) {
      expect(navigationSegments(generateArtisanNavigation([type]))).toContain('dashboard/artisan/designs');
    }
  });

  it('hides My Designs from artisans without a design-authoring type', () => {
    expect(navigationSegments(generateArtisanNavigation([]))).not.toContain('dashboard/artisan/designs');
    expect(navigationSegments(generateArtisanNavigation(['Photographer']))).not.toContain('dashboard/artisan/designs');
  });
});
