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

  it('keeps repair INTAKE restricted to on-site repair staff', () => {
    const standardArtisan = navigationSegments(generateArtisanNavigation());
    const repairArtisan = navigationSegments(
      generateArtisanNavigation([], { repairOps: true }, { isOnsite: true }),
    );

    expect(standardArtisan).not.toContain('dashboard/repairs/new');
    expect(repairArtisan).toContain('dashboard/repairs/new');
    expect(repairArtisan.filter((segment) => segment === 'dashboard/artisan/my-work')).toHaveLength(1);
  });

  /**
   * My Bench used to hang off repairOps, which hid it from every off-site artisan. The bench is
   * work-order driven and lane-gated by discipline (services/bench/benchQuery.js), so a gem cutter
   * sees gem_cutting and never a repair ticket — there was nothing to protect, and the cost was real:
   * the shop's first gem-cutting work order sat unclaimed because the cutter had no link to the page
   * it lives on.
   */
  it('gives EVERY artisan My Bench — including an off-site gem cutter with no repair capabilities', () => {
    const gemCutter = navigationSegments(generateArtisanNavigation(['Gem Cutter'], null, { isOnsite: false }));
    const engraver = navigationSegments(generateArtisanNavigation(['Engraver'], {}, null));
    const repairArtisan = navigationSegments(
      generateArtisanNavigation([], { repairOps: true }, { isOnsite: true }),
    );

    expect(gemCutter).toContain('dashboard/repairs/my-bench');
    expect(engraver).toContain('dashboard/repairs/my-bench');
    expect(repairArtisan).toContain('dashboard/repairs/my-bench');
    // Still exactly one entry for repair staff — the two branches must not both fire.
    expect(repairArtisan.filter((s) => s === 'dashboard/repairs/my-bench')).toHaveLength(1);
    expect(gemCutter.filter((s) => s === 'dashboard/repairs/my-bench')).toHaveLength(1);
    // The bench link is not a back door into the repair-ops pages.
    expect(gemCutter).not.toContain('dashboard/repairs/new');
    expect(gemCutter).not.toContain('dashboard/repairs/pick-up');
  });

  /**
   * Owner, 2026-07-31: "i also want onsite staff to have access to payment and pickup, i want to
   * promote vernon to be able to do QC work."
   *
   * Both asks turned out to be navigation, not authorization: the code already admits onsite repair-ops
   * to these surfaces. What was missing was the DOOR. These pin the two gaps found:
   *   - Move (where QC actually happens) had no artisan nav entry at all, though its page guard admits
   *     onsite repair-ops. Capable staff could only reach QC by typing the URL.
   *   - Payment & Pickup was linked only on closeoutBilling, while the page and the
   *     /api/repair-invoices/* routes both accept closeoutBilling OR qualityControl.
   */
  it('gives onsite repair-ops a door to the Move/QC surface its own guard admits them to', () => {
    const repairArtisan = navigationSegments(
      generateArtisanNavigation([], { repairOps: true }, { isOnsite: true }),
    );
    expect(repairArtisan).toContain('dashboard/repairs/move');
    // Not for artisans who aren't onsite repair staff.
    expect(navigationSegments(generateArtisanNavigation())).not.toContain('dashboard/repairs/move');
  });

  it('links Payment & Pickup for qualityControl too, matching the page + API rule', () => {
    const qcOnly = navigationSegments(
      generateArtisanNavigation([], { repairOps: true, qualityControl: true }, { isOnsite: true }),
    );
    // The actual bug: authorized by canAccessCloseout + every repair-invoices route, but no link.
    expect(qcOnly).toContain('dashboard/repairs/pick-up');

    const closeoutOnly = navigationSegments(
      generateArtisanNavigation([], { repairOps: true, closeoutBilling: true }, { isOnsite: true }),
    );
    expect(closeoutOnly).toContain('dashboard/repairs/pick-up');

    // Still withheld from onsite staff holding NEITHER — the money surface isn't opened to everyone.
    const neither = navigationSegments(
      generateArtisanNavigation([], { repairOps: true }, { isOnsite: true }),
    );
    expect(neither).not.toContain('dashboard/repairs/pick-up');
  });

  /**
   * An overdue invoice PAUSES an artisan's new work (isArtisanFrozen blocks mintRun,
   * requestDesignCad and casting-create). Until this entry existed the rail was staff-only: the
   * artisan got the freeze message with no page telling them what they owed or how to clear it.
   * Deliberately ungated — any artisan can incur a casting or work-order bill, so the way out must
   * always be reachable, not conditional on a capability or an artisan type.
   */
  it('always gives every artisan a way to see and pay what they owe', () => {
    const plain = navigationSegments(generateArtisanNavigation());
    expect(plain).toContain('dashboard/artisan/invoices');

    for (const type of ['Jeweler', 'Photographer', 'Gem Cutter']) {
      expect(navigationSegments(generateArtisanNavigation([type]))).toContain('dashboard/artisan/invoices');
    }
    // Present for onsite repair staff too, who reach it alongside the repair entries.
    expect(navigationSegments(generateArtisanNavigation([], { repairOps: true }, { isOnsite: true })))
      .toContain('dashboard/artisan/invoices');
  });

  it('does not point artisans at the staff invoices page', () => {
    // That page resolves invoices (send/mark-paid/void) and is admin/dev server-side.
    expect(navigationSegments(generateArtisanNavigation())).not.toContain('dashboard/production/invoices');
  });

  it('shows My Designs + My Drops to design-authoring types (raw Title Case labels normalized)', () => {
    for (const type of ['Gem Cutter', 'Jeweler', 'Engraver', 'CAD Designer']) {
      const segments = navigationSegments(generateArtisanNavigation([type]));
      expect(segments).toContain('dashboard/artisan/designs');
      expect(segments).toContain('dashboard/products/drops');
    }
  });

  it('hides My Designs/My Drops from artisans without a design-authoring type', () => {
    for (const types of [[], ['Photographer']]) {
      const segments = navigationSegments(generateArtisanNavigation(types));
      expect(segments).not.toContain('dashboard/artisan/designs');
      expect(segments).not.toContain('dashboard/products/drops');
    }
  });
});
