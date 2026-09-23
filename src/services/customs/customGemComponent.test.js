import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDesign } from '@/app/api/designs/model';

const mocks = vi.hoisted(() => ({
  findOrder: vi.fn(),
  updateOrder: vi.fn(async () => ({ quote: { quoteTotal: 4200 } })),
  linkProduction: vi.fn(async () => ({})),
  designCreate: vi.fn(async (d) => ({ ...d, designID: 'd-stone' })),
  designFind: vi.fn(async () => ({ designID: 'd-stone', name: '1.5ct Marquise Citrine', category: 'gemstone' })),
  pieceCreate: vi.fn(async (p) => ({ ...p, pieceID: 'p-stone' })),
  pieceFind: vi.fn(),
  pieceUpdate: vi.fn(async () => ({})),
  spawnWO: vi.fn(async () => ({ workOrderID: 'wo-1' })),
}));

vi.mock('@/app/api/custom-orders/model', () => ({
  default: { findById: mocks.findOrder, updateById: mocks.updateOrder, linkProduction: mocks.linkProduction },
}));
vi.mock('@/app/api/designs/model', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, default: { create: mocks.designCreate, findById: mocks.designFind } };
});
vi.mock('@/app/api/pieces/model', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, default: { create: mocks.pieceCreate, findById: mocks.pieceFind, updateById: mocks.pieceUpdate } };
});
vi.mock('@/services/customs/customProduction', () => ({ spawnCustomWorkOrder: mocks.spawnWO }));

const { stoneTitle, stoneConfiguration, buildStoneDesign, addCustomCutStone, setStonePrice } = await import('./customGemComponent');

const MARQUISE = {
  species: 'Citrine', cut: ['Marquise'], cutStyle: ['Brilliant'], colorLabel: 'Golden',
  sizeMode: 'carat', carat: 1.5, clarity: 'VS', treatment: 'none',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findOrder.mockResolvedValue({ customID: 'CO-1', clientID: 'client-1', billing: { mode: 'retail' }, quote: { centerstone: { item: '', cost: 0 } } });
  mocks.pieceFind.mockResolvedValue({ pieceID: 'p-stone', customOrderID: 'CO-1', designID: 'd-stone', resolvedConfiguration: stoneConfiguration(MARQUISE) });
  mocks.updateOrder.mockResolvedValue({ quote: { quoteTotal: 4200 } });
});

describe('the stone as a product (pure)', () => {
  it('names itself the way a cutter and a client would both read it', () => {
    expect(stoneTitle(MARQUISE)).toBe('1.5ct Marquise Golden Citrine');
    expect(stoneTitle({ ...MARQUISE, sizeMode: 'dimensions', targetMm: 8.5 })).toBe('8.5mm Marquise Golden Citrine');
    expect(stoneTitle({})).toBe('Custom cut stone');
  });

  it('records the cutter target, and flags cut-to-fit when the spec is dimensions', () => {
    const byCarat = stoneConfiguration(MARQUISE);
    expect(byCarat).toMatchObject({ sizeMode: 'carat', species: 'Citrine', color: 'Golden', carat: 1.5, finalCarat: null, cutToFit: false });

    const byMm = stoneConfiguration({ ...MARQUISE, sizeMode: 'dimensions', targetMm: 8.5, tolerance: 0.25 });
    expect(byMm).toMatchObject({ sizeMode: 'dimensions', targetMm: 8.5, tolerance: 0.25, cutToFit: true });
  });

  it('builds a design the real validator accepts as a gemstone design', () => {
    const design = buildStoneDesign(MARQUISE, { customID: 'CO-1', cutterUserID: 'user-cutter' });
    expect(design.category).toBe('gemstone');
    expect(design.gemstone).toEqual({ cut: ['Marquise'], cutStyle: ['Brilliant'] });
    expect(design.primaryArtisanId).toBe('user-cutter');
    expect(design.edition.type).toBe('one_of_one');
    // A commission is quoted by request — that is both true and what the validator needs
    // when a variant carries no rate tiers.
    expect(design.variants[0].gemstone).toMatchObject({ species: 'Citrine', availability: 'special_request', caratMin: 1.5, caratMax: 1.5 });

    // Defaults the model fills in on create; everything else must already be valid.
    const check = validateDesign({ ...design, productionMethod: 'cad_cast' });
    expect(check.errors).toEqual([]);
    expect(check.valid).toBe(true);
  });

  it('refuses a stone with no species rather than creating a nameless design', () => {
    expect(() => buildStoneDesign({ cut: ['Marquise'] }, { customID: 'CO-1' })).toThrow(/species/);
  });
});

