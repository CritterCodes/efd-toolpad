import { describe, expect, it, vi } from 'vitest';

vi.mock('./database.js', () => ({
  db: {},
}));

import {
  APPLICATION_STATUSES,
  buildApplicantMatchReport,
  buildCanonicalWholesaleApplication,
  buildMergedWholesaleApplication,
  normalizeEmail,
} from './wholesaleReconciliationService.js';

describe('wholesaleReconciliationService', () => {
  it('normalizes wholesale emails for matching', () => {
    expect(normalizeEmail(' Sales@Store.com ')).toBe('sales@store.com');
    expect(normalizeEmail('')).toBe('');
  });

  it('backfills canonical wholesale profile from legacy wholesaler fields', () => {
    const canonical = buildCanonicalWholesaleApplication({
      role: 'wholesaler',
      firstName: 'Martha',
      lastName: 'Jones',
      email: 'martha@example.com',
      phoneNumber: '555-0100',
      business: 'Jones Jewelers',
    });

    expect(canonical.businessName).toBe('Jones Jewelers');
    expect(canonical.contactFirstName).toBe('Martha');
    expect(canonical.contactLastName).toBe('Jones');
    expect(canonical.contactEmail).toBe('martha@example.com');
    expect(canonical.contactPhone).toBe('555-0100');
    expect(canonical.status).toBe(APPLICATION_STATUSES.APPROVED);
    expect(canonical.source).toBe('legacy_backfill');
  });

  it('finds a safe email match against one active wholesaler', () => {
    const report = buildApplicantMatchReport(
      {
        _id: 'applicant-1',
        role: 'wholesale-applicant',
        email: 'buyer@example.com',
        wholesaleApplication: {
          applicationId: 'wholesale-001',
          contactEmail: 'buyer@example.com',
          businessName: 'Buyer Store',
          contactFirstName: 'Buyer',
          contactLastName: 'One',
          status: APPLICATION_STATUSES.PENDING,
        },
      },
      [
        {
          _id: 'wholesaler-1',
          role: 'wholesaler',
          userID: 'ws-1',
          email: 'buyer@example.com',
          firstName: 'Legacy',
          lastName: 'Owner',
          business: 'Legacy Store',
        },
      ]
    );

    expect(report.status).toBe('safe_match');
    expect(report.canAutoMerge).toBe(true);
    expect(report.candidates).toHaveLength(1);
  });

  it('flags ambiguous matches when more than one active wholesaler shares the email', () => {
    const report = buildApplicantMatchReport(
      {
        _id: 'applicant-1',
        role: 'wholesale-applicant',
        email: 'buyer@example.com',
        wholesaleApplication: {
          applicationId: 'wholesale-001',
          contactEmail: 'buyer@example.com',
          businessName: 'Buyer Store',
          status: APPLICATION_STATUSES.PENDING,
        },
      },
      [
        { _id: 'wholesaler-1', role: 'wholesaler', userID: 'ws-1', email: 'buyer@example.com', business: 'Store A' },
        { _id: 'wholesaler-2', role: 'wholesaler', userID: 'ws-2', email: 'buyer@example.com', business: 'Store B' },
      ]
    );

    expect(report.status).toBe('ambiguous');
    expect(report.canAutoMerge).toBe(false);
    expect(report.candidates).toHaveLength(2);
  });

  it('merges applicant profile data into the active wholesaler account while preserving account identity', () => {
    const merged = buildMergedWholesaleApplication(
      {
        _id: 'wholesaler-1',
        role: 'wholesaler',
        userID: 'ws-1',
        email: 'buyer@example.com',
        firstName: 'Legacy',
        lastName: 'Owner',
        phoneNumber: '555-1111',
        business: 'Legacy Store',
        wholesaleApplication: {
          applicationId: 'wholesale-legacy',
          businessName: 'Legacy Store',
          contactFirstName: 'Legacy',
          contactLastName: 'Owner',
          contactEmail: 'buyer@example.com',
          contactPhone: '555-1111',
          status: APPLICATION_STATUSES.APPROVED,
        },
      },
      {
        _id: 'applicant-1',
        role: 'wholesale-applicant',
        userID: 'app-1',
        email: 'buyer@example.com',
        wholesaleApplication: {
          applicationId: 'wholesale-new',
          businessName: 'Modern Store',
          contactFirstName: 'Taylor',
          contactLastName: 'Buyer',
          contactEmail: 'buyer@example.com',
          contactPhone: '555-2222',
          businessCity: 'Austin',
          status: APPLICATION_STATUSES.PENDING,
        },
      },
      'admin-user',
      'merge test'
    );

    expect(merged.applicationId).toBe('wholesale-legacy');
    expect(merged.businessName).toBe('Modern Store');
    expect(merged.contactFirstName).toBe('Taylor');
    expect(merged.contactPhone).toBe('555-2222');
    expect(merged.status).toBe(APPLICATION_STATUSES.APPROVED);
    expect(merged.mergedApplicationIds).toContain('wholesale-legacy');
    expect(merged.mergedApplicationIds).toContain('wholesale-new');
    expect(merged.reconciledBy).toBe('admin-user');
  });
});
