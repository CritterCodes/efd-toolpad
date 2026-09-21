import { describe, expect, it } from 'vitest';
import { wholesalerBusinessName, looksLikePersonName } from './businessName';

// Greers Pawn as it sat in prod: no `business`, only the application name, contact Sam Johnson.
const greers = { userID: 'user-12f9c0c1', firstName: 'Sam', lastName: 'Johnson', wholesaleApplication: { businessName: 'Greers Pawn' } };

describe('wholesalerBusinessName', () => {
  it('prefers the application business name over the contact (the Sam Johnson bug)', () => {
    expect(wholesalerBusinessName(greers)).toBe('Greers Pawn');
  });
  it('falls back through business → businessName → name → person → fallback', () => {
    expect(wholesalerBusinessName({ business: 'Marlen Jewelers', firstName: 'Andrew' })).toBe('Marlen Jewelers');
    expect(wholesalerBusinessName({ businessName: 'Rocky\'s Corner' })).toBe('Rocky\'s Corner');
    expect(wholesalerBusinessName({ firstName: 'Taylor', lastName: 'Bailey' })).toBe('Taylor Bailey');
    expect(wholesalerBusinessName({}, 'Wholesale Store')).toBe('Wholesale Store');
    expect(wholesalerBusinessName({ wholesaleApplication: { businessName: '  ' }, business: 'X' })).toBe('X');
  });
});

describe('looksLikePersonName', () => {
  it('flags a store name that is just the contact', () => {
    expect(looksLikePersonName('Sam Johnson', greers)).toBe(true);
    expect(looksLikePersonName('sam johnson', greers)).toBe(true);
    expect(looksLikePersonName('Greers Pawn', greers)).toBe(false);
    expect(looksLikePersonName('Anything', {})).toBe(false);
  });
});
