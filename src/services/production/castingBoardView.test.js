import { describe, expect, it } from 'vitest';
import { enrichBatch } from '@/services/production/castingBoardView';

const design = {
  name: 'Solstice Ring',
  variants: [
    { variantId: 'v-14y', sku: 'SOL-14Y', finish: 'gold', karat: '14' },
    { variantId: 'v-pt', sku: 'SOL-PT', finish: 'platinum' },
    { variantId: 'v-broken' },   // no finish — unorderable metal
  ],
};
const pieceById = {
  p1: { pieceID: 'p1', variantId: 'v-14y' },
  p2: { pieceID: 'p2', variantId: 'v-14y' },
  p3: { pieceID: 'p3', variantId: 'v-pt' },
  p4: { pieceID: 'p4', variantId: 'v-broken' },
};

describe('enrichBatch (pure board projection)', () => {
  it('names the design and lines up the per-metal quantities', () => {
    const out = enrichBatch({ batchId: 'b1', designID: 'd1', pieceIDs: ['p1', 'p2', 'p3'] }, design, pieceById);
    expect(out.designName).toBe('Solstice Ring');
    expect(out.lineErrors).toEqual([]);
    expect(out.lines.map((l) => `${l.qty}× ${l.metalLabel}`).sort())
      .toEqual(['1× Platinum', '2× 14K Yellow Gold']);
  });

  it('preserves the original batch fields', () => {
    const batch = { batchId: 'b1', designID: 'd1', pieceIDs: ['p1'], status: 'needs_ordering', vendor: 'Carrera' };
    const out = enrichBatch(batch, design, pieceById);
    expect(out).toMatchObject({ batchId: 'b1', status: 'needs_ordering', vendor: 'Carrera' });
  });

  it('reports a missing design WITHOUT throwing (one bad batch must not blank the board)', () => {
    const out = enrichBatch({ batchId: 'b1', designID: 'gone', pieceIDs: ['p1'] }, null, pieceById);
    expect(out.lineErrors).toEqual(['design not found']);
    expect(out.lines).toEqual([]);
    expect(out.designName).toBe('gone');
  });

  it('counts pieces that no longer exist', () => {
    const out = enrichBatch({ batchId: 'b1', designID: 'd1', pieceIDs: ['p1', 'ghost', 'ghost2'] }, design, pieceById);
    expect(out.lines[0].qty).toBe(1);
    expect(out.lineErrors).toContain('2 piece(s) no longer exist');
  });

  it('surfaces an unorderable metal as an error instead of a guessed line', () => {
    const out = enrichBatch({ batchId: 'b1', designID: 'd1', pieceIDs: ['p4'] }, design, pieceById);
    expect(out.lines).toEqual([]);
    expect(out.lineErrors[0]).toMatch(/no metal finish set/);
  });

  it('handles an empty batch', () => {
    const out = enrichBatch({ batchId: 'b1', designID: 'd1', pieceIDs: [] }, design, pieceById);
    expect(out.lines).toEqual([]);
    expect(out.lineErrors).toEqual([]);
  });

  it('falls back to the designID when the design has no name', () => {
    expect(enrichBatch({ designID: 'd9', pieceIDs: [] }, { variants: [] }, {}).designName).toBe('d9');
  });
});
