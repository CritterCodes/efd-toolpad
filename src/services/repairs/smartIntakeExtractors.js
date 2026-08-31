/**
 * Rule-based smart-intake extractors — the deterministic fallback when the AI is
 * unreachable, and shared vocabulary for tests. Pinned against the owner's hard
 * case: "size 7 14kt yg ring size down 3 sizes, tighten stones and retip 14
 * prongs" — relative sizing arithmetic and jeweler shorthand (14kt, yg/wg/rg)
 * both live here. Pure: no React, no DB.
 */
// Ring sizes (US standard) — the vocabulary the form's size selects use.
export const RING_SIZES = [
  '3', '3.25', '3.5', '3.75', '4', '4.25', '4.5', '4.75', '5', '5.25',
  '5.5', '5.75', '6', '6.25', '6.5', '6.75', '7', '7.25', '7.5', '7.75',
  '8', '8.25', '8.5', '8.75', '9', '9.25', '9.5', '9.75', '10', '10.25',
  '10.5', '10.75', '11', '11.25', '11.5', '11.75', '12', '12.25', '12.5',
  '12.75', '13', '13.25', '13.5', '13.75', '14', '14.25', '14.5', '14.75', '15'
];

export const normalizeRingSizeValue = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  const matchedOption = RING_SIZES.find((option) => Number(option) === numeric);
  return matchedOption || raw;
};

export const extractRingSizesFromDescription = (description = '') => {
  const text = String(description || '').toLowerCase();
  if (!text.trim()) {
    return { currentRingSize: '', desiredRingSize: '' };
  }

  // RELATIVE sizing first: "size 7 ... size down 3 sizes" is current 7, desired 4.
  // Without this, the single-size pattern below grabbed "size 7" as the DESIRED
  // size -- exactly backwards for the most common way jewelers write intake.
  const relative = text.match(/(?:size|sizing|sz)\s*(down|up)\s*(\d+(?:\.\d+)?)\s*(?:sizes?|szs?)?/);
  if (relative) {
    const start = text.match(/(?:size|sz)\s*(\d{1,2}(?:\.\d{1,2})?)\b/);
    const startSize = start ? parseFloat(start[1]) : NaN;
    const delta = parseFloat(relative[2]);
    if (Number.isFinite(startSize) && Number.isFinite(delta)) {
      const target = relative[1] === 'down' ? startSize - delta : startSize + delta;
      if (target > 0) {
        return {
          currentRingSize: normalizeRingSizeValue(String(startSize)),
          desiredRingSize: normalizeRingSizeValue(String(target))
        };
      }
    }
    // Direction known but no usable start size: leave both empty rather than
    // writing the delta ("3") into a size field.
    return { currentRingSize: '', desiredRingSize: '' };
  }

  const pairPatterns = [
    /(?:from|current(?:ly)?|now)\s*(?:size\s*)?(\d{1,2}(?:\.\d{1,2})?)\s*(?:to|->|into)\s*(?:size\s*)?(\d{1,2}(?:\.\d{1,2})?)/,
    /(?:size|sz)\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:to|->|-)\s*(\d{1,2}(?:\.\d{1,2})?)/,
    /(\d{1,2}(?:\.\d{1,2})?)\s*(?:to|->|into)\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*(?:ring\s*)?size)?/
  ];

  for (const pattern of pairPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        currentRingSize: normalizeRingSizeValue(match[1]),
        desiredRingSize: normalizeRingSizeValue(match[2])
      };
    }
  }

  const singlePatterns = [
    /(?:resize|re-?size|size)\s*(?:to)?\s*(\d{1,2}(?:\.\d{1,2})?)/,
    /(?:new|target|desired)\s*(?:size\s*)?(\d{1,2}(?:\.\d{1,2})?)/
  ];

  for (const pattern of singlePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        currentRingSize: '',
        desiredRingSize: normalizeRingSizeValue(match[1])
      };
    }
  }

  return { currentRingSize: '', desiredRingSize: '' };
};

export const extractMetalContextFromDescription = (description = '') => {
  // Jeweler shorthand folds in before matching: "14kt" -> "14k", and yg/wg/rg
  // become their spelled-out colors so one set of regexes handles both spellings.
  const text = String(description || '').toLowerCase()
    .replace(/\b(\d{1,2})\s*kt\b/g, '$1k')
    .replace(/\byg\b/g, 'yellow gold')
    .replace(/\bwg\b/g, 'white gold')
    .replace(/\brg\b/g, 'rose gold');
  if (!text.trim()) return null;

  let metalType = '';

  if (/(platinum|plat\b|pt\s*950|950\s*plat|950\s*platinum)/.test(text)) {
    metalType = 'platinum';
  } else if (/(sterling|silver|\b925\b|fine\s*silver|\b999\b\s*silver)/.test(text)) {
    metalType = 'silver';
  } else if (/(gold|\b10k\b|\b14k\b|\b18k\b|\b22k\b|yellow\s*gold|white\s*gold|rose\s*gold|red\s*gold)/.test(text)) {
    metalType = 'gold';
  } else if (/(costume|fashion\s*jewelry|base\s*metal|brass|copper|stainless\s*steel)/.test(text)) {
    metalType = 'costume';
  }

  if (!metalType) {
    return null;
  }

  let karat = '';
  let goldColor = '';

  if (metalType === 'gold') {
    if (/\b22k\b/.test(text)) karat = '22k';
    else if (/\b18k\b/.test(text)) karat = '18k';
    else if (/\b14k\b/.test(text)) karat = '14k';
    else if (/\b10k\b/.test(text)) karat = '10k';

    if (/white\s*gold/.test(text)) goldColor = 'white';
    else if (/yellow\s*gold/.test(text)) goldColor = 'yellow';
    else if (/(rose\s*gold|red\s*gold)/.test(text)) goldColor = 'rose';
  }

  if (metalType === 'silver') {
    if (/(\b925\b|sterling)/.test(text)) karat = '925';
    else if (/(\b999\b|fine\s*silver)/.test(text)) karat = '999';
  }

  if (metalType === 'platinum') {
    if (/(\b950\b|pt\s*950)/.test(text)) karat = '950';
    else if (/\b999\b/.test(text)) karat = '999';
  }

  return {
    metalType,
    karat,
    goldColor
  };
};
