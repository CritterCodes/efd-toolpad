import { extractRingSizesFromDescription } from '@/services/repairs/smartIntakeExtractors';
import { ringSizeNumber } from '@/services/repairs/ringSizing';
import { sizingStockFor, isSizeUpTask, isCustomerGoldTask, taskRoles } from '@/services/ai/smartIntakeRules';
import { alignTasksToMetal } from '@/services/repairs/metalTaskFilter';
// Item categories that might have sizes
export const SIZEABLE_CATEGORIES = ['ring', 'band', 'wedding-ring', 'engagement-ring'];

export const TASK_INFERENCE_RULES = [
  { regex: /size\s*down|sizing\s*down/, keywords: ['size down'] },
  { regex: /size\s*up|sizing\s*up/, keywords: ['size up'] },
  { regex: /(resize|re-?size|sizing)/, keywords: ['resize', 'sizing', 'ring size'] },
  { regex: /(prong|retip|re-tip|tip repair|tighten stone|stone tighten|loose stone)/, keywords: ['prong', 'retip', 'tighten', 'stone'] },
  { regex: /(solder|chain repair|jump ring|weld)/, keywords: ['solder', 'chain', 'jump ring', 'weld'] },
  { regex: /(rhodium|replate|re-plate|plating|plate)/, keywords: ['rhodium', 'plate', 'plating', 'replate'] },
  { regex: /(polish|buff|clean|refinish)/, keywords: ['polish', 'buff', 'clean', 'refinish'] },
  { regex: /(clasp|lock|latch)/, keywords: ['clasp', 'lock', 'latch'] }
];



export const normalizeIsoPromiseDate = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildLocalDate = (year, monthIndex, day) => new Date(year, monthIndex, day, 12, 0, 0, 0);

export const formatLocalDateIso = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const parsePromiseDateFromDescription = (description = '', referenceDate = new Date()) => {
  const text = String(description || '').trim();
  const lower = text.toLowerCase();
  if (!lower) return '';

  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3] || referenceDate.getFullYear());
    if (year < 100) year += 2000;
    const parsed = buildLocalDate(year, month, day);
    return formatLocalDateIso(parsed);
  }

  const monthNameMatch = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/);
  if (monthNameMatch) {
    const monthIndex = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(monthNameMatch[1]);
    const day = Number(monthNameMatch[2]);
    const year = Number(monthNameMatch[3] || referenceDate.getFullYear());
    return formatLocalDateIso(buildLocalDate(year, monthIndex, day));
  }

  if (/\bdue\s+today\b|\btoday\b/.test(lower)) {
    return formatLocalDateIso(referenceDate);
  }

  if (/\bdue\s+tomorrow\b|\btomorrow\b/.test(lower)) {
    return formatLocalDateIso(addDays(referenceDate, 1));
  }

  const weekdayMatch = lower.match(/\b(?:due|by|on|for)?\s*(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekdayMatch) {
    const weekdayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const modifier = weekdayMatch[1] || '';
    const targetDay = weekdayMap[weekdayMatch[2]];
    const currentDay = referenceDate.getDay();
    let delta = (targetDay - currentDay + 7) % 7;

    if (modifier === 'next') {
      delta = delta === 0 ? 7 : delta;
    } else if (!modifier) {
      delta = delta === 0 ? 0 : delta;
    }

    return formatLocalDateIso(addDays(referenceDate, delta));
  }

  return '';
};

/**
 * How far the ring moves. 0 when either size is unknown — a blank size is NOT size 0 (owner, 2026-10-01, Q12);
 * reading it as 0 made a blank current size with a desired 8 look like an eight-size jump.
 */
export const getRingSizeDelta = (currentRingSize = '', desiredRingSize = '') => {
  const current = ringSizeNumber(currentRingSize);
  const desired = ringSizeNumber(desiredRingSize);
  if (current === null || desired === null) return 0;
  return Math.round((desired - current) * 100) / 100;
};

export const getAdditionalSizingMaterialQuantity = (currentRingSize = '', desiredRingSize = '') => {
  const delta = getRingSizeDelta(currentRingSize, desiredRingSize);
  if (delta <= 1) return 0;
  // Charged by the whole size, rounded up (owner, 2026-11-09: "1.25 sizes is charged as 2") — never half a piece of stock.
  return Math.ceil(delta) - 1;
};

