import { describe, it, expect } from 'vitest';
import { depositFloor } from '@/services/customs/customInvoicePolicy';

/**
 * WHY 50% WORKED FOR YEARS, AND WHY BRYCE BROKE IT.
 *
 * At a 2.5× markup, COG is exactly 40% of retail — so a 50% deposit is 1.25 × COG and clears cost with
 * a quarter of COG to spare, on every job. Below ~2× blended it stops working, because then half of
 * retail is less than cost.
 *
 * CO-msnijwee-11bb75: the centre stone went in at 1.3× (a natural diamond cannot take keystone), the
 * blend came out 1.43×, COG was 70% of retail, and 50% would have been $1,307 short of cost.
 */
describe('depositFloor', () => {
  // The owner's typical job: COG 650, retail 1650 (dia 200 + mounting 200 + labour 250 at ~2.5×).
  const TYPICAL = { cog: 650, total: 1650 };
  // The real thin-margin job.
  const BRYCE = { cog: 4557.02, total: 6500.05 };

  it('a normal 2.5x job clears cost at 50% — which is why it never hurt', () => {
    const f = depositFloor({ ...TYPICAL, requestedPct: 50 });
    expect(f.requested).toBe(825);
    expect(f.floor).toBe(812.5);          // 650 × 1.25
    expect(f.clearsCost).toBe(true);
    expect(f.shortfall).toBe(0);
  });

  it('BRYCE: 50% does NOT clear cost, and says by how much', () => {
    const f = depositFloor({ ...BRYCE, requestedPct: 50 });
    expect(f.requested).toBe(3250.03);
    expect(f.floor).toBe(5696.28);        // 4557.02 × 1.25
    expect(f.clearsCost).toBe(false);
    expect(f.shortfall).toBe(2446.25);
  });

  it('reports the floor as a percentage of retail, because on a thin job it is most of the price', () => {
    expect(depositFloor(TYPICAL).floorPct).toBe(49.3);   // ~50% — the rule and the habit agree
    expect(depositFloor(BRYCE).floorPct).toBe(87.7);     // 88% — the honest consequence
  });

  it('what the owner actually charged Bryce was already almost exactly the rule', () => {
    // $5,500 of a $6,500.05 total = 84.6%, i.e. COG × 1.21 against a floor of COG × 1.25.
    const f = depositFloor({ ...BRYCE, requestedPct: 84.6 });
    expect(f.shortfall).toBeLessThan(200);
  });

  it('surfaces the blended markup, the thing that actually predicts the problem', () => {
    expect(depositFloor(TYPICAL).blendedMarkup).toBe(2.54);
    expect(depositFloor(BRYCE).blendedMarkup).toBe(1.43);
  });

  it('offers break-even and a 10% cushion as reference points', () => {
    const f = depositFloor(BRYCE);
    expect(f.breakEven).toBe(4557.02);        // covers cost, banks nothing
    expect(f.cushioned10).toBe(5012.72);
  });

  it('THE SUGGESTED PERCENTAGE ACTUALLY CLEARS THE FLOOR when typed in', () => {
    // floorPct is what the UI offers ("use 87.7%"). Rounding to nearest produced 87.6% on Bryce, which
    // is $2 short — a suggestion that fails when you follow it is worse than no suggestion at all.
    for (const job of [TYPICAL, BRYCE]) {
      const pct = depositFloor(job).floorPct;
      expect(depositFloor({ ...job, requestedPct: pct }).clearsCost).toBe(true);
    }
  });

  it('a 100% deposit always clears cost on any job with positive margin', () => {
    expect(depositFloor({ ...BRYCE, requestedPct: 100 }).clearsCost).toBe(true);
  });

  it('does not divide by zero on an unpriced quote', () => {
    const f = depositFloor({ cog: 0, total: 0, requestedPct: 50 });
    expect(f.floorPct).toBe(0);
    expect(f.blendedMarkup).toBe(0);
    expect(f.clearsCost).toBe(true);          // nothing owed, nothing to cover
  });

  it('copes with missing input rather than throwing in the quote builder', () => {
    expect(() => depositFloor()).not.toThrow();
    expect(() => depositFloor({})).not.toThrow();
  });
});
