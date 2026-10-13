import { describe, expect, it } from 'vitest';
import { gateCandidate } from './candidateGate';

/**
 * Every fixture below is a real row from the 2026-10-13 import, with the name and `types` exactly as
 * Google returned them. The junk cases are what the run actually saved.
 */
describe('candidate gate', () => {
  it('keeps what Google itself calls a jeweller', () => {
    expect(gateCandidate({ name: "Cheshier's Fine Jewelry", types: ['jewelry_store', 'store', 'establishment'] }).keep).toBe(true);
  });

  it('keeps a thinly-typed shop whose name says jewellery', () => {
    // Both scored 100 in the real run with no jewellery type on them at all. A types-only gate would
    // have thrown away the two best leads of the day.
    expect(gateCandidate({ name: "Michael's Jewelry", types: ['establishment', 'point_of_interest'] })).toEqual({ keep: true, reason: 'named_jewelry' });
    expect(gateCandidate({ name: "Lindy's Jewelry & Repair", types: ['establishment', 'point_of_interest'] }).keep).toBe(true);
  });

  it('drops the antique malls and flea markets the run imported', () => {
    for (const name of ['Remember When Antique Mall', "Lisa's Eagle Nest Flea Market", 'Fort Smith Antiques', 'The Garden Vintage']) {
      expect(gateCandidate({ name, types: ['home_goods_store', 'establishment', 'point_of_interest'] }).keep).toBe(false);
    }
    expect(gateCandidate({ name: 'Remember When Antique Mall', types: ['establishment', 'point_of_interest'] }).keep).toBe(false);
  });

  it('drops the bridal and prom shops — one of which it had scored 88', () => {
    for (const name of ['She Said Yes Bridal', 'Bridal Elegance', 'Violets Bridal & Formal', "Sheri's Bridal and Formal", 'Facchianos Bridal and Formal Attire']) {
      expect(gateCandidate({ name, types: ['clothing_store', 'store', 'establishment'] }).keep).toBe(false);
    }
  });

  it('drops pawn shops and coin dealers under the fine-jewellery target', () => {
    expect(gateCandidate({ name: 'A & B Pawn & Jewelry', types: ['finance', 'establishment'] })).toEqual({ keep: false, reason: 'pawn_or_coin' });
    expect(gateCandidate({ name: 'Towson Gold, Silver & Coin', types: ['finance', 'establishment'] }).keep).toBe(false);
  });

  it('still admits a pawn shop Google files as a jewellery store, because the rubric decides that', () => {
    // The gate decides what is worth LOOKING at; the scoring profile decides what is worth CALLING.
    expect(gateCandidate({ name: "Greer's Coin & Pawn", types: ['jewelry_store', 'finance', 'store'] }).keep).toBe(true);
  });

  it('drops a boutique, a market and a general store', () => {
    expect(gateCandidate({ name: "Savannah's Boutique & Gift", types: ['clothing_store', 'establishment'] }).keep).toBe(false);
    expect(gateCandidate({ name: 'Main Street Mercantile', types: ['bakery', 'clothing_store', 'food', 'furniture_store'] }).keep).toBe(false);
    expect(gateCandidate({ name: 'The Classic Kitten Vintage Fashion', types: ['clothing_store', 'establishment'] }).keep).toBe(false);
  });

  it('drops anything with no jewellery signal at all', () => {
    expect(gateCandidate({ name: 'Noble Trading Post', types: ['establishment', 'point_of_interest'] })).toEqual({ keep: false, reason: 'no_jewelry_signal' });
    expect(gateCandidate({})).toEqual({ keep: false, reason: 'no_jewelry_signal' });
    expect(gateCandidate({ name: '', types: [] }).keep).toBe(false);
  });

  it('is case- and shape-insensitive about types', () => {
    expect(gateCandidate({ name: 'x', types: ['JEWELRY_STORE'] }).keep).toBe(true);
    expect(gateCandidate({ name: 'x', types: null }).keep).toBe(false);
  });
});
