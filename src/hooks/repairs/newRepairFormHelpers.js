import { extractRingSizesFromDescription } from '@/services/repairs/smartIntakeExtractors';
import { ringSizeNumber } from '@/services/repairs/ringSizing';
import { sizingStockFor, isSizeUpTask, isSizeDownTask, isCustomerGoldTask, taskRoles } from '@/services/ai/smartIntakeRules';
import { saysNoRhodium } from '@/services/ai/smartIntakeNotes';
import { alignTasksToMetal, taskAllowsMetal } from '@/services/repairs/metalTaskFilter';
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
  if (!sizeUp) {
    // Stock with no size-up to belong to: the size-up was switched to a size-down, or deleted, and its stock stayed —
    // an over-charge nothing mentioned (review, 2026-11-09). Not said on an empty ticket, or beside shank work, where
    // he may have put stock on by hand.
    const tasks = formData.tasks || [];
    if (!tasks.length || tasks.some((t) => /shank/i.test(String(t.title || '')))) return null;
    const first = stockLines[0];
    return { want: 0, have, moved, line: first, lineQuantity: 0, orphan: true };
  }
  // Sizes not both entered: nothing to hold the stock against.
  if (!moved) return null;
  const want = sizingStockFor({ moved, pieces: Number(sizeUp.quantity) || 1, customerGold: isCustomerGoldTask(sizeUp) });
  if (want === have) {
    // The count is right; is it the right stock? A 3-to-5mm size-up with 3x2 stock (he switched the task by hand after
    // "check the width") left with the narrow stock, ticked (review, 2026-11-09).
    const stock = stockLines[0];
    const stockName = `${stock?.name || ''} ${stock?.displayName || ''}`;
    const wideTask = /3\s*(?:mm)?\s*(?:to|-|–)\s*5\s*mm/i.test(String(sizeUp.title || ''));
    const narrowTask = /up to 3\s*mm/i.test(String(sizeUp.title || ''));
    if (stock && ((wideTask && /3\s*x\s*2/i.test(stockName)) || (narrowTask && /5\s*x\s*2/i.test(stockName)))) {
      return { want, have, moved, line: null, lineQuantity: 0, width: { task: sizeUp.title, stock: stock.name || stock.displayName, wide: wideTask } };
    }
    return null;
  }
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
 * Also held against the ticket (round 3 sweep, 2026-11-09): the sizing task against the direction the sizes go — sizes
 * edited to 6 → 5 left "Size up" on the ticket — and a task made for another metal that has no counterpart to switch to.
 *
 * Returns [{ key, message, action, add | remove | swap }] — a check with no \`action\` can only be fixed by hand:
 *   add     the catalog task to add, with `quantity` (rhodium on white gold — owner, 2026-11-09: "All wg gets rhodium")
 *   remove  the id of a line to take off (rhodium the rule added for a metal that is no longer white gold)
 *   swap    { id, task }: this line should be that task (the metal's own version of the same job)
 * Never changes the ticket itself.
 */
export function ticketChecks(formData = {}, availableTasks = [], { pieces = 1 } = {}) {
  const lines = formData.tasks || [];
  if (!lines.length || !availableTasks.length) return [];
  const out = [];
  const catalog = availableTasks.map((t) => ({ id: String(t._id), title: t.title || t.displayName || '', metals: t.metals }));
  const { rhodium, sizeUp, sizeDown } = taskRoles(catalog);
  const catalogTask = (role) => (role ? availableTasks.find((t) => String(t._id) === role.id) : null);
  const moved = getRingSizeDelta(formData.currentRingSize, formData.desiredRingSize);
  const wrongWay = moved ? lines.find((l) => (moved < 0 ? isSizeUpTask(l) : isSizeDownTask(l))) : null;
  // Only when the check is actually raised. With both directions on the ticket nothing is said about direction, and
  // the wrong-way line must still be held against the metal (Codex review of #348).
  const direction = wrongWay && !lines.some((l) => (moved < 0 ? isSizeDownTask(l) : isSizeUpTask(l))) ? wrongWay : null;
  if (direction) {
    const to = catalogTask(moved < 0 ? sizeDown : sizeUp);
    out.push({
      key: `direction-${direction.id}`,
      message: `The sizes go ${moved < 0 ? 'down' : 'up'} (${formData.currentRingSize} → ${formData.desiredRingSize}), and this ticket has "${direction.title}".${to ? ` It should be "${to.title}".` : ' Replace it by hand.'}`,
      ...(to ? { action: 'Switch it', swap: { id: direction.id, task: to } } : {}),
    });
  }
  // The sizes change and nothing on the ticket sizes the ring: he deleted the line, or a re-read did not put it back.
  // …unless the ring is only being made to FIT smaller with sizing beads: the read left the Size Down off on purpose,
  // and a check offering to add it argued with a correct ticket (round 8 sweep, 2026-11-10).
  const beadsToFitSmaller = moved < 0 && lines.some((l) => /sizing beads/i.test(String(l.title || '')));
  if (moved && !beadsToFitSmaller && !lines.some((l) => isSizeUpTask(l) || isSizeDownTask(l))) {
    const to = catalogTask(moved < 0 ? sizeDown : sizeUp);
    out.push({
      key: 'sizing-missing',
      message: `The sizes change (${formData.currentRingSize} → ${formData.desiredRingSize}), and no sizing task is on this ticket.`,
      ...(to ? { action: `Add ${moved < 0 ? 'size down' : 'size up'}`, add: to, quantity: 1, why: 'the ring changes size' } : {}),
    });
  }
  const white = formData.metalType === 'gold' && formData.goldColor === 'white';
  const rhodiumLine = rhodium ? lines.find((l) => String(l._id) === rhodium.id) : null;
  // The note on this ticket says not to plate: the read left rhodium off on purpose, and so does this check — it
  // used to offer "Add rhodium" on a ticket that was right, one tap from an over-charge (round 8 sweep, 2026-11-10).
  if (white && rhodium && !rhodiumLine && !saysNoRhodium(formData.smartIntakeInput)) {
    // One per piece. A sizing line is one per ring, so its quantity is the piece count; adding a single rhodium to a
    // two-ring ticket left the second ring uncharged (Codex review of #347).
    const sizing = lines.find((l) => /\bsize (?:up|down)\b/i.test(String(l.title || '')));
    const quantity = Math.max(1, Number(sizing?.quantity) || 1);
    out.push({
      key: 'rhodium-missing',
      // With no sizing line there is nothing to count the pieces by: say so rather than assert one.
      message: `White gold gets rhodium plating, and this ticket has none${quantity > 1 ? ` (${quantity} pieces)` : ''}.${sizing ? '' : ' One is added — set the count if this is more than one piece.'}`,
      action: quantity > 1 ? `Add rhodium x${quantity}` : 'Add rhodium',
      add: availableTasks.find((t) => String(t._id) === rhodium.id),
      quantity,
      why: 'white gold',
    });
  }
  // One plating per piece: rhodium the rule added follows the sizing line's count. He corrected "2 rings" to 1 and the
  // rhodium stayed at 2 with nothing said (review, 2026-11-10).
  const sizingLine = lines.find((l) => isSizeUpTask(l) || isSizeDownTask(l));
  if (white && rhodiumLine?._smartIntakeRuled && sizingLine && Number(rhodiumLine.quantity) !== Number(sizingLine.quantity)) {
    const quantity = Math.max(1, Number(sizingLine.quantity) || 1);
    out.push({
      key: 'rhodium-count',
      message: `Rhodium plating is ${rhodiumLine.quantity}, and "${sizingLine.title}" is ${quantity}: it is one plating per piece.`,
      action: `Make it ${quantity}`,
      setQuantity: { id: rhodiumLine.id, quantity },
    });
  }
  // The read multiplied the ticket by N pieces and he has since corrected the sizing line: the other lines the read
  // put at N are still at N, ticked, under a note that says everything was counted N times (review, 2026-11-10).
  if (pieces > 1 && sizingLine && Number(sizingLine.quantity) < pieces) {
    const still = lines.filter((l) => l !== sizingLine && l !== rhodiumLine && l.__aiQuantity && Number(l.quantity) === pieces);
    if (still.length) {
      out.push({
        key: 'piece-count',
        message: `This was read as ${pieces} pieces and "${sizingLine.title}" is now ${sizingLine.quantity}. Still at ${pieces}: ${still.map((l) => `"${l.title}"`).join(', ')}. Check each count.`,
      });
    }
  }
  // Only rhodium the RULE added: on yellow gold he may have added it on purpose.
  if (!white && rhodiumLine?._smartIntakeRuled) {
    out.push({ key: 'rhodium-extra', message: 'Rhodium plating was added because the metal read as white gold. It is not white gold now.', action: 'Remove it', remove: rhodiumLine.id });
  }
  if (formData.metalType) {
    for (const line of lines) {
      if (line === direction) continue; // one check per line: the direction first, the metal after it is switched
      const [aligned] = alignTasksToMetal([line], formData.metalType, availableTasks);
      // Made for another metal, and nothing to switch to by name (three generic size-ups tie): say so anyway.
      if (!aligned && Array.isArray(line.metals) && line.metals.length && !taskAllowsMetal(line, formData.metalType)) {
        const to = catalogTask(isSizeUpTask(line) ? sizeUp : (isSizeDownTask(line) ? sizeDown : null));
        out.push({
          key: `metal-${line.id}`,
          message: `"${line.title}" is a ${line.metals.join('/')} task, and this ticket is ${formData.metalType}.${to ? ` It should be "${to.title}".` : ' Replace it by hand.'}`,
          ...(to ? { action: 'Switch it', swap: { id: line.id, task: to } } : {}),
        });
        continue;
      }
      if (aligned && String(aligned._id) !== String(line._id) && !lines.some((l) => String(l._id) === String(aligned._id))) {
        out.push({ key: `swap-${line.id}`, message: `"${line.title}" is not the ${formData.metalType} version of this job. It should be "${aligned.title}".`, action: 'Switch it', swap: { id: line.id, task: aligned } });
      }
    }
  }
  return out;
}