describe('addCustomCutStone', () => {
  it('creates the stone as its own design + piece and hangs the CUT work order off THE STONE', async () => {
    const out = await addCustomCutStone({ customID: 'CO-1', stone: MARQUISE, cutterUserID: 'user-cutter', createdBy: 'admin' });

    expect(mocks.designCreate).toHaveBeenCalledWith(expect.objectContaining({ category: 'gemstone' }));
    expect(mocks.pieceCreate).toHaveBeenCalledWith(expect.objectContaining({
      designID: 'd-stone', customOrderID: 'CO-1', resolvedConfiguration: expect.objectContaining({ species: 'Citrine', carat: 1.5 }),
    }));
    // Both components are linked to the SAME custom order — the ring keeps its own piece.
    expect(mocks.linkProduction).toHaveBeenCalledWith('CO-1', { designID: 'd-stone', pieceID: 'p-stone' });

    const wo = mocks.spawnWO.mock.calls[0][0];
    expect(wo.discipline).toBe('gem_cutting');
    expect(wo.pieceID).toBe('p-stone');           // the stone, NOT the ring
    expect(wo.assignedToUserID).toBe('user-cutter');
    expect(wo.title).toBe('Cut 1.5ct Marquise Golden Citrine');
    expect(out.workOrder.workOrderID).toBe('wo-1');
  });

  it('will not add a stone to an order that does not exist', async () => {
    mocks.findOrder.mockResolvedValue(null);
    await expect(addCustomCutStone({ customID: 'nope', stone: MARQUISE })).rejects.toThrow(/not found/);
  });
});

describe('setStonePrice', () => {
  it('records the price on the stone and ports it into the ring quote as a PARTIAL update', async () => {
    const out = await setStonePrice({ customID: 'CO-1', pieceID: 'p-stone', price: 1250, quotedBy: 'user-cutter', note: 'rough + cut' });

    expect(mocks.pieceUpdate).toHaveBeenCalledWith('p-stone', expect.objectContaining({
      stonePrice: expect.objectContaining({ amount: 1250, quotedBy: 'user-cutter', note: 'rough + cut' }),
    }));

    // Only `centerstone` is sent: updateById merges it onto the existing quote and recomputes.
    // Sending the whole quote back would be the subdoc-replace trap.
    const [customID, update] = mocks.updateOrder.mock.calls[0];
    expect(customID).toBe('CO-1');
    expect(Object.keys(update)).toEqual(['quote']);
    expect(Object.keys(update.quote)).toEqual(['centerstone']);
    expect(update.quote.centerstone).toMatchObject({
      item: '1.5ct Marquise Citrine', cost: 1250, sourcePieceID: 'p-stone', sourceDesignID: 'd-stone',
    });
    expect(out).toMatchObject({ amount: 1250, appliedToQuote: true, quoteTotal: 4200 });
  });

  it('can record a price without touching the quote', async () => {
    const out = await setStonePrice({ customID: 'CO-1', pieceID: 'p-stone', price: 900, applyToQuote: false });
    expect(out).toEqual({ pieceID: 'p-stone', amount: 900, appliedToQuote: false });
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it('refuses a zero price and a stone from another order', async () => {
    await expect(setStonePrice({ customID: 'CO-1', pieceID: 'p-stone', price: 0 })).rejects.toThrow(/greater than zero/);
    mocks.pieceFind.mockResolvedValue({ pieceID: 'p-stone', customOrderID: 'CO-OTHER' });
    await expect(setStonePrice({ customID: 'CO-1', pieceID: 'p-stone', price: 100 })).rejects.toThrow(/not part of this custom order/);
  });
});
