import { describe, expect, it } from 'vitest';
import { LABOR_PAYER, owningArtisanForPiece, resolveLaborPayer } from '@/services/production/laborPayer';

describe('owningArtisanForPiece (pure)', () => {
  it('an artisan-owned drop owns the piece', () => {
    expect(owningArtisanForPiece({ drop: { ownerType: 'artisan', ownerId: 'u1' }, design: { primaryArtisanId: 'u2' } })).toBe('u1');
  });
  it('falls back to the design primary artisan when the drop is EFD-owned', () => {
    expect(owningArtisanForPiece({ drop: { ownerType: 'efd', ownerId: null }, design: { primaryArtisanId: 'u2' } })).toBe('u2');
  });
  it('falls back to the design when there is no drop', () => {
    expect(owningArtisanForPiece({ drop: null, design: { primaryArtisanId: 'u2' } })).toBe('u2');
  });
  it('returns null (EFD-owned) when nothing indicates an artisan', () => {
    expect(owningArtisanForPiece({ drop: { ownerType: 'efd' }, design: {} })).toBeNull();
    expect(owningArtisanForPiece({})).toBeNull();
  });
  it('an artisan drop missing ownerId is not treated as owned', () => {
    expect(owningArtisanForPiece({ drop: { ownerType: 'artisan' }, design: { primaryArtisanId: 'u2' } })).toBe('u2');
  });
});

describe('resolveLaborPayer (pure, mechanical rule)', () => {
  it('self only when the laborer IS the owning artisan', () => {
    expect(resolveLaborPayer({ laborerUserID: 'u1', owningArtisanUserID: 'u1' })).toBe(LABOR_PAYER.SELF);
  });
  it('efd when the laborer is someone else (outsourced)', () => {
    expect(resolveLaborPayer({ laborerUserID: 'u2', owningArtisanUserID: 'u1' })).toBe(LABOR_PAYER.EFD);
  });
  it('efd when there is no owning artisan (EFD-owned / repairs)', () => {
    expect(resolveLaborPayer({ laborerUserID: 'u1', owningArtisanUserID: null })).toBe(LABOR_PAYER.EFD);
  });
  it('efd when the laborer is unknown', () => {
    expect(resolveLaborPayer({ laborerUserID: null, owningArtisanUserID: 'u1' })).toBe(LABOR_PAYER.EFD);
  });
  it('efd on empty input (safe default)', () => {
    expect(resolveLaborPayer({})).toBe(LABOR_PAYER.EFD);
  });
});
