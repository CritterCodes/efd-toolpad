const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const normalizeText = (text) => String(text || '').toLowerCase();
const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const STRONG_IN_HOUSE_PATTERNS = [
  /\bmaster jeweler\b/,
  /\bon-?site jeweler\b/,
  /\bin-?house jeweler\b/,
  /\bin-?house repair\b/,
  /\bour goldsmith\b/,
  /\bstaff goldsmith\b/,
  /\bbench jeweler on staff\b/,
  /\bbench jeweler\b.{0,80}\bstaff\b/,
  /\bstaff\b.{0,80}\bbench jeweler\b/,
  /\bwatchmaker on staff\b/,
  /\bjeweler on staff\b/,
  /\bfull service repair department\b/,
];

const STAFF_ROLE_PATTERNS = [
  /\bteam\b.{0,120}\bjeweler\b/,
  /\bstaff\b.{0,120}\bjeweler\b/,
  /\babout\b.{0,120}\bgoldsmith\b/,
  /\bteam\b.{0,120}\bgoldsmith\b/,
  /\bwatchmaker\b.{0,120}\bexperience\b/,
  /\bdesigner\b.{0,80}\bjeweler\b/,
];

const WEAK_REPAIR_PATTERNS = [
  /\bjewelry repair\b/,
  /\brepair services\b/,
  /\bring sizing\b/,
  /\bwatch battery\b/,
  /\bstone setting\b/,
  /\bchain repair\b/,
];

export function detectInHouseStrength(text = '') {
  const normalized = normalizeText(text);
  const strongSignal = includesAny(normalized, STRONG_IN_HOUSE_PATTERNS);
  const staffSignal = includesAny(normalized, STAFF_ROLE_PATTERNS);
  const weakRepairSignal = includesAny(normalized, WEAK_REPAIR_PATTERNS);

  let inHouseRepairStrength = 0;
  if (strongSignal) inHouseRepairStrength = 0.9;
  else if (staffSignal) inHouseRepairStrength = 0.75;
  else if (weakRepairSignal) inHouseRepairStrength = 0.25;

  return {
    inHouseRepairStrength: clamp01(inHouseRepairStrength),
    hasStrongInHouse: inHouseRepairStrength >= 0.8,
    strongSignal,
    staffSignal,
    weakRepairSignal,
  };
}
