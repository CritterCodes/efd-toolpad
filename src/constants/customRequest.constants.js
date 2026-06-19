/**
 * Canonical option lists for a CUSTOM REQUEST / custom order spec — shared by the
 * admin "New Custom" form (NewCustomStepper) and the customer-facing efd-shop
 * request form. Keep these in sync with efd-shop/app/lib/customRequest.constants.js
 * (mirror; same `value`s so a shop submission maps cleanly onto a customOrder).
 *
 * Metal + karat reuse the SAME options the repair intake uses (materials.constants),
 * so the custom form matches the new-repair form exactly. Title is intentionally
 * absent — custom requests are labelled by jewelry type + customer, not a free title.
 */
import { METAL_OPTIONS, KARAT_OPTIONS } from '@/utils/materials.constants';

export { METAL_OPTIONS, KARAT_OPTIONS };

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

export const metalLabel = (value) => METAL_OPTIONS.find((m) => m.value === value)?.label || titleCase(value);
export const karatLabel = (value) => KARAT_OPTIONS.find((k) => k.value === value)?.label || (value || '');

/**
 * The human label for a custom order (title is deprecated). Prefers the jewelry
 * type, optionally qualified by metal, and falls back to a legacy title or generic.
 */
export function customOrderLabel(order = {}) {
  const jt = titleCase(order.jewelryType);
  if (jt) {
    const metal = order.metalType ? metalLabel(order.metalType) : '';
    return metal ? `${jt} · ${metal}` : jt;
  }
  return order.title || 'Custom Order';
}
