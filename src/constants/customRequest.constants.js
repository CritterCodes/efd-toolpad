/**
 * Canonical option lists for a CUSTOM REQUEST / custom order spec — shared by the
 * admin "New Custom" form (NewCustomStepper), the OverviewTab edit dialog, and the
 * customer-facing efd-shop request form. Mirror: efd-shop/lib/customRequest.constants.js
 * (same `value`s so a shop submission maps cleanly onto a customOrder).
 *
 * METAL_TYPES / GOLD_COLORS / getKaratOptions are the SINGLE SOURCE OF TRUTH for
 * metal + karat handling and are also imported by the new-repair form
 * (app/components/repairs/NewRepairForm.js) so custom intake behaves EXACTLY like
 * repair intake: metal = gold/silver/platinum/costume, karat options cascade from
 * the chosen metal, karat + gold color reset when the metal changes, and gold
 * exposes a colour. Title is intentionally absent — custom requests are labelled by
 * jewelry type + metal, not a free title.
 */

// Metal + karat — cascading model (karat options depend on the metal).
export const METAL_TYPES = [
  { value: 'gold', label: 'Gold', karatOptions: ['10k', '14k', '18k', '22k'] },
  { value: 'silver', label: 'Silver', karatOptions: ['925', '999'] },
  { value: 'platinum', label: 'Platinum', karatOptions: ['950', '999'] },
  { value: 'costume', label: 'Costume', karatOptions: [] },
];

export const GOLD_COLORS = [
  { value: 'yellow', label: 'Yellow Gold' },
  { value: 'white', label: 'White Gold' },
  { value: 'rose', label: 'Rose Gold' },
];

/** Karat options for a given metal value (empty for costume / unknown). */
export const getKaratOptions = (metalType) =>
  METAL_TYPES.find((m) => m.value === metalType)?.karatOptions || [];

export const JEWELRY_TYPES = [
  'Engagement Ring', 'Wedding Band', 'Ring', 'Necklace', 'Pendant',
  'Bracelet', 'Earrings', 'Cufflinks', 'Brooch', 'Other',
];

// Budget is captured as a range (matches the shop); stored as the string label.
export const BUDGET_RANGES = [
  'Under $1,000', '$1,000 - $2,500', '$2,500 - $5,000', '$5,000 - $10,000',
  '$10,000 - $25,000', '$25,000 - $50,000', 'Over $50,000', "Let's discuss",
];

// Timeline replaces a hard due-date for intake; short windows imply a rush.
export const TIMELINE_OPTIONS = [
  'No rush', '1-2 weeks', '2-4 weeks', '1-2 months', '2-3 months', '3-6 months', 'Specific date',
];
export const RUSH_TIMELINES = new Set(['1-2 weeks', '2-4 weeks']);
export const isRushTimeline = (timeline) => RUSH_TIMELINES.has(String(timeline || ''));

export const GEMSTONE_OPTIONS = [
  'Natural Diamonds', 'Lab Grown Diamonds', 'Moissanite', 'Sapphire', 'Ruby', 'Emerald',
  'Tanzanite', 'Aquamarine', 'Topaz', 'Amethyst', 'Citrine', 'Garnet', 'Peridot', 'Opal',
  'Pearl', 'Turquoise', 'Onyx', 'Jade', 'Labradorite', 'Moonstone', 'Rose Quartz',
];

const titleCase = (s) => String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

/** Human metal label: gold qualified by colour ("Yellow Gold"), else the metal label. */
export function metalDisplay(metalType, goldColor) {
  if (!metalType) return '';
  if (metalType === 'gold') {
    return GOLD_COLORS.find((c) => c.value === goldColor)?.label || 'Gold';
  }
  return METAL_TYPES.find((m) => m.value === metalType)?.label || titleCase(metalType);
}

export const karatLabel = (value) => (value ? String(value).toUpperCase() : '');

/**
 * The human label for a custom order (title is deprecated). Prefers the jewelry
 * type, optionally qualified by metal, and falls back to a legacy title or generic.
 */
export function customOrderLabel(order = {}) {
  const jt = titleCase(order.jewelryType);
  if (jt) {
    const metal = metalDisplay(order.metalType, order.goldColor);
    return metal ? `${jt} · ${metal}` : jt;
  }
  return order.title || 'Custom Order';
}
