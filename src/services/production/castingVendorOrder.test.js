import { describe, expect, it } from 'vitest';
import {
  validateShipTo, formatShipTo, variantMetalLabel, validateVariantMetal, buildOrderLines,
  resolveDropShipRecipient,
} from '@/services/production/castingVendorOrder';

describe('validateShipTo (pure — the misship defense)', () => {
  const full = {
    businessName: 'Wolf & Wren', businessAddress: '123 Main St',
    businessCity: 'Fort Smith', businessState: 'AR', businessZip: '72901',
    businessCountry: 'United States',
  };
  it('accepts a complete address', () => {
    const { ok, shipTo } = validateShipTo(full, { name: 'Jane Smith' });
    expect(ok).toBe(true);
    expect(shipTo).toMatchObject({ name: 'Jane Smith', address: '123 Main St', city: 'Fort Smith', state: 'AR', zip: '72901', country: 'United States' });
  });
  it('defaults the country but FLAGS the assumption so a foreign misship is auditable', () => {
    const assumed = validateShipTo({ ...full, businessCountry: '' }, { name: 'Jane' });
    expect(assumed.ok).toBe(true);
    expect(assumed.shipTo.country).toBe('United States');
    expect(assumed.shipTo.countryAssumed).toBe(true);
    const stated = validateShipTo({ ...full, businessCountry: 'Canada' }, { name: 'Jane' });
    expect(stated.shipTo.country).toBe('Canada');
    expect(stated.shipTo.countryAssumed).toBe(false);
  });
  it('restores a leading zero on a NUMERIC zip (02134 parsed as 2134)', () => {
    expect(validateShipTo({ ...full, businessZip: 2134 }, { name: 'Jane' }).shipTo.zip).toBe('02134');
    expect(validateShipTo({ ...full, businessZip: 72901 }, { name: 'Jane' }).shipTo.zip).toBe('72901');
  });
  it('falls back to the business name when there is no person name', () => {
    expect(validateShipTo(full).shipTo.name).toBe('Wolf & Wren');
  });
  it('REJECTS a partial address and names every missing field', () => {
    const { ok, errors } = validateShipTo({ businessAddress: '123 Main St', businessName: 'X' });
    expect(ok).toBe(false);
    expect(errors).toEqual(['city', 'state', 'ZIP']);   // country defaults, so it is not listed
  });
  it('rejects an empty address entirely', () => {
    expect(validateShipTo({}).ok).toBe(false);
  });
  it('treats whitespace-only fields as missing (not a valid ship-to)', () => {
    const { ok, errors } = validateShipTo({ businessName: 'X', businessAddress: '   ', businessCity: 'Y', businessState: 'AR', businessZip: '72901' });
    expect(ok).toBe(false);
    expect(errors).toContain('street address');
  });
  it('the returned shipTo is frozen (snapshot cannot be mutated after validation)', () => {
    const { shipTo } = validateShipTo(full, { name: 'Jane' });
    expect(Object.isFrozen(shipTo)).toBe(true);
  });
  it('tolerates a NUMERIC zip from a JSON profile save (no .trim crash)', () => {
    const { ok, shipTo } = validateShipTo({ ...full, businessZip: 72901 }, { name: 'Jane' });
    expect(ok).toBe(true);
    expect(shipTo.zip).toBe('72901');
  });
  it('REJECTS non-string junk rather than printing "[object Object]" on a parcel', () => {
    expect(validateShipTo({ ...full, businessName: {} }, { name: null }).ok).toBe(false);
    expect(validateShipTo({ ...full, businessName: ['  ', ' '] }, { name: null }).ok).toBe(false);
    expect(validateShipTo({ ...full, businessZip: {} }, { name: 'Jane' }).ok).toBe(false);
    expect(validateShipTo({ ...full, businessAddress: true }, { name: 'Jane' }).ok).toBe(false);
  });
  it('REJECTS a numeric name/address (only the ZIP may be numeric)', () => {
    expect(validateShipTo({ ...full, businessName: 7 }, { name: null }).ok).toBe(false);
    expect(validateShipTo({ ...full, businessCity: 7 }, { name: 'Jane' }).ok).toBe(false);
  });
  it('formatShipTo renders one auditable line', () => {
    const { shipTo } = validateShipTo(full, { name: 'Jane Smith' });
    expect(formatShipTo(shipTo)).toBe('Jane Smith · 123 Main St · Fort Smith, AR 72901 · United States');
  });
});

