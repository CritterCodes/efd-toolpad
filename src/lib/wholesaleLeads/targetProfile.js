/**
 * Who are we trying to sign? The lead scorer's rubric, as a named profile.
 *
 * Until 2026-10-13 there was one rubric and it was built for pawn shops: +18 for a pawn signal, +16 for
 * refurbishment, +12 for used inventory — and, against any store with a bench, +40 friction AND a hard
 * score cap of 40. Thirteen of the 44 leads it rejected were real jewelry stores thrown out for having
 * a jeweler on staff (Underwoods, Sissy's Log Cabin, Cecil's Fine Jewelry — all scored 0 to 3).
 *
 * That is backwards for the account we actually want more of. Marlen Jewelers has its own bench, is
 * 700 miles away, and sent 67 repairs in its first five weeks — more than every local pawn account
 * together. A store with a bench that still ships work out is the best shape there is: it has volume,
 * it knows good work from bad, and it already has a vendor we can replace.
 *
 * Jacob West, 2026-10-13: "Personally, I would say no to pawn shops. Try to focus on fine jewelry
 * stores. If all else fails, pawn shops can be targeted later."
 *
 * So the rubric became a choice rather than a rewrite. `fine_jewelry` is the default; `pawn` preserves
 * the old numbers exactly, so the previous targeting is one option away rather than gone.
 *
 * Nothing already scored changes until someone runs a rescore.
 */

export const DEFAULT_TARGET_PROFILE = 'fine_jewelry';

const FINE_JEWELRY_TYPES = ['jewelry_store', 'bridal_jewelry', 'luxury_retailer'];

/**
 * Every number the rubric varies by target. `pawn` is the rubric as it stood before this file existed;
 * read the two columns side by side to see what changed and by how much.
 */
export const TARGET_PROFILES = {
  fine_jewelry: {
    key: 'fine_jewelry',
    label: 'Fine jewelry stores',
    description: 'Jewelry stores with real repair volume, especially ones already sending work out.',
    searchQueries: [
      'fine jewelry store',
      'independent jeweler',
      'jewelry repair',
      'bridal jewelry store',
      'custom jewelry designer',
      'estate jewelry store',
    ],
    // Steers Gemini's feature EXTRACTION, which decides the facts the rubric then scores. Leaving the
    // pawn wording here while scoring for fine jewelry would have the model report the wrong things.
    extractionGuidance: [
      'EFD is strongest for independent fine jewelry and bridal stores with real repair volume, especially ones that send repair work out to a trade shop, run slow on turnaround, or have more work than their bench can take.',
      'A store with its own jeweler is still a good prospect: note the bench honestly, and pay close attention to any sign of overflow, outsourcing, or delay. Big chains and stores with no jewelry are the poor fits.',
    ],
    // Opportunity
    fineJewelryTypeBonus: 16,
    pawnSignalBonus: 0,
    usedInventoryBonus: 4,
    refurbishmentBonus: 6,
    outsourcingBonus: 22,
    turnaroundBonus: 20,
    reviewRepairBonus: 14,
    // Friction
    inHouseBaseFriction: 4,
    inHouseCapabilityFriction: 4,
    matureInHouseFriction: 8,
    strongInHouseFriction: 6,
    luxuryFriction: 4,
    // Hard rules
    capStrongInHouseAt: null,
    luxuryCapabilityIsHardNotFit: false,
    matureInHouseIsHardNotFitWhenLuxury: false,
    tier1NeedsManualProcess: false,
  },
  pawn: {
    key: 'pawn',
    label: 'Pawn shops and resale',
    description: 'The original rubric: pawn, estate and gold-buying businesses with manual repair intake.',
    searchQueries: [
      'independent jeweler',
      'jewelry repair',
      'watch repair',
      'pawn shop jewelry',
      'bridal jewelry store',
      'local jewelry store',
    ],
    extractionGuidance: [
      'EFD is strongest for pawn shops, smaller operators, jewelry sellers without repair infrastructure, businesses with used jewelry/refurbishment opportunity, and stores likely using manual repair intake.',
      'Mature in-house repair, luxury positioning, big chains, and polished full-service repair departments increase sales friction.',
    ],
    fineJewelryTypeBonus: 0,
    pawnSignalBonus: 18,
    usedInventoryBonus: 12,
    refurbishmentBonus: 16,
    outsourcingBonus: 12,
    turnaroundBonus: 12,
    reviewRepairBonus: 10,
    inHouseBaseFriction: 8,
    inHouseCapabilityFriction: 12,
    matureInHouseFriction: 25,
    strongInHouseFriction: 40,
    luxuryFriction: 18,
    capStrongInHouseAt: 40,
    luxuryCapabilityIsHardNotFit: true,
    matureInHouseIsHardNotFitWhenLuxury: true,
    tier1NeedsManualProcess: true,
  },
};

export const TARGET_PROFILE_KEYS = Object.keys(TARGET_PROFILES);

/**
 * Resolve a profile by name. An unknown or missing name falls back to the default rather than throwing:
 * a lead scored before this existed carries no profile, and it must still score.
 */
export function targetProfile(name) {
  return TARGET_PROFILES[name] || TARGET_PROFILES[DEFAULT_TARGET_PROFILE];
}

export function isFineJewelryType(businessType) {
  return FINE_JEWELRY_TYPES.includes(businessType);
}

/**
 * The queries a Google Places import runs when the caller names none.
 */
export function defaultSearchQueries(name) {
  return [...targetProfile(name).searchQueries];
}
