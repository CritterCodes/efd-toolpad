const GOLD_COLOR_BY_METAL = {
  'yellow-gold': 'yellow',
  'white-gold': 'white',
  'rose-gold': 'rose',
  'red-gold': 'rose',
};

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizeMetalType(value = '') {
  const text = normalizeText(value).replace(/\s+/g, '-');
  if (!text) return '';
  if (text.includes('gold')) return 'gold';
  if (text.includes('silver') || text === 'sterling' || text === '925') return 'silver';
  if (text.includes('platinum') || text === 'pt') return 'platinum';
  if (['brass', 'copper', 'stainless', 'stainless-steel', 'titanium', 'costume', 'other'].includes(text)) return 'costume';
  return text;
}

function normalizeKarat(value = '') {
  const text = normalizeText(value).replace(/\s+/g, '');
  if (!text) return '';
  if (/^\d+k$/.test(text)) return text;
  if (/^\d+$/.test(text)) return text;
  return text;
}

function normalizeGoldColor(metal = '', color = '') {
  const colorText = normalizeText(color);
  if (['yellow', 'white', 'rose'].includes(colorText)) return colorText;
  const metalText = normalizeText(metal).replace(/\s+/g, '-');
  return GOLD_COLOR_BY_METAL[metalText] || '';
}

export function deriveRepairItemMetadata(input = {}) {
  const jewelry = input.jewelry || input;
  const metals = Array.isArray(jewelry.metals) && jewelry.metals.length > 0
    ? jewelry.metals
    : [{ type: jewelry.material || input.material || '', color: jewelry.metalColor || input.metalColor || '', purity: jewelry.purity || input.purity || '' }];

  const primaryMetal = metals.find((metal) => metal?.type || metal?.purity || metal?.color) || {};
  const rawMetal = primaryMetal.type || jewelry.material || input.material || '';
  const metalType = normalizeMetalType(rawMetal);
  const karat = normalizeKarat(primaryMetal.purity || jewelry.purity || input.purity || '');
  const goldColor = metalType === 'gold'
    ? normalizeGoldColor(rawMetal, primaryMetal.color || jewelry.metalColor || input.metalColor || '')
    : '';

  return {
    metalType,
    karat,
    goldColor,
    ringSize: jewelry.ringSize || jewelry.size || input.ringSize || input.size || '',
    canBeSized: Boolean(jewelry.canBeSized || input.canBeSized),
  };
}

export function withRepairItemMetadata(product = {}) {
  return {
    ...product,
    repairItem: {
      ...(product.repairItem || {}),
      ...deriveRepairItemMetadata(product),
    },
  };
}