describe('resolveDropShipRecipient (the misship guard — only caller-independent sources decide)', () => {
  const designOf = (artisan) => ({ primaryArtisanId: artisan });

  it('uses the design’s artisan of record — and IGNORES the batch owner / piece creator, which both default to whoever clicks', async () => {
    // THE ORIGINAL INCIDENT: staff creates the pieces + the batch for artisan-1's design, so both
    // weak fields say "staff-9". The design still says artisan-1 → it ships to artisan-1.
    const pieces = [{ pieceID: 'p1', createdBy: 'staff-9' }, { pieceID: 'p2', createdBy: 'staff-9' }];
    const { recipient, audit } = await resolveDropShipRecipient({ ownerId: 'staff-9' }, pieces, designOf('artisan-1'));
    expect(recipient).toBe('artisan-1');
    // The weak sources are recorded for disputes, never used to address the parcel.
    expect(audit).toMatchObject({ designOwner: 'artisan-1', batchOwnerId: 'staff-9', pieceCreators: ['staff-9'] });
  });

  it('REFUSES when no caller-independent source exists (no run, design has no artisan)', async () => {
    await expect(resolveDropShipRecipient({ ownerId: 'staff-9' }, [{ pieceID: 'p1', createdBy: 'staff-9' }], {}))
      .rejects.toThrow(/cannot independently establish/);
  });

  it('REFUSES when pieces span multiple runs (one order, one address)', async () => {
    await expect(resolveDropShipRecipient({}, [{ runId: 'r1' }, { runId: 'r2' }], designOf('a')))
      .rejects.toThrow(/different runs/);
  });

  it('shape-equal strong sources need no canonicalization', async () => {
    const { recipient } = await resolveDropShipRecipient({}, [{ pieceID: 'p1' }], designOf('artisan-1'));
    expect(recipient).toBe('artisan-1');
  });

  it('the owner casting his OWN design still works (design artisan is him)', async () => {
    const { recipient } = await resolveDropShipRecipient(
      { ownerId: 'owner-jacob' }, [{ pieceID: 'p1', createdBy: 'owner-jacob' }], designOf('owner-jacob'),
    );
    expect(recipient).toBe('owner-jacob');
  });
});

