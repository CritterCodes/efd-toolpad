import { extractRingSizesFromDescription } from '@/services/repairs/smartIntakeExtractors';
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

export const getRingSizeDelta = (currentRingSize = '', desiredRingSize = '') => {
  const current = Number(currentRingSize);
  const desired = Number(desiredRingSize);
  if (!Number.isFinite(current) || !Number.isFinite(desired)) return 0;
  return Math.round((desired - current) * 100) / 100;
};

export const getAdditionalSizingMaterialQuantity = (currentRingSize = '', desiredRingSize = '') => {
  const delta = getRingSizeDelta(currentRingSize, desiredRingSize);
  if (delta <= 1) return 0;
  return Math.round((delta - 1) * 2) / 2;
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

