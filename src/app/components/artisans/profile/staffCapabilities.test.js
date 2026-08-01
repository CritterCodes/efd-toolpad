// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
// fireEvent, not user-event: @testing-library/user-event isn't a dependency here, and this worktree
// can't install one (it isn't a pnpm workspace member). A switch click needs no pointer simulation.
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import ArtisanStaffCapabilities from './staffCapabilities';

/**
 * Toggling an artisan off-site used to blank `staffCapabilities` to {}.
 *
 * That looked protective and wasn't: every gate in the app requires `employment.isOnsite === true`
 * AND the capability (lib/repairAccess.js isOnsiteRepairOps → apiAuth's requireRepairOps*,
 * benchActions.assertRepairOps, the artisan navigation, every /dashboard/repairs page guard). A stored
 * capability is already inert while off-site, so clearing it only destroyed the record.
 *
 * The capability switches are HIDDEN while off-site, so flipping the toggle off and back on left all
 * six switches showing off, with no warning and nothing on screen saying what had been there. The
 * component is fed the DRAFT (`artisan={updatedArtisan}`), so it looked exactly like a revocation.
 *
 * It never reached the database — staffCapabilities is privileged and stripped on save — so the harm
 * was misinformation, not data loss. Granting/revoking now goes through
 * PATCH /api/users/[userID]/staff-capabilities, which is the path that actually persists.
 *
 * These tests pin the two halves: the wipe is gone, and the retained capabilities are visible rather
 * than merely invisible-but-present.
 */

const ALL_CAPS = {
  repairOps: true,
  receiving: true,
  benchWork: true,
  parts: true,
  qualityControl: true,
  closeoutBilling: true,
};

const onsiteArtisan = (caps = ALL_CAPS) => ({
  employment: { isOnsite: true, hourlyRate: 50 },
  staffCapabilities: { ...caps },
});

afterEach(cleanup);

function toggleOnsite(onFieldChange, artisan) {
  render(<ArtisanStaffCapabilities artisan={artisan} onFieldChange={onFieldChange} />);
  // The on-site switch is the one labelled "On-site staff member".
  fireEvent.click(screen.getByRole('checkbox', { name: /On-site staff member/i }));
}

describe('ArtisanStaffCapabilities — going off-site', () => {
  it('does NOT erase staffCapabilities — the actual bug', () => {
    const onFieldChange = vi.fn();
    toggleOnsite(onFieldChange, onsiteArtisan());

    const capabilityWrites = onFieldChange.mock.calls.filter(([field]) => field === 'staffCapabilities');
    expect(capabilityWrites).toEqual([]);
  });

  it('still records the off-site change itself', () => {
    const onFieldChange = vi.fn();
    toggleOnsite(onFieldChange, onsiteArtisan());

    expect(onFieldChange).toHaveBeenCalledWith('employment', expect.objectContaining({ isOnsite: false }));
  });

  it('preserves the rest of the employment record when toggling', () => {
    const onFieldChange = vi.fn();
    toggleOnsite(onFieldChange, onsiteArtisan());

    // Spreading `employment` matters: hourlyRate/staffType must survive the toggle.
    expect(onFieldChange).toHaveBeenCalledWith('employment', expect.objectContaining({ hourlyRate: 50 }));
  });

  it('tells the admin the capabilities are retained, since the switches are hidden off-site', () => {
    render(
      <ArtisanStaffCapabilities
        artisan={{ employment: { isOnsite: false }, staffCapabilities: ALL_CAPS }}
        onFieldChange={vi.fn()}
      />
    );
    expect(screen.getByText(/6 repair capabilities are still\s+on file/i)).toBeDefined();
  });

  it('says nothing when an off-site artisan genuinely has no capabilities', () => {
    render(
      <ArtisanStaffCapabilities
        artisan={{ employment: { isOnsite: false }, staffCapabilities: {} }}
        onFieldChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/still\s+on file/i)).toBeNull();
  });

  it('counts only the capabilities actually held', () => {
    render(
      <ArtisanStaffCapabilities
        artisan={{
          employment: { isOnsite: false },
          staffCapabilities: { repairOps: true, qualityControl: true, benchWork: false },
        }}
        onFieldChange={vi.fn()}
      />
    );
    expect(screen.getByText(/2 repair capabilities are still\s+on file/i)).toBeDefined();
  });
});

describe('ArtisanStaffCapabilities — turning someone on-site', () => {
  it('does not invent capabilities', () => {
    const onFieldChange = vi.fn();
    render(
      <ArtisanStaffCapabilities
        artisan={{ employment: { isOnsite: false }, staffCapabilities: {} }}
        onFieldChange={onFieldChange}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /On-site staff member/i }));

    expect(onFieldChange).toHaveBeenCalledWith('employment', expect.objectContaining({ isOnsite: true }));
    expect(onFieldChange.mock.calls.filter(([field]) => field === 'staffCapabilities')).toEqual([]);
  });
});