export const inferMaterialHintsFromSmartIntake = ({
  inputText = '',
  isRing = false,
  currentRingSize = '',
  desiredRingSize = ''
} = {}) => {
  const normalizedText = String(inputText || '').toLowerCase();
  const extraSizingMaterialQty = getAdditionalSizingMaterialQuantity(currentRingSize, desiredRingSize);

  if (!isRing || extraSizingMaterialQty <= 0) {
    return [];
  }

  if (!/(size\s*up|sizing\s*up|resize|re-?size|sizing)/.test(normalizedText)) {
    return [];
  }

  return [{
    type: 'sizing_material',
    quantity: extraSizingMaterialQty,
    reason: `Ring is sizing up beyond the first included size (${currentRingSize} to ${desiredRingSize}).`
  }];
};

// Disambiguate conflicting sizing tasks (Size Up vs Size Down) based on ring sizes or input text
export const disambiguateSizingTasks = (tasks, inputText = '', currentSize = '', desiredSize = '') => {
  const titles = tasks.map((t) => (t?.title || t?.displayName || t?.name || '').toLowerCase());
  const hasSizeUp = titles.some((t) => t.includes('size up'));
  const hasSizeDown = titles.some((t) => t.includes('size down'));
  if (!hasSizeUp || !hasSizeDown) return tasks;

  const text = String(inputText || '').toLowerCase();
  const current = parseFloat(currentSize);
  const desired = parseFloat(desiredSize);
  let keepDirection = '';

  if (Number.isFinite(current) && Number.isFinite(desired) && current !== desired) {
    keepDirection = desired > current ? 'up' : 'down';
  } else if (/size\s*down|sizing\s*down/.test(text)) {
    keepDirection = 'down';
  } else if (/size\s*up|sizing\s*up/.test(text)) {
    keepDirection = 'up';
  }

  if (!keepDirection) return tasks;
  const removeWord = keepDirection === 'up' ? 'size down' : 'size up';
  return tasks.filter((t) => {
    const title = (t?.title || t?.displayName || t?.name || '').toLowerCase();
    return !title.includes(removeWord);
  });
};

