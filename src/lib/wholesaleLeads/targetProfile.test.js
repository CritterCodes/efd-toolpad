import { describe, expect, it } from 'vitest';
import { scoreWholesaleLeadFeatures } from './leadFeatures';
import { DEFAULT_TARGET_PROFILE, TARGET_PROFILES, defaultSearchQueries, targetProfile } from './targetProfile';

/**
 * The bug these guard: a fine jewelry store with its own bench scored 0 to 3 out of 100 and was filed
 * not_fit, because the only rubric was written for pawn shops. Marlen Jewelers — a store with a bench,
 * which sent 67 repairs in five weeks — is exactly that shape.
 */

const features = (over = {}) => ({
  has_jewelry: true,
  business_type: 'jewelry_store',
  pawn_signals: false,
  used_inventory_signals: false,
  refurbishment_opportunity: false,
  offers_repair: true,
  repair_capability: 0.8,
  in_house_repair: true,
  mature_in_house_repair: false,
  manual_process_likelihood: 0.2,
  process_maturity: 'digital',
  estimated_scale: 'small',
  repair_volume_signal: 0.7,
  revenue_opportunity: 0.6,
  sales_friction: 0.4,
  luxury_brand: false,
  chain_or_multi_location: false,
  outsourcing_evidence: false,
  turnaround_complaints: false,
  review_repair_evidence: true,
  review_owner_jeweler_evidence: true,
  review_service_mentions: ['ring sizing'],
  repeat_issues: false,
  contact_quality: 0.9,
  confidence: 0.7,
  truthSignals: { strongInHouse: true, outsourcingEvidence: false, turnaroundComplaints: false, repairVolume: 0.7 },
  signalBreakdown: {},
  ...over,
});

describe('target profiles', () => {
  it('defaults to fine jewelry', () => {
    expect(DEFAULT_TARGET_PROFILE).toBe('fine_jewelry');
    expect(targetProfile(undefined).key).toBe('fine_jewelry');
    expect(targetProfile('nonsense').key).toBe('fine_jewelry');
    expect(targetProfile('pawn').key).toBe('pawn');
  });

  it('does not search for pawn shops when targeting fine jewelry', () => {
    expect(defaultSearchQueries('fine_jewelry').join(' ')).not.toMatch(/pawn/i);
    expect(defaultSearchQueries('pawn').join(' ')).toMatch(/pawn/i);
  });

  it('a jewelry store with a bench is a prospect, not a rejection', () => {
    const pawnRun = scoreWholesaleLeadFeatures(features(), 'pawn');
    const fineRun = scoreWholesaleLeadFeatures(features(), 'fine_jewelry');

    // The old rubric capped this lead at 40 and filed it not_fit. That is the defect.
    expect(pawnRun.forceScoreCap).toBe(40);
    expect(pawnRun.tier).toBe('not_fit');

    expect(fineRun.forceScoreCap).toBeNull();
    expect(fineRun.fitScore).toBeGreaterThan(70);
    expect(fineRun.tier).not.toBe('not_fit');
  });

  it('ranks a store that sends work out above one that does not', () => {
    const quiet = scoreWholesaleLeadFeatures(features(), 'fine_jewelry');
    const outsourcing = scoreWholesaleLeadFeatures(features({
      outsourcing_evidence: true,
      truthSignals: { strongInHouse: true, outsourcingEvidence: true, turnaroundComplaints: false, repairVolume: 0.7 },
    }), 'fine_jewelry');

    expect(outsourcing.fitScore).toBeGreaterThan(quiet.fitScore);
    expect(outsourcing.tier).toBe('tier_1_replace_current_vendor');
  });

  it('stops paying for pawn signals under the fine jewelry profile', () => {
    const plain = scoreWholesaleLeadFeatures(features({ business_type: 'pawn_shop' }), 'fine_jewelry');
    const pawny = scoreWholesaleLeadFeatures(features({
      business_type: 'pawn_shop',
      pawn_signals: true,
      used_inventory_signals: true,
    }), 'fine_jewelry');

    // Still scored, still importable — just no longer rewarded for being a pawn shop.
    expect(pawny.fitScore - plain.fitScore).toBeLessThanOrEqual(TARGET_PROFILES.fine_jewelry.usedInventoryBonus);
    expect(TARGET_PROFILES.fine_jewelry.pawnSignalBonus).toBe(0);
  });

  it('does not claim a reason the active profile scored at zero', () => {
    const run = scoreWholesaleLeadFeatures(features({ pawn_signals: true }), 'fine_jewelry');
    expect(run.reasons.join(' ')).not.toMatch(/Pawn shop or pawn-style/);
  });

  it('keeps the pawn rubric byte-for-byte available', () => {
    expect(TARGET_PROFILES.pawn.pawnSignalBonus).toBe(18);
    expect(TARGET_PROFILES.pawn.refurbishmentBonus).toBe(16);
    expect(TARGET_PROFILES.pawn.strongInHouseFriction).toBe(40);
    expect(TARGET_PROFILES.pawn.capStrongInHouseAt).toBe(40);
  });

  it('still rejects a lead with no jewelry at all, whatever the target', () => {
    for (const key of ['fine_jewelry', 'pawn']) {
      const run = scoreWholesaleLeadFeatures(features({ has_jewelry: false, business_type: 'unclear' }), key);
      expect(run.hardNotFit).toBe(true);
      expect(run.tier).toBe('not_fit');
    }
  });
});
