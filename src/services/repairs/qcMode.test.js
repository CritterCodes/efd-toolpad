import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));

import { QC_MODES, normalizeQcMode, qcModeFromSettings, canSelfCertify } from './qcMode';

describe('QC mode', () => {
  it('defaults to a separate pass and only accepts the two known modes', () => {
    expect(normalizeQcMode(undefined)).toBe(QC_MODES.SEPARATE);
    expect(normalizeQcMode('nonsense')).toBe(QC_MODES.SEPARATE);
    expect(normalizeQcMode('self-certify')).toBe(QC_MODES.SELF_CERTIFY);
    expect(qcModeFromSettings({ business: { qc: { mode: 'self-certify' } } })).toBe(QC_MODES.SELF_CERTIFY);
    expect(qcModeFromSettings({ business: {} })).toBe(QC_MODES.SEPARATE);
    expect(qcModeFromSettings(null)).toBe(QC_MODES.SEPARATE);
  });

  it('nobody self-certifies while the shop is in separate mode', () => {
    expect(canSelfCertify({ session: { user: { role: 'admin' } }, mode: 'separate' })).toBe(false);
  });

  it('in self-certify mode: admins always; artisans only on-site with bench + QC capability', () => {
    const mode = 'self-certify';
    expect(canSelfCertify({ session: { user: { role: 'admin' } }, mode })).toBe(true);
    const artisan = (caps, isOnsite = true) => ({ user: { role: 'artisan', employment: { isOnsite }, staffCapabilities: caps } });
    expect(canSelfCertify({ session: artisan({ repairOps: true, benchWork: true, qualityControl: true }), mode })).toBe(true);
    expect(canSelfCertify({ session: artisan({ repairOps: true, benchWork: true }), mode })).toBe(false); // no QC capability
    expect(canSelfCertify({ session: artisan({ repairOps: true, benchWork: true, qualityControl: true }, false), mode })).toBe(false); // off-site
    expect(canSelfCertify({ session: { user: { role: 'wholesaler' } }, mode })).toBe(false);
  });
});
