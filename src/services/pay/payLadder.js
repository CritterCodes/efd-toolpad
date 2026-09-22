/**
 * Pay ladder (owner, 2026-09-22). Two numbers that used to be one:
 *
 *   SHOP RATE  — adminSettings.pricing.wage. The pricing input: every task's hours × this is the base
 *                the customer is charged from (× businessMultiplier retail, × wholesaleMarkup for
 *                stores). It does not move when someone is hired.
 *   PAY RATE   — what a jeweler is CREDITED per proficient task-hour at QC pass. Negotiated per person
 *                against a published ladder with bench-test requirements, so a walk-in can be placed
 *                on a tier by a set test instead of a guess. Stored on the user:
 *                  employment.payTier   — ladder tier key (or '' when custom / unplaced)
 *                  employment.hourlyRate — the rate actually credited (tier rate, or a custom override)
 *                Both are privileged leaves: only PATCH /api/users/[userID]/pay-rate (admin/dev) writes them.
 *
 * Resolution (resolvePayRate): explicit hourlyRate → tier rate → shop rate. The owner-operator, and
 * anyone never placed, therefore keep earning the shop rate exactly as before this change. Labor logs
 * snapshot the rate at sign-off, so changing a tier or a rate never reprices history.
 *
 * The ladder itself lives at adminSettings.payLadder (Settings → Store → Pay ladder). The defaults below
 * are the owner's starting draft; the requirements are meant to be edited in the UI.
 */
import { db } from '@/lib/database';

export const SETTINGS_ID = 'repair_task_admin_settings';

export const DEFAULT_LADDER = Object.freeze({
  tiers: [
    {
      key: 'apprentice',
      label: 'Apprentice',
      rate: 22,
      summary: 'Learning the bench under review. Every job passes a separate QC.',
      requirements: [
        'Clean, polish and rhodium a customer piece to shop standard without wearing detail.',
        'Solder a jump ring closed with no visible seam.',
        'Size a sterling ring down one size: straight, round, no pits or porosity (time not scored).',
        'Torch, laser and chemical safety walkthrough signed off.',
      ],
    },
    {
      key: 'bench-jeweler',
      label: 'Bench jeweler',
      rate: 30,
      summary: 'Proficient at the task-catalog pace: the catalog hours are your hours or better.',
      requirements: [
        'Size a 14k ring up and down within the catalog time (0.5 h) with an invisible seam and matching finish.',
        'Retip four prongs on a customer-grade head with even, symmetrical tips.',
        'Tighten and replace a stone in a prong setting; check and secure all remaining stones.',
        'Repair a chain (solder and laser) and replace a clasp.',
        'Basic laser welding: seam and fill without undercutting.',
        'Assess a walk-in repair and pick the right catalog tasks with no admin correction.',
      ],
    },
    {
      key: 'senior-jeweler',
      label: 'Senior jeweler',
      rate: 38,
      summary: 'Takes anything that comes in the door; eligible to pass QC for others.',
      requirements: [
        'Size platinum with a clean, non-porous seam and matching finish.',
        'Replace a head and re-set the center stone, including a fancy-cut stone.',
        'Repair channel and bead set stones without loosening neighbors.',
        'Repair hollow rope and herringbone chain invisibly.',
        'Complete a shop QC checklist on another jeweler’s work with no misses over a review week.',
      ],
    },
    {
      key: 'master',
      label: 'Master',
      rate: 50,
      summary: 'Full custom bench from casting to finish; trains and QCs the shop.',
      requirements: [
        'Fabricate a piece from sheet and wire to a drawing.',
        'Finish a casting to customer-ready, including pavé or invisible setting.',
        'Set a shop standard and train an apprentice to it.',
      ],
    },
  ],
});

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Pure: validate + coerce a ladder from any input. Throws on an unusable tier. */
export function normalizeLadder(input = {}) {
  const raw = Array.isArray(input?.tiers) ? input.tiers : [];
  const seen = new Set();
  const tiers = raw.map((t, i) => {
    const label = String(t?.label || '').trim();
    if (!label) throw new Error(`Tier ${i + 1} needs a label.`);
    const key = slug(t?.key || label);
    if (!key) throw new Error(`Tier "${label}" needs a key.`);
    if (seen.has(key)) throw new Error(`Duplicate tier "${key}".`);
    seen.add(key);
    const rate = round2(t?.rate);
    if (!(rate > 0)) throw new Error(`Tier "${label}" needs an hourly rate above zero.`);
    const requirements = (Array.isArray(t?.requirements) ? t.requirements : String(t?.requirements || '').split('\n'))
      .map((r) => String(r || '').trim()).filter(Boolean);
    return { key, label, rate, summary: String(t?.summary || '').trim(), requirements };
  });
  if (tiers.length === 0) throw new Error('A ladder needs at least one tier.');
  return { tiers };
}

/** Pure: the ladder a settings document declares, or the defaults. */
export function ladderFromSettings(settings) {
  try {
    return normalizeLadder(settings?.payLadder);
  } catch {
    return { tiers: DEFAULT_LADDER.tiers.map((t) => ({ ...t, requirements: [...t.requirements] })) };
  }
}

export function tierByKey(ladder, key) {
  return (ladder?.tiers || []).find((t) => t.key === key) || null;
}

/**
 * Pure: the rate a user is credited at, and where it came from.
 *   custom — employment.hourlyRate set and not equal to their tier's rate
 *   tier   — placed on a tier (rate = tier rate, whether stored explicitly or not)
 *   shop   — never placed: the shop rate (the pre-ladder behavior)
 */
export function resolvePayRate(user = {}, ladder = DEFAULT_LADDER, shopWage = 0) {
  const emp = user?.employment || {};
  const tier = tierByKey(ladder, emp.payTier);
  const explicit = Number(emp.hourlyRate);
  if (explicit > 0) {
    // A stored rate equal to the shop rate with no tier is the pre-ladder default (every on-site
    // jeweler was saved with hourlyRate = wage), not a negotiation — report it as the shop rate.
    const source = tier && round2(explicit) === round2(tier.rate) ? 'tier'
      : (!tier && round2(explicit) === round2(shopWage)) ? 'shop' : 'custom';
    return { rate: round2(explicit), source, tierKey: tier?.key || '', tierLabel: tier?.label || '' };
  }
  if (tier) return { rate: round2(tier.rate), source: 'tier', tierKey: tier.key, tierLabel: tier.label };
  return { rate: round2(shopWage), source: 'shop', tierKey: '', tierLabel: '' };
}

export async function readLadder() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { payLadder: 1 } });
  return ladderFromSettings(doc);
}

export async function writeLadder(input, { actor = '' } = {}) {
  const next = normalizeLadder(input);
  const dbi = await db.connect();
  // Dot-path $set of the whole ladder block only; nothing else on the settings doc is touched.
  await dbi.collection('adminSettings').updateOne(
    { _id: SETTINGS_ID },
    { $set: { payLadder: { ...next, updatedAt: new Date(), updatedBy: actor }, updatedAt: new Date() } },
  );
  return next;
}