describe('validateVariantMetal (pure — never guess a metal)', () => {
  it('accepts gold with a karat and composes the alloy key', () => {
    expect(validateVariantMetal({ finish: 'gold', karat: '14' })).toEqual({ ok: true, metalKey: 'GOLD_14K_YELLOW', metalLabel: '14K Yellow Gold' });
    expect(validateVariantMetal({ finish: 'whiteGold', karat: '10' })).toMatchObject({ metalKey: 'GOLD_10K_WHITE', metalLabel: '10K White Gold' });
    expect(validateVariantMetal({ finish: 'roseGold', karat: '18' })).toMatchObject({ metalKey: 'GOLD_18K_RED', metalLabel: '18K Rose Gold' });
  });
  it('accepts karat-less metals', () => {
    expect(validateVariantMetal({ finish: 'platinum' })).toMatchObject({ ok: true, metalLabel: 'Platinum' });
    expect(validateVariantMetal({ finish: 'silver' })).toMatchObject({ ok: true, metalLabel: 'Silver' });
  });
  it('REJECTS gold with no karat (composeMetalKey would silently assume 14K)', () => {
    const res = validateVariantMetal({ finish: 'gold' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('needs a karat');
  });
  it('REJECTS an unsupported karat instead of quietly mapping it to 14K', () => {
    const res = validateVariantMetal({ finish: 'whiteGold', karat: '22' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('unsupported karat');
  });
  it('REJECTS a finish outside the vocabulary instead of defaulting to yellow gold', () => {
    expect(validateVariantMetal({ finish: 'bronze' }).ok).toBe(false);
    expect(validateVariantMetal({ finish: 'satin', karat: '14' }).ok).toBe(false);   // surface finish, not an alloy
    expect(validateVariantMetal({ finish: 42 }).ok).toBe(false);
  });
  it('REJECTS a missing finish', () => {
    expect(validateVariantMetal({}).ok).toBe(false);
    expect(validateVariantMetal({ karat: '14' }).ok).toBe(false);
  });
  it('variantMetalLabel returns null for anything invalid', () => {
    expect(variantMetalLabel({ finish: 'gold', karat: '14' })).toBe('14K Yellow Gold');
    expect(variantMetalLabel({ finish: 'gold' })).toBeNull();
    expect(variantMetalLabel({})).toBeNull();
  });
});

describe('buildOrderLines (pure — one line per variant/metal, never collapsed)', () => {
  const design = {
    name: 'Solstice Ring',
    variants: [
      { variantId: 'v-925', sku: 'SOL-925', finish: 'silver' },
      { variantId: 'v-10y', sku: 'SOL-10Y', finish: 'gold', karat: '10' },
      { variantId: 'v-14w', sku: 'SOL-14W', finish: 'whiteGold', karat: '14', ringSize: '7' },
      { variantId: 'v-nofinish', sku: 'SOL-???' },
    ],
  };

  it('produces one line per metal with correct quantities (a 5-metal order stays 5 lines)', () => {
    const pieces = [
      { pieceID: 'p1', variantId: 'v-925', editionNumber: 1 },
      { pieceID: 'p2', variantId: 'v-10y', editionNumber: 2 },
      { pieceID: 'p3', variantId: 'v-14w', editionNumber: 3 },
    ];
    const { lines, errors } = buildOrderLines(pieces, design);
    expect(errors).toEqual([]);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.metalLabel)).toEqual(['Silver', '10K Yellow Gold', '14K White Gold']);
    expect(lines.every((l) => l.qty === 1)).toBe(true);
    expect(lines.map((l) => l.metalKey)).toEqual(['SILVER_STERLING', 'GOLD_10K_YELLOW', 'GOLD_14K_WHITE']);
  });

  it('groups multiple pieces of the SAME variant into one line with qty', () => {
    const pieces = [
      { pieceID: 'p1', variantId: 'v-925', editionNumber: 1 },
      { pieceID: 'p2', variantId: 'v-925', editionNumber: 2 },
      { pieceID: 'p3', variantId: 'v-10y', editionNumber: 3 },
    ];
    const { lines } = buildOrderLines(pieces, design);
    expect(lines).toHaveLength(2);
    const silver = lines.find((l) => l.metalKey === 'SILVER_STERLING');
    expect(silver.qty).toBe(2);
    expect(silver.pieceIDs).toEqual(['p1', 'p2']);
    expect(silver.editionNumbers).toEqual([1, 2]);
  });

  it('ERRORS (never defaults) when a variant has no metal finish', () => {
    const { lines, errors } = buildOrderLines([{ pieceID: 'p1', variantId: 'v-nofinish' }], design);
    expect(lines).toHaveLength(0);
    expect(errors[0]).toContain('no metal finish set');
  });

  it('ERRORS on a gold variant with no karat (would otherwise silently order 14K)', () => {
    const d = { name: 'X', variants: [{ variantId: 'v-nokarat', finish: 'gold' }] };
    const { lines, errors } = buildOrderLines([{ pieceID: 'p1', variantId: 'v-nokarat' }], d);
    expect(lines).toHaveLength(0);
    expect(errors[0]).toContain('needs a karat');
  });

  it('splits ONE variant into separate lines per resolved ring size (never merges sizes)', () => {
    const pieces = [
      { pieceID: 'p1', variantId: 'v-14w', resolvedConfiguration: { ringSize: '6.5' } },
      { pieceID: 'p2', variantId: 'v-14w', resolvedConfiguration: { ringSize: '8.25' } },
      { pieceID: 'p3', variantId: 'v-14w', resolvedConfiguration: { ringSize: '6.5' } },
    ];
    const { lines } = buildOrderLines(pieces, design);
    expect(lines).toHaveLength(2);
    expect(lines.find((l) => l.ringSize === '6.5').qty).toBe(2);
    expect(lines.find((l) => l.ringSize === '8.25').qty).toBe(1);
  });

  it('the piece resolved size wins over the variant nominal size', () => {
    const { lines } = buildOrderLines([{ pieceID: 'p1', variantId: 'v-14w', resolvedConfiguration: { ringSize: '9' } }], design);
    expect(lines[0].ringSize).toBe('9');   // variant nominal is '7'
  });

  it('a BLANK resolved size does not shadow the variant nominal (no sizeless ring line)', () => {
    const { lines } = buildOrderLines([{ pieceID: 'p1', variantId: 'v-14w', resolvedConfiguration: { ringSize: '   ' } }], design);
    expect(lines[0].ringSize).toBe('7');
  });

  it('numeric and string sizes for one variant merge into a single line', () => {
    const pieces = [
      { pieceID: 'p1', variantId: 'v-14w', resolvedConfiguration: { ringSize: 7 } },
      { pieceID: 'p2', variantId: 'v-14w', resolvedConfiguration: { ringSize: '7' } },
    ];
    const { lines } = buildOrderLines(pieces, design);
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(2);
  });

  it('ERRORS when a piece references a variant not on the design', () => {
    const { errors } = buildOrderLines([{ pieceID: 'p1', variantId: 'ghost' }], design);
    expect(errors[0]).toContain('not on the design');
  });

  it('carries the ring size through when the variant has one', () => {
    const { lines } = buildOrderLines([{ pieceID: 'p1', variantId: 'v-14w' }], design);
    expect(lines[0].ringSize).toBe('7');
  });

  it('handles an empty piece list', () => {
    expect(buildOrderLines([], design)).toEqual({ lines: [], errors: [] });
  });
});
