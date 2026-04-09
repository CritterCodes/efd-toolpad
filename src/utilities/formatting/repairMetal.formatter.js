const toTitleCase = (value = '') => String(value || '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');

const normalizeMetalParts = (repair = {}) => {
  const rawMetalType = String(repair?.metalType || '').trim();
  const rawKarat = String(repair?.karat || '').trim();
  const rawGoldColor = String(repair?.goldColor || '').trim();

  if (!rawMetalType && !rawKarat && !rawGoldColor) {
    return { metalLabel: '', karatLabel: '', goldColorLabel: '' };
  }

  let metalLabel = rawMetalType;
  let karatLabel = rawKarat;

  if (rawMetalType.includes(' - ')) {
    const [metalPart, karatPart] = rawMetalType.split(' - ');
    metalLabel = metalPart || rawMetalType;
    if (!karatLabel && karatPart) {
      karatLabel = karatPart;
    }
  }

  const normalizedMetalLabel = toTitleCase(metalLabel.replace(/_/g, ' '));
  const normalizedKaratLabel = karatLabel;
  const normalizedGoldColorLabel = rawGoldColor ? `${toTitleCase(rawGoldColor)} Gold` : '';

  return {
    metalLabel: normalizedMetalLabel,
    karatLabel: normalizedKaratLabel,
    goldColorLabel: normalizedGoldColorLabel
  };
};

export const formatRepairMetal = (repair = {}) => {
  const { metalLabel, karatLabel, goldColorLabel } = normalizeMetalParts(repair);

  if (!metalLabel && !karatLabel && !goldColorLabel) {
    return 'N/A';
  }

  const isGold = metalLabel.toLowerCase() === 'gold';

  if (isGold) {
    return [karatLabel, goldColorLabel || metalLabel].filter(Boolean).join(' ');
  }

  return [karatLabel, metalLabel].filter(Boolean).join(' ');
};