import { describe, expect, it } from 'vitest';
import { currentVersion, acceptanceFor, needsAcceptance, applyAcceptance, publicPolicy } from '@/services/policies/policyRegistry';

describe('policyRegistry (pure — versioned acceptance)', () => {
  const CUR = currentVersion('artisan-terms');

  it('has a current version for the artisan terms', () => {
    expect(CUR).toBeTruthy();
  });

  it('needsAcceptance is true when never accepted', () => {
    expect(needsAcceptance({ agreements: [] }, 'artisan-terms')).toBe(true);
    expect(needsAcceptance({}, 'artisan-terms')).toBe(true);
  });

  it('needsAcceptance is false once the CURRENT version is accepted', () => {
    const user = { agreements: [{ docId: 'artisan-terms', version: CUR, acceptedAt: new Date() }] };
    expect(needsAcceptance(user, 'artisan-terms')).toBe(false);
  });

  it('needsAcceptance is true again after a version bump (re-prompt)', () => {
    const user = { agreements: [{ docId: 'artisan-terms', version: '0.0-old', acceptedAt: new Date() }] };
    expect(needsAcceptance(user, 'artisan-terms')).toBe(true);
  });

  it('unknown doc never needs acceptance', () => {
    expect(needsAcceptance({}, 'nope')).toBe(false);
    expect(currentVersion('nope')).toBeNull();
  });

  it('applyAcceptance replaces any prior acceptance of the same doc (no duplicates)', () => {
    const at = new Date('2026-07-24T00:00:00Z');
    const start = [{ docId: 'artisan-terms', version: '0.0-old', acceptedAt: new Date('2020-01-01') }, { docId: 'other', version: '1' }];
    const next = applyAcceptance(start, 'artisan-terms', CUR, at);
    expect(next.filter((a) => a.docId === 'artisan-terms')).toHaveLength(1);
    expect(next.find((a) => a.docId === 'artisan-terms')).toEqual({ docId: 'artisan-terms', version: CUR, acceptedAt: at });
    expect(next.find((a) => a.docId === 'other')).toBeTruthy();   // untouched
  });

  it('acceptanceFor returns the matching record or null', () => {
    const user = { agreements: [{ docId: 'artisan-terms', version: CUR }] };
    expect(acceptanceFor(user, 'artisan-terms').version).toBe(CUR);
    expect(acceptanceFor(user, 'nope')).toBeNull();
  });

  it('publicPolicy strips the sourceDoc pointer', () => {
    const pub = publicPolicy('artisan-terms');
    expect(pub.sourceDoc).toBeUndefined();
    expect(pub.sections.length).toBeGreaterThan(0);
    expect(pub.version).toBe(CUR);
  });
});
