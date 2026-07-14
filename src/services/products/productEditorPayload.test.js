import { editorFormToPayload, mergeProductEditorUpdate, productToEditorForm } from './productEditorPayload';

describe('product editor payload contract', () => {
  it('maps flat editor fields to the canonical nested product contract', () => {
    const payload = editorFormToPayload({
      title: 'Ruby Ring', productType: 'jewelry', sku: 'R-1', status: 'draft',
      costBasis: '100', laborHours: '2', laborRate: '25', markupPct: '100', salePrice: '300',
      metalType: 'gold', karat: '14k', metalWeight: '4.2', linkedGemstones: 'gem-1, gem-2',
      onHandQty: '3', tags: 'ring, ruby', channels: ['retail'],
    });

    expect(payload.pricing).toMatchObject({ costBasis: 100, laborCost: 50, retailPrice: 300 });
    expect(payload.jewelry.metals).toEqual([{ type: 'gold', purity: '14k', weight: 4.2 }]);
    expect(payload.references).toEqual({ gemstoneIds: ['gem-1', 'gem-2'], gemstoneId: 'gem-1' });
    expect(payload.inventory).toMatchObject({ sku: 'R-1', quantity: 3 });
    expect(payload.tags).toEqual(['ring', 'ruby']);
  });

  it('normalizes legacy arrays and dimensions for controlled editor inputs', () => {
    const form = productToEditorForm({
      productType: 'gemstone',
      gemstone: { cut: ['oval', 'mixed'], dimensions: { length: 6, width: 4, height: 3 }, treatment: ['heat'] },
      inventory: { sku: 'G-1', quantity: 2 },
      pricing: { retailPrice: 450 },
    });
    expect(form.cut).toBe('oval, mixed');
    expect(form.dimensions).toBe('6 x 4 x 3');
    expect(form.treatment).toBe('heat');
    expect(form.sku).toBe('G-1');
    expect(form.salePrice).toBe(450);
  });

  it('round-trips canonical certification and legacy linked gemstone fields', () => {
    const form = productToEditorForm({
      productType: 'gemstone',
      gemstone: {
        certification: { number: 'GIA-1', url: 'https://files.example/cert.pdf', verified: true },
      },
      jewelry: { linkedGemstones: ['legacy-gem'] },
      references: { gemstoneIds: [] },
    });
    expect(form.certNumber).toBe('GIA-1');
    expect(form.certFile).toBe('https://files.example/cert.pdf');
    expect(form.linkedGemstones).toBe('legacy-gem');

    const update = mergeProductEditorUpdate(
      { gemstone: { certification: { lab: 'GIA', verified: true } } },
      editorFormToPayload(form),
      { canAdminister: true },
    );
    expect(update.gemstone.certification).toEqual({
      lab: 'GIA', verified: true, number: 'GIA-1', url: 'https://files.example/cert.pdf',
    });
  });

  it('preserves unknown canonical nested fields and rejects arbitrary input', () => {
    const update = mergeProductEditorUpdate(
      { pricing: { currency: 'USD', costBasisSource: 'actual' }, references: { designId: 'd1' } },
      { pricing: { retailPrice: 500 }, references: { gemstoneId: 'g1' }, _id: 'replace-me', $where: 'bad' },
      { canAdminister: true },
    );
    expect(update.pricing).toEqual({ currency: 'USD', costBasisSource: 'actual', retailPrice: 500 });
    expect(update.references).toEqual({ designId: 'd1', gemstoneId: 'g1' });
    expect(update).not.toHaveProperty('_id');
    expect(update).not.toHaveProperty('$where');
  });

  it('allows status and ownership changes only for administrators', () => {
    const input = { title: 'A', status: 'archived', artisanId: 'artisan-2' };
    expect(mergeProductEditorUpdate({}, input, { canAdminister: false })).toEqual({ title: 'A' });
    expect(mergeProductEditorUpdate({}, input, { canAdminister: true })).toMatchObject({
      title: 'A', status: 'archived', artisanId: 'artisan-2',
      artisanInfo: { artisanId: 'artisan-2' }, seller: { userId: 'artisan-2' },
    });
  });

  it('keeps available inventory in sync with quantity and reservations', () => {
    const update = mergeProductEditorUpdate(
      { inventory: { quantity: 4, available: 3, reserved: 1 } },
      { inventory: { quantity: 8 } },
      { canAdminister: true },
    );
    expect(update.inventory).toMatchObject({ quantity: 8, available: 7, reserved: 1 });
  });
});