export const inferTasksFromDescription = (description = '', availableTasks = []) => {
  const text = String(description || '').toLowerCase();
  if (!text.trim() || !Array.isArray(availableTasks) || availableTasks.length === 0) {
    return [];
  }

  const inferred = [];

  for (const rule of TASK_INFERENCE_RULES) {
    if (!rule.regex.test(text)) {
      continue;
    }

    const matchedTask = availableTasks.find((task) => {
      const taskText = `${task?.title || ''} ${task?.displayName || ''} ${task?.name || ''} ${task?.description || ''}`.toLowerCase();
      return rule.keywords.some((keyword) => taskText.includes(keyword));
    });

    if (matchedTask) {
      inferred.push(matchedTask);
    }
  }

  const deduped = [];
  const seen = new Set();

  for (const task of inferred) {
    const key = String(task?._id || task?.id || task?.title || task?.displayName || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(task);
  }

  const sizes = extractRingSizesFromDescription(description);
  return disambiguateSizingTasks(deduped, description, sizes.currentRingSize, sizes.desiredRingSize).slice(0, 2);
};


export const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeMetalType = (metalType = '') => String(metalType || '').trim().toLowerCase().replace(/\s+/g, '_');

export const getMetalAliases = (metalType = '', goldColor = '') => {
  const normalized = normalizeMetalType(metalType);
  const normalizedGoldColor = String(goldColor || '').trim().toLowerCase();

  if (normalized === 'gold' && normalizedGoldColor) {
    const colorAliasMap = {
      yellow: ['yellow_gold', 'yellow gold', 'gold'],
      white: ['white_gold', 'white gold', 'gold'],
      rose: ['rose_gold', 'rose gold', 'gold'],
      red: ['rose_gold', 'red_gold', 'rose gold', 'red gold', 'gold']
    };

    return colorAliasMap[normalizedGoldColor] || ['gold'];
  }

  const aliasesByType = {
    gold: ['gold', 'yellow_gold', 'white_gold', 'rose_gold', 'yellow gold', 'white gold', 'rose gold'],
    silver: ['silver', 'sterling_silver', 'sterling silver', 'argentium_silver', 'fine_silver', '925'],
    platinum: ['platinum', 'platinum_iridium', '950'],
    palladium: ['palladium', '950'],
    titanium: ['titanium'],
    stainless: ['stainless', 'stainless_steel', 'steel']
  };

  if (aliasesByType[normalized]) {
    return aliasesByType[normalized];
  }

  return [normalized, normalized.replace(/_/g, ' ')].filter(Boolean);
};

export const normalizeKaratToken = (karat = '') => {
  const normalized = String(karat || '').trim().toLowerCase();
  if (!normalized) return '';
  if (/^\d+$/.test(normalized)) return normalized;
  if (/^\d+k$/.test(normalized)) return normalized;
  return normalized.replace(/\s+/g, '');
};

export const keyMatchesContext = (key = '', metalType = '', karat = '', goldColor = '') => {
  const keyRaw = String(key || '');
  const keyNormalized = keyRaw.toLowerCase();
  const keyTokenized = keyNormalized.replace(/[^a-z0-9]+/g, ' ');

  const metalAliases = getMetalAliases(metalType, goldColor);
  const karatToken = normalizeKaratToken(karat);

  const hasMetal = metalAliases.some((alias) => {
    const aliasNorm = alias.toLowerCase();
    const aliasSpaced = aliasNorm.replace(/_/g, ' ');
    return keyNormalized.includes(aliasNorm) || keyTokenized.includes(aliasSpaced);
  });

  const hasKarat = karatToken
    ? keyNormalized.includes(karatToken) || keyTokenized.includes(karatToken.replace('k', ' k'))
    : false;

  return {
    hasMetal,
    hasKarat,
    hasExactContext: hasMetal && hasKarat
  };
};

/**
 * The STORE's resale markup, from its own account settings — what it charges its customer, on its own
 * receipts. Not our pricing: it never changes what EFD charges the store.
 */
export const normalizeWholesalerPricingSettings = (settings = {}) => {
  const clamp = (value) => {
    const parsed = toNumber(value, 1);
    return Math.min(Math.max(parsed, 0.5), 5);
  };

  const normalizeTaxRate = (value) => {
    const parsed = toNumber(value, 0);
    const normalized = parsed > 1 ? parsed / 100 : parsed;
    return Math.min(Math.max(normalized, 0), 0.25);
  };

  const legacyMarkup = toNumber(
    settings?.retailMarkups?.tasks ??
    settings?.retailMarkups?.processes ??
    settings?.retailMarkups?.materials,
    1
  );

  return {
    retailMarkupMultiplier: clamp(
      settings?.wholesalerPricingSettings?.retailMarkupMultiplier ??
      settings?.retailMarkupMultiplier ??
      legacyMarkup
    ),
    taxRate: normalizeTaxRate(
      settings?.wholesalerPricingSettings?.taxRate ??
      settings?.taxRate ??
      0
    )
  };
};


/** Is this material sizing stock? By its category, or by name for materials filed without one. */
export const isSizingStockMaterial = (material) => (
  String(material?.category || '').toLowerCase() === 'sizing_material'
  || /sizing stock/i.test(`${material?.name || ''} ${material?.displayName || ''}`)
);

/**
 * Does the sizing stock on the ticket match its sizes? Smart intake works the stock out once, when the sentence is
 * read; changing a size afterwards, or adding a size-up by hand, left the old stock — an under- or over-charge nobody
 * saw, and the save does not check it (review, 2026-11-09). The form shows this instead of guessing a fix.
 *
 * Returns null when there is nothing to say, else { want, have, moved, line, lineQuantity } — `line` is the stock line
 * to correct and `lineQuantity` what IT should become so the ticket's total is `want` (0 = remove it). With two stock
 * lines the others are counted first: setting the first line to the whole total over-charged (Codex review of #346).
 * The rule is the owner's (2026-11-09: "2 sizes up is 1x task and 1x sizing stock material"; "1.25 sizes is charged as
 * 2"), from smartIntakeRules.sizingStockFor, the same function the server uses.
 */
export function sizingStockCheck(formData = {}) {
  const sizeUp = (formData.tasks || []).find(isSizeUpTask);
  const stockLines = (formData.materials || []).filter(isSizingStockMaterial);
  const have = stockLines.reduce((n, m) => n + (Number(m.quantity) || 0), 0);
  if (!sizeUp && !have) return null;
  const moved = getRingSizeDelta(formData.currentRingSize, formData.desiredRingSize);
  // No size-up on the ticket, or sizes not both entered: nothing to hold the stock against.
  if (!sizeUp || !moved) return null;
  const want = sizingStockFor({ moved, pieces: Number(sizeUp.quantity) || 1, customerGold: isCustomerGoldTask(sizeUp) });
  if (want === have) return null;
  const line = stockLines[0] || null;
  const others = line ? have - (Number(line.quantity) || 0) : 0;
  return { want, have, moved, line, lineQuantity: Math.max(0, want - others) };
}

/**
 * The rulings, held against the ticket AS IT STANDS — not only at the moment the sentence was read.
 *
 * Smart intake applies the owner's rulings once, to the model's answer. Then the jeweler edits: picks white gold on
 * Review after the read assumed yellow, changes gold to platinum, adds a line by hand. Nothing re-ran, so a white gold
 * ticket could leave with no rhodium, or a platinum ring with the gold-solder sizing task, and the save only re-prices
 * the lines it is given (review, 2026-11-09). This is the same idea as sizingStockCheck: say it, and offer the fix.
 *
 * Returns [{ key, message, action, add | remove | swap }]:
 *   add     the catalog task to add, with `quantity` (rhodium on white gold — owner, 2026-11-09: "All wg gets rhodium")
 *   remove  the id of a line to take off (rhodium the rule added for a metal that is no longer white gold)
 *   swap    { id, task }: this line should be that task (the metal's own version of the same job)
 * Never changes the ticket itself.
 */
export function ticketChecks(formData = {}, availableTasks = []) {
  const lines = formData.tasks || [];
  if (!lines.length || !availableTasks.length) return [];
  const out = [];
  const catalog = availableTasks.map((t) => ({ id: String(t._id), title: t.title || t.displayName || '', metals: t.metals }));
  const { rhodium } = taskRoles(catalog);
  const white = formData.metalType === 'gold' && formData.goldColor === 'white';
  const rhodiumLine = rhodium ? lines.find((l) => String(l._id) === rhodium.id) : null;
  if (white && rhodium && !rhodiumLine) {
    // One per piece. A sizing line is one per ring, so its quantity is the piece count; adding a single rhodium to a
    // two-ring ticket left the second ring uncharged (Codex review of #347).
    const sizing = lines.find((l) => /\bsize (?:up|down)\b/i.test(String(l.title || '')));
    const quantity = Math.max(1, Number(sizing?.quantity) || 1);
    out.push({
      key: 'rhodium-missing',
      message: `White gold gets rhodium plating, and this ticket has none${quantity > 1 ? ` (${quantity} pieces)` : ''}.`,
      action: quantity > 1 ? `Add rhodium x${quantity}` : 'Add rhodium',
      add: availableTasks.find((t) => String(t._id) === rhodium.id),
      quantity,
    });
  }
  // Only rhodium the RULE added: on yellow gold he may have added it on purpose.
  if (!white && rhodiumLine?._smartIntakeRuled) {
    out.push({ key: 'rhodium-extra', message: 'Rhodium plating was added because the metal read as white gold. It is not white gold now.', action: 'Remove it', remove: rhodiumLine.id });
  }
  if (formData.metalType) {
    for (const line of lines) {
      const [aligned] = alignTasksToMetal([line], formData.metalType, availableTasks);
      if (aligned && String(aligned._id) !== String(line._id) && !lines.some((l) => String(l._id) === String(aligned._id))) {
        out.push({ key: `swap-${line.id}`, message: `"${line.title}" is not the ${formData.metalType} version of this job. It should be "${aligned.title}".`, action: 'Switch it', swap: { id: line.id, task: aligned } });
      }
    }
  }
  return out;
}
