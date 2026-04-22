import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Autocomplete,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  useMediaQuery,
  useTheme,
  Stack,
  Fab,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

// Services
import tasksService from '@/services/tasks.service';
import processesService from '@/services/processes.service';
import materialsService from '@/services/materials.service';
import RepairsService from '@/services/repairs';
import UsersService from '@/services/users';
import wholesaleClientsAPIClient from '@/api-clients/wholesaleClients.client';
import wholesaleAccountSettingsAPIClient from '@/api-clients/wholesaleAccountSettings.client';
import pricingEngine from '@/services/PricingEngine';

// Context
import { useRepairs } from '@/app/context/repairs.context';

// Components
import CameraCapture from '@/components/shared/CameraCapture';

// Metal configuration
const METAL_TYPES = [
  { value: 'gold', label: 'Gold', karatOptions: ['10k', '14k', '18k', '22k'] },
  { value: 'silver', label: 'Silver', karatOptions: ['925', '999'] },
  { value: 'platinum', label: 'Platinum', karatOptions: ['950', '999'] },
  { value: 'costume', label: 'Costume', karatOptions: [] }
];

const GOLD_COLORS = [
  { value: 'yellow', label: 'Yellow Gold' },
  { value: 'white', label: 'White Gold' },
  { value: 'rose', label: 'Rose Gold' }
];

// Ring sizes (US standard)
const RING_SIZES = [
  '3', '3.25', '3.5', '3.75', '4', '4.25', '4.5', '4.75', '5', '5.25', 
  '5.5', '5.75', '6', '6.25', '6.5', '6.75', '7', '7.25', '7.5', '7.75', 
  '8', '8.25', '8.5', '8.75', '9', '9.25', '9.5', '9.75', '10', '10.25', 
  '10.5', '10.75', '11', '11.25', '11.5', '11.75', '12', '12.25', '12.5', 
  '12.75', '13', '13.25', '13.5', '13.75', '14', '14.25', '14.5', '14.75', '15'
];

// Item categories that might have sizes
const SIZEABLE_CATEGORIES = ['ring', 'band', 'wedding-ring', 'engagement-ring'];

const TASK_INFERENCE_RULES = [
  { regex: /size\s*down|sizing\s*down/, keywords: ['size down'] },
  { regex: /size\s*up|sizing\s*up/, keywords: ['size up'] },
  { regex: /(resize|re-?size|sizing)/, keywords: ['resize', 'sizing', 'ring size'] },
  { regex: /(prong|retip|re-tip|tip repair|tighten stone|stone tighten|loose stone)/, keywords: ['prong', 'retip', 'tighten', 'stone'] },
  { regex: /(solder|chain repair|jump ring|weld)/, keywords: ['solder', 'chain', 'jump ring', 'weld'] },
  { regex: /(rhodium|replate|re-plate|plating|plate)/, keywords: ['rhodium', 'plate', 'plating', 'replate'] },
  { regex: /(polish|buff|clean|refinish)/, keywords: ['polish', 'buff', 'clean', 'refinish'] },
  { regex: /(clasp|lock|latch)/, keywords: ['clasp', 'lock', 'latch'] }
];

const normalizeRingSizeValue = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  const matchedOption = RING_SIZES.find((option) => Number(option) === numeric);
  return matchedOption || raw;
};

const extractRingSizesFromDescription = (description = '') => {
  const text = String(description || '').toLowerCase();
  if (!text.trim()) {
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

// Disambiguate conflicting sizing tasks (Size Up vs Size Down) based on ring sizes or input text
const disambiguateSizingTasks = (tasks, inputText = '', currentSize = '', desiredSize = '') => {
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

const inferTasksFromDescription = (description = '', availableTasks = []) => {
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

const extractMetalContextFromDescription = (description = '') => {
  const text = String(description || '').toLowerCase();
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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeKarat = (karat = '') => String(karat || '').trim().toUpperCase();

const normalizeMetalType = (metalType = '') => String(metalType || '').trim().toLowerCase().replace(/\s+/g, '_');

const getMetalAliases = (metalType = '', goldColor = '') => {
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

const normalizeKaratToken = (karat = '') => {
  const normalized = String(karat || '').trim().toLowerCase();
  if (!normalized) return '';
  if (/^\d+$/.test(normalized)) return normalized;
  if (/^\d+k$/.test(normalized)) return normalized;
  return normalized.replace(/\s+/g, '');
};

const keyMatchesContext = (key = '', metalType = '', karat = '', goldColor = '') => {
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

const pickBestContextualPrice = (entries = [], metalType = '', karat = '', goldColor = '') => {
  const positiveEntries = entries.filter((entry) => toNumber(entry.price) > 0);
  if (positiveEntries.length === 0) return 0;

  const exactMatches = positiveEntries.filter((entry) => keyMatchesContext(entry.key, metalType, karat, goldColor).hasExactContext);
  if (exactMatches.length > 0) {
    return Math.min(...exactMatches.map((entry) => toNumber(entry.price)));
  }

  const metalOnlyMatches = positiveEntries.filter((entry) => keyMatchesContext(entry.key, metalType, karat, goldColor).hasMetal);
  if (metalOnlyMatches.length > 0) {
    return Math.min(...metalOnlyMatches.map((entry) => toNumber(entry.price)));
  }

  return Math.min(...positiveEntries.map((entry) => toNumber(entry.price)));
};

const getUniversalVariantPrice = (pricingMap = {}, metalType = '', karat = '', goldColor = '') => {
  if (!pricingMap || typeof pricingMap !== 'object') return 0;

  const normalizedMetal = String(metalType || '').trim().toLowerCase();
  const normalizedKarat = normalizeKarat(karat);

  if (normalizedMetal && normalizedKarat) {
    const exactKeys = [
      `${normalizedMetal}_${normalizedKarat}`,
      `${normalizedMetal}_${normalizedKarat.replace('K', 'k')}`,
      `${normalizedMetal}_${normalizedKarat.replace('K', '')}K`,
      `${normalizedMetal}_${normalizedKarat.replace('K', '')}k`
    ];

    for (const key of exactKeys) {
      const variant = pricingMap[key];
      const variantPrice = toNumber(variant?.retailPrice ?? variant?.price ?? variant);
      if (variantPrice > 0) return variantPrice;
    }
  }

  const variantEntries = Object.entries(pricingMap).map(([key, variant]) => ({
    key,
    price: toNumber(variant?.retailPrice ?? variant?.price ?? variant)
  }));

  return pickBestContextualPrice(variantEntries, metalType, karat, goldColor);
};

const getTotalCostsMapPrice = (totalCosts = {}, metalType = '', karat = '', goldColor = '') => {
  if (!totalCosts || typeof totalCosts !== 'object') return 0;

  const normalizedMetal = String(metalType || '').trim().toLowerCase();
  const normalizedKarat = normalizeKarat(karat);

  if (normalizedMetal && normalizedKarat) {
    const exactKeys = [
      `${normalizedMetal}_${normalizedKarat}`,
      `${normalizedMetal}_${normalizedKarat.replace('K', 'k')}`,
      `${normalizedMetal}_${normalizedKarat.replace('K', '')}K`,
      `${normalizedMetal}_${normalizedKarat.replace('K', '')}k`
    ];

    for (const key of exactKeys) {
      const value = toNumber(totalCosts[key]);
      if (value > 0) return value;
    }
  }

  const costEntries = Object.entries(totalCosts).map(([key, value]) => ({
    key,
    price: toNumber(value)
  }));

  return pickBestContextualPrice(costEntries, metalType, karat, goldColor);
};

const resolveTaskBasePrice = (task = {}, metalType = '', karat = '', goldColor = '') => {
  const universalPrice = getUniversalVariantPrice(task.universalPricing, metalType, karat, goldColor);
  if (universalPrice > 0) return universalPrice;

  const totalCostsPrice = getTotalCostsMapPrice(task.pricing?.totalCosts, metalType, karat, goldColor);
  if (totalCostsPrice > 0) return totalCostsPrice;

  const candidates = [
    task.basePrice,
    task.pricing?.retailPrice,
    task.pricing?.universal?.retailPrice,
    task.pricing?.totalCost,
    task.retailPrice,
    task.finalSalePrice,
    task.price
  ];

  for (const candidate of candidates) {
    const numeric = toNumber(candidate);
    if (numeric > 0) {
      return numeric;
    }
  }

  return 0;
};

const getPreferredPortionPrice = (source = {}, defaultPortionsPerUnit = 1) => {
  const explicitPortion = toNumber(source?.costPerPortion);
  if (explicitPortion > 0) return explicitPortion;

  const unitPrice = toNumber(source?.unitCost ?? source?.markedUpPrice ?? source?.price);
  const portionsPerUnit = toNumber(source?.portionsPerUnit) > 0
    ? toNumber(source?.portionsPerUnit)
    : (toNumber(defaultPortionsPerUnit) > 0 ? toNumber(defaultPortionsPerUnit) : 1);

  if (unitPrice > 0 && portionsPerUnit > 1) {
    return unitPrice / portionsPerUnit;
  }

  return unitPrice;
};

const getMaterialVariantPrice = (stullerProducts = [], metalType = '', karat = '', goldColor = '', defaultPortionsPerUnit = 1) => {
  if (!Array.isArray(stullerProducts) || stullerProducts.length === 0) return 0;

  const entries = stullerProducts.map((product) => {
    const directPrice = getPreferredPortionPrice(product, defaultPortionsPerUnit);
    const fallbackPrice = toNumber(product?.stullerPrice) * (toNumber(product?.markupRate) > 0 ? toNumber(product?.markupRate) : 1);
    const metalKey = [normalizeMetalType(product?.metalType), normalizeKaratToken(product?.karat)].filter(Boolean).join('_');

    return {
      key: metalKey,
      price: directPrice > 0 ? directPrice : fallbackPrice
    };
  });

  return pickBestContextualPrice(entries, metalType, karat, goldColor);
};

const resolveMaterialBasePrice = (material = {}, metalType = '', karat = '', goldColor = '') => {
  const portionsPerUnit = toNumber(material?.portionsPerUnit) > 0 ? toNumber(material?.portionsPerUnit) : 1;
  const variantPrice = getMaterialVariantPrice(material?.stullerProducts, metalType, karat, goldColor, portionsPerUnit);
  if (variantPrice > 0) return variantPrice;

  const topLevelPortionPrice = getPreferredPortionPrice(material, portionsPerUnit);
  const topLevelMarkedUpPrice = toNumber(material?.stullerPrice) * (toNumber(material?.markupRate) > 0 ? toNumber(material?.markupRate) : 1);
  const derivedMarkedUpPortion = topLevelMarkedUpPrice > 0 ? topLevelMarkedUpPrice / portionsPerUnit : 0;
  const candidates = [
    material?.costPerPortion,
    topLevelPortionPrice,
    derivedMarkedUpPortion,
    material?.unitCost,
    material?.costPerPortion,
    material?.basePrice,
    material?.pricing?.finalPrice,
    material?.pricing?.unitCost,
    material?.markedUpPrice,
    material?.stullerPrice,
    topLevelMarkedUpPrice,
    material?.price
  ];

  for (const candidate of candidates) {
    const numeric = toNumber(candidate);
    if (numeric > 0) return numeric;
  }

  return 0;
};

const normalizePricingSettings = (adminSettings = {}) => {
  const pricing = adminSettings?.pricing && typeof adminSettings.pricing === 'object'
    ? adminSettings.pricing
    : adminSettings;

  const administrativeFee = toNumber(pricing?.administrativeFee || 0.10);
  const businessFee = toNumber(pricing?.businessFee || 0.15);
  const consumablesFee = toNumber(pricing?.consumablesFee || 0.05);

  const configuredMaterialMarkup = toNumber(pricing?.materialMarkup || 1.0);
  const materialMarkup = configuredMaterialMarkup > 0 ? configuredMaterialMarkup : 1.0;

  const configuredBusinessMultiplier = 1 + administrativeFee + businessFee + consumablesFee;
  const businessMultiplier = configuredBusinessMultiplier > 0 ? configuredBusinessMultiplier : 1.0;

  const configuredWholesaleMarkup = toNumber(pricing?.wholesaleMarkup || 0);
  const wholesaleMarkup = configuredWholesaleMarkup > 0 ? configuredWholesaleMarkup : 1.5;

  return {
    materialMarkup,
    businessMultiplier,
    wholesaleMarkup
  };
};

const calculateRetailFromBaseCosts = (baseMaterialsCost = 0, laborCost = 0, adminSettings = {}) => {
  const safeMaterials = Math.max(toNumber(baseMaterialsCost), 0);
  const safeLabor = Math.max(toNumber(laborCost), 0);
  const { materialMarkup, businessMultiplier } = normalizePricingSettings(adminSettings);

  const retail = ((safeMaterials + safeLabor) * businessMultiplier) + (safeMaterials * (materialMarkup - 1));
  return Math.round(retail * 100) / 100;
};

const DEFAULT_WHOLESALER_PRICING_SETTINGS = {
  retailMarkupMultiplier: 1,
  taxRate: 0
};

const normalizeWholesalerPricingSettings = (settings = {}) => {
  const clamp = (value) => {
    const parsed = toNumber(value, 1);
    return Math.min(Math.max(parsed, 0.5), 5);
  };

  const normalizeTaxRate = (value) => {
    const parsed = toNumber(value, DEFAULT_WHOLESALER_PRICING_SETTINGS.taxRate);
    const normalized = parsed > 1 ? parsed / 100 : parsed;
    return Math.min(Math.max(normalized, 0), 0.25);
  };

  const legacyMarkup = toNumber(
    settings?.retailMarkups?.tasks ??
    settings?.retailMarkups?.processes ??
    settings?.retailMarkups?.materials,
    DEFAULT_WHOLESALER_PRICING_SETTINGS.retailMarkupMultiplier
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
      DEFAULT_WHOLESALER_PRICING_SETTINGS.taxRate
    )
  };
};

const applyWholesalerRetailAdjustments = (paidPrice = 0, wholesalerPricingSettings = {}) => {
  const basePaidPrice = Math.max(toNumber(paidPrice, 0), 0);
  const markupMultiplier = Math.max(
    toNumber(wholesalerPricingSettings?.retailMarkupMultiplier, DEFAULT_WHOLESALER_PRICING_SETTINGS.retailMarkupMultiplier),
    0.5
  );
  const taxRate = Math.min(
    Math.max(toNumber(wholesalerPricingSettings?.taxRate, DEFAULT_WHOLESALER_PRICING_SETTINGS.taxRate), 0),
    0.25
  );

  const markedUpPrice = basePaidPrice * markupMultiplier;
  return Math.round(markedUpPrice * (1 + taxRate) * 100) / 100;
};

const resolveMaterialRawPortionBaseCost = (material = {}, metalType = '', karat = '', goldColor = '') => {
  const portionsPerUnit = toNumber(material?.portionsPerUnit) > 0 ? toNumber(material?.portionsPerUnit) : 1;

  if (Array.isArray(material?.stullerProducts) && material.stullerProducts.length > 0) {
    const rawEntries = material.stullerProducts.map((product) => {
      const rawUnit = toNumber(product?.stullerPrice);
      const productPortions = toNumber(product?.portionsPerUnit) > 0 ? toNumber(product?.portionsPerUnit) : portionsPerUnit;
      const rawPortion = rawUnit > 0 ? rawUnit / productPortions : 0;
      const metalKey = [normalizeMetalType(product?.metalType), normalizeKaratToken(product?.karat)].filter(Boolean).join('_');
      return { key: metalKey, price: rawPortion };
    });

    const variantRaw = pickBestContextualPrice(rawEntries, metalType, karat, goldColor);
    if (variantRaw > 0) return variantRaw;
  }

  const topLevelRaw = toNumber(material?.stullerPrice);
  if (topLevelRaw > 0) {
    return topLevelRaw / portionsPerUnit;
  }

  const explicitBase = toNumber(material?.baseCostPerPortion || material?.pricing?.basePrice);
  if (explicitBase > 0) return explicitBase;

  return 0;
};

const resolveMaterialRetailPrice = (material = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const rawPortionBase = resolveMaterialRawPortionBaseCost(material, metalType, karat, goldColor);
  if (rawPortionBase > 0) {
    return calculateRetailFromBaseCosts(rawPortionBase, 0, adminSettings);
  }

  return resolveMaterialBasePrice(material, metalType, karat, goldColor);
};

const resolveProcessRetailPrice = (process = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const pricing = process?.pricing || {};
  const baseMaterialsCost = toNumber(
    pricing?.weightedBaseMaterialsCost ?? pricing?.baseMaterialsCost ?? pricing?.materialsCost
  );
  const laborCost = toNumber(
    pricing?.weightedLaborCost ?? pricing?.laborCost
  );

  if (baseMaterialsCost > 0 || laborCost > 0) {
    return calculateRetailFromBaseCosts(baseMaterialsCost, laborCost, adminSettings);
  }

  if (pricing?.metalPrices && typeof pricing.metalPrices === 'object') {
    const metalEntries = Object.entries(pricing.metalPrices).map(([key, variant]) => {
      const variantBaseMaterials = toNumber(variant?.weightedBaseMaterialsCost ?? variant?.baseMaterialsCost ?? variant?.materialsCost);
      const variantLabor = toNumber(variant?.weightedLaborCost ?? variant?.laborCost);
      return {
        key,
        price: calculateRetailFromBaseCosts(variantBaseMaterials, variantLabor, adminSettings)
      };
    });

    const variantRetail = pickBestContextualPrice(metalEntries, metalType, karat, goldColor);
    if (variantRetail > 0) return variantRetail;
  }

  return toNumber(pricing?.totalCost ?? process?.basePrice ?? process?.price);
};

// Wholesale price resolvers — use stored wholesalePrice on tasks; baseCost × wholesaleMarkup for processes/materials
const getUniversalVariantWholesalePrice = (pricingMap = {}, metalType = '', karat = '', goldColor = '') => {
  if (!pricingMap || typeof pricingMap !== 'object') return 0;
  const normalizedMetal = String(metalType || '').trim().toLowerCase();
  const normalizedKarat = normalizeKarat(karat);
  if (normalizedMetal && normalizedKarat) {
    const exactKeys = [
      `${normalizedMetal}_${normalizedKarat}`,
      `${normalizedMetal}_${normalizedKarat.replace('K', 'k')}`,
      `${normalizedMetal}_${normalizedKarat.replace('K', '')}K`,
      `${normalizedMetal}_${normalizedKarat.replace('K', '')}k`
    ];
    for (const key of exactKeys) {
      const variant = pricingMap[key];
      const variantPrice = toNumber(variant?.wholesalePrice);
      if (variantPrice > 0) return variantPrice;
    }
  }
  const variantEntries = Object.entries(pricingMap).map(([key, variant]) => ({
    key,
    price: toNumber(variant?.wholesalePrice ?? 0)
  }));
  return pickBestContextualPrice(variantEntries, metalType, karat, goldColor);
};

const resolveTaskWholesalePrice = (task = {}, metalType = '', karat = '', goldColor = '') => {
  const universalWholesale = getUniversalVariantWholesalePrice(task.universalPricing, metalType, karat, goldColor);
  if (universalWholesale > 0) return universalWholesale;
  const candidates = [
    task.wholesalePrice,
    task.pricing?.wholesalePrice,
    task.pricing?.universal?.wholesalePrice,
  ];
  for (const candidate of candidates) {
    const numeric = toNumber(candidate);
    if (numeric > 0) return numeric;
  }
  return 0;
};

const resolveMaterialWholesalePrice = (material = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const rawBaseCost = resolveMaterialRawPortionBaseCost(material, metalType, karat, goldColor);
  if (rawBaseCost > 0) {
    const { wholesaleMarkup } = normalizePricingSettings(adminSettings);
    return Math.round(rawBaseCost * wholesaleMarkup * 100) / 100;
  }
  return 0;
};

const resolveProcessWholesalePrice = (process = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const pricing = process?.pricing || {};
  const baseMaterialsCost = toNumber(
    pricing?.weightedBaseMaterialsCost ?? pricing?.baseMaterialsCost ?? pricing?.materialsCost
  );
  const laborCost = toNumber(pricing?.weightedLaborCost ?? pricing?.laborCost);
  if (baseMaterialsCost > 0 || laborCost > 0) {
    const { wholesaleMarkup } = normalizePricingSettings(adminSettings);
    return Math.round((baseMaterialsCost + laborCost) * wholesaleMarkup * 100) / 100;
  }
  if (pricing?.metalPrices && typeof pricing.metalPrices === 'object') {
    const { wholesaleMarkup } = normalizePricingSettings(adminSettings);
    const metalEntries = Object.entries(pricing.metalPrices).map(([key, variant]) => {
      const variantBase = toNumber(variant?.weightedBaseMaterialsCost ?? variant?.baseMaterialsCost ?? variant?.materialsCost);
      const variantLabor = toNumber(variant?.weightedLaborCost ?? variant?.laborCost);
      return { key, price: Math.round((variantBase + variantLabor) * wholesaleMarkup * 100) / 100 };
    });
    const variantWholesale = pickBestContextualPrice(metalEntries, metalType, karat, goldColor);
    if (variantWholesale > 0) return variantWholesale;
  }
  return 0;
};

export default function NewRepairForm({ 
  onSubmit, 
  initialData = null,
  clientInfo = null,
  isWholesale = false,
  onWholesaleChange = null,
  wholesalerStoreId = null,
  wholesalerStoreName = null
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Repairs context for updating the repairs list
  const { addRepair } = useRepairs();
  
  // Form state
  const [formData, setFormData] = useState({
    // Client info
    userID: clientInfo?.userID || '',
    clientName: clientInfo?.name || '',
    
    // Repair details
    smartIntakeInput: '',
    description: '',
    promiseDate: '',
    isRush: false,
    
    // Item details
    metalType: '',
    goldColor: '',
    karat: '',
    
    // Ring sizing (only shown for rings)
    isRing: false,
    currentRingSize: '',
    desiredRingSize: '',
    
    // Notes
    notes: '',
    internalNotes: '',
    
    // Repair items
    tasks: [],
    processes: [],
    materials: [],
    customLineItems: [],
    
    // Pricing
    isWholesale: isWholesale || false, // Set wholesale status from prop
    storeId: 'engel-fine-design',
    storeName: 'Engel Fine Design',
    includeDelivery: false,
    includeTax: true, // Tax enabled by default
    
    // Image
    picture: null
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expandedSection, setExpandedSection] = useState('details');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [analyzingSmartIntake, setAnalyzingSmartIntake] = useState(false);
  const [smartIntakeError, setSmartIntakeError] = useState('');
  const [generatingImageDescription, setGeneratingImageDescription] = useState(false);
  const [imageDescriptionError, setImageDescriptionError] = useState('');

  // Ref to track business name resolved from account settings (avoids race condition)
  const wholesalerBusinessNameRef = useRef(null);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'client' // Default role
  });
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [wholesalerPricingSettings, setWholesalerPricingSettings] = useState(DEFAULT_WHOLESALER_PRICING_SETTINGS);
  
  // Data lists
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const adminUsersRef = useRef([]); // Store admin client list for restoring after wholesale switch
  const [availableStores, setAvailableStores] = useState([
    {
      id: 'engel-fine-design',
      name: 'Engel Fine Design',
      isWholesale: false
    }
  ]);
  
  // Rush job state
  const [rushJobInfo, setRushJobInfo] = useState({
    canCreate: true,
    currentRushJobs: 0,
    maxRushJobs: 0,
    remainingSlots: 0
  });

  // Stuller integration state
  const [stullerSku, setStullerSku] = useState('');
  const [loadingStuller, setLoadingStuller] = useState(false);
  const [stullerError, setStullerError] = useState('');

  // Admin settings for pricing display
  const [adminSettings, setAdminSettings] = useState({
    pricing: {
      materialMarkup: 1.0,
      wholesaleMarkup: 1.5,
      administrativeFee: 0.10,
      businessFee: 0.15,
      consumablesFee: 0.05
    },
    rushMultiplier: 1.5,
    deliveryFee: 25.00,
    taxRate: 0.0875
  });
  
  // Load admin settings for pricing display
  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const settings = await response.json();
          const pricing = settings.pricing || {};
          setAdminSettings({
            pricing: {
              materialMarkup: pricing.materialMarkup ?? 1.0,
              wholesaleMarkup: pricing.wholesaleMarkup || 1.5,
              administrativeFee: pricing.administrativeFee || 0.10,
              businessFee: pricing.businessFee || 0.15,
              consumablesFee: pricing.consumablesFee || 0.05
            },
            rushMultiplier: pricing.rushMultiplier || 1.5,
            deliveryFee: pricing.deliveryFee || 25.00,
            taxRate: pricing.taxRate || 0.0875
          });
        }
      } catch (error) {
        console.warn('Failed to load admin settings for display:', error);
        // Keep default values
      }
    };

    loadAdminSettings();
  }, []);

  useEffect(() => {
    const loadWholesalerAccountSettings = async () => {
      if (!isWholesale) {
        setWholesalerPricingSettings(DEFAULT_WHOLESALER_PRICING_SETTINGS);
        return;
      }

      try {
        const settings = await wholesaleAccountSettingsAPIClient.fetchSettings();
        setWholesalerPricingSettings(normalizeWholesalerPricingSettings(settings || {}));
        
        // Use business name from account settings as the store name
        const businessName = settings?.businessProfile?.businessName;
        if (businessName) {
          wholesalerBusinessNameRef.current = businessName;
          setAvailableStores((prev) => prev.map((store) => 
            store.isWholesale ? { ...store, name: businessName } : store
          ));
          setFormData((prev) => ({
            ...prev,
            storeName: businessName
          }));
        }
      } catch (error) {
        console.warn('Failed to load wholesaler markup settings:', error);
        setWholesalerPricingSettings(DEFAULT_WHOLESALER_PRICING_SETTINGS);
      }
    };

    loadWholesalerAccountSettings();
  }, [isWholesale]);
  
  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Handle client info and set wholesale status
  useEffect(() => {
    if (clientInfo) {
      const clientName = clientInfo.name || `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim();
      const isClientWholesale = !!formData.isWholesale;
      
      console.log('🔍 Client info detected:', { 
        clientName, 
        role: clientInfo.role, 
        isWholesale: isClientWholesale,
        clientInfo: clientInfo 
      });
      
      setFormData(prev => ({ 
        ...prev, 
        clientName,
        userID: clientInfo._id || clientInfo.id || clientInfo.userID || '',
        isWholesale: isClientWholesale
      }));

      // Trigger price recalculation if wholesale status changed
      console.log('💰 Client wholesale status detected:', isClientWholesale);
      // Use a timeout to avoid dependency loop
      setTimeout(() => {
        recalculateAllItemPrices(isClientWholesale);
      }, 0);
    }
  }, [clientInfo, formData.isWholesale]);

  // Load available items for selection and rush job info
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading repair form data...');
        
        // For wholesalers, load their clients and item catalogs
        if (isWholesale) {
          console.log('👤 Wholesale mode: Loading wholesaler clients and item catalogs...');
          const [users, tasks, processes, materials] = await Promise.all([
            wholesaleClientsAPIClient.fetchMyClients(),
            tasksService.getTasks(),
            processesService.getProcesses(),
            materialsService.getMaterials()
          ]);
          const usersData = users?.data || [];
          setAvailableUsers(usersData);
          setAvailableTasks(tasks?.data || tasks || []);
          setAvailableProcesses(processes?.data || processes || []);
          setAvailableMaterials(materials?.data || materials || []);
          const resolvedStoreId = wholesalerStoreId || 'my-wholesale-store';
          const resolvedStoreName = wholesalerBusinessNameRef.current || wholesalerStoreName || 'My Wholesale Store';
          setAvailableStores((prev) => {
            // Don't overwrite if account settings already set the business name
            if (prev.length > 0 && wholesalerBusinessNameRef.current) return prev;
            return [{
              id: resolvedStoreId,
              name: resolvedStoreName,
              isWholesale: true
            }];
          });
          setFormData((prev) => ({
            ...prev,
            isWholesale: true,
            storeId: resolvedStoreId,
            // Don't overwrite storeName if account settings already set it
            storeName: wholesalerBusinessNameRef.current || prev.storeName || resolvedStoreName
          }));
          console.log('✅ Wholesale clients and item catalogs loaded');
        } else {
          console.log('🔧 Admin mode: Loading all data...');
          const [tasks, processes, materials, users, wholesalers] = await Promise.all([
            tasksService.getTasks(),
            processesService.getProcesses(),
            materialsService.getMaterials(),
            UsersService.getAllUsers(),
            fetch('/api/users?role=wholesaler').then((res) => res.ok ? res.json() : { data: [] }),
            // Temporarily disable rush jobs API call due to MongoDB import issues
            // fetch('/api/rush-jobs?action=canCreate').then(res => res.json())
          ]);
          
          console.log('📋 Tasks loaded:', tasks);
          console.log('⚙️ Processes loaded:', processes);
          console.log('📦 Materials loaded:', materials);
          console.log('👥 Users loaded:', users);
          
          setAvailableTasks(tasks.data || tasks || []);
          setAvailableProcesses(processes.data || processes || []);
          setAvailableMaterials(materials.data || materials || []);
          
          const usersData = users?.users || users?.data || users || [];
          setAvailableUsers(usersData.filter((user) => String(user?.role || '').toLowerCase() !== 'wholesaler'));
          adminUsersRef.current = usersData.filter((user) => String(user?.role || '').toLowerCase() !== 'wholesaler');

          const wholesalerData = Array.isArray(wholesalers?.data) ? wholesalers.data : [];
          const wholesalerStores = wholesalerData.map((store) => ({
            id: store.userID || store._id,
            name: store.business || store.name || `${store.firstName || ''} ${store.lastName || ''}`.trim() || 'Wholesale Store',
            isWholesale: true
          }));

          const nextStores = [
            {
              id: 'engel-fine-design',
              name: 'Engel Fine Design',
              isWholesale: false
            },
            ...wholesalerStores
          ];

          setAvailableStores(nextStores);
          setFormData((prev) => {
            const hasSelectedStore = nextStores.some((store) => String(store.id) === String(prev.storeId));
            if (hasSelectedStore) return prev;
            return {
              ...prev,
              storeId: 'engel-fine-design',
              storeName: 'Engel Fine Design',
              isWholesale: false
            };
          });
          console.log('✅ Admin data loading completed');
        }
        
        // Rush job functionality (same for both modes)
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      } catch (error) {
        console.error('❌ Error loading data:', error);
        console.error('Error details:', error.message, error.stack);
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      }
    };
    
    loadData();
  }, [isWholesale, wholesalerStoreId, wholesalerStoreName]); // Re-run when wholesaler store info resolves

  // Live price helpers — fall back to PricingEngine when stored prices are absent (post-refactor tasks/processes)
  const computeTaskRetailPrice = (task, metalType, karat) => {
    const stored = resolveTaskBasePrice(task, metalType, karat, '');
    if (stored > 0) return stored;
    try {
      const result = pricingEngine.calculateTaskCost(
        task, adminSettings, availableProcesses, availableMaterials,
        metalType && karat ? { metalType, karat } : null
      );
      return result?.retailPrice || 0;
    } catch { return 0; }
  };

  const computeProcessRetailPrice = (process, metalType, karat) => {
    const stored = resolveProcessRetailPrice(process, metalType, karat, '', adminSettings);
    if (stored > 0) return stored;
    try {
      const result = pricingEngine.calculateProcessCost(process, adminSettings);
      if (result.isMetalDependent && metalType && karat) {
        const key = `${metalType}_${karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return result.metalPrices?.[key]?.totalCost || result.totalCost || 0;
      }
      return result.totalCost || 0;
    } catch { return 0; }
  };

  const buildTaskItemsFromInferred = useCallback((tasks = [], previousForm) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    const nextMetalType = previousForm?.metalType || '';
    const nextKarat = previousForm?.karat || '';
    const nextGoldColor = previousForm?.goldColor || '';

    return tasks.map((task, index) => {
      const baseRetailPrice = computeTaskRetailPrice(task, nextMetalType, nextKarat);
      const wholesalePrice = resolveTaskWholesalePrice(task, nextMetalType, nextKarat, nextGoldColor);
      const paidPrice = previousForm.isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
      const retailPrice = previousForm.isWholesale
        ? applyWholesalerRetailAdjustments(paidPrice, wholesalerPricingSettings)
        : baseRetailPrice;

      return {
        ...task,
        id: Date.now() + index,
        quantity: 1,
        retailPrice,
        price: paidPrice
      };
    });
  }, [wholesalerPricingSettings]);

  const applySmartIntakeResults = useCallback((results = {}) => {
    setFormData((prev) => {
      const updates = {};
      const isRing = typeof results.isRing === 'boolean'
        ? results.isRing
        : SIZEABLE_CATEGORIES.some((cat) => String(results.inputText || '').toLowerCase().includes(cat) || String(results.inputText || '').toLowerCase().includes('ring'));

      if (typeof isRing === 'boolean' && prev.isRing !== isRing) {
        updates.isRing = isRing;
      }

      if (results.metalType && !String(prev.metalType || '').trim()) {
        updates.metalType = results.metalType;
      }

      if ((results.metalType === 'gold' || prev.metalType === 'gold') && results.goldColor && !String(prev.goldColor || '').trim()) {
        updates.goldColor = results.goldColor;
      }

      if (results.karat && !String(prev.karat || '').trim()) {
        updates.karat = results.karat;
      }

      if (isRing && results.currentRingSize) {
        updates.currentRingSize = normalizeRingSizeValue(results.currentRingSize);
      }

      if (isRing && results.desiredRingSize) {
        updates.desiredRingSize = normalizeRingSizeValue(results.desiredRingSize);
      }

      if (Array.isArray(results.inferredTasks) && results.inferredTasks.length > 0 && (!prev.tasks || prev.tasks.length === 0)) {
        const inferredTaskItems = buildTaskItemsFromInferred(results.inferredTasks, {
          ...prev,
          ...updates
        });
        if (inferredTaskItems.length > 0) {
          updates.tasks = inferredTaskItems;
        }
      }

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [buildTaskItemsFromInferred]);

  const runRuleBasedSmartIntake = useCallback((inputText = '') => {
    const parsingText = String(inputText || '').trim();
    if (!parsingText) {
      return;
    }

    const detectedMetalContext = extractMetalContextFromDescription(parsingText) || {};
    const detectedRingSizes = extractRingSizesFromDescription(parsingText);
    const inferredTasks = inferTasksFromDescription(parsingText, availableTasks);
    const isRingCategory = SIZEABLE_CATEGORIES.some((cat) => parsingText.toLowerCase().includes(cat) || parsingText.toLowerCase().includes('ring'));

    applySmartIntakeResults({
      inputText: parsingText,
      isRing: isRingCategory,
      metalType: detectedMetalContext.metalType || '',
      karat: detectedMetalContext.karat || '',
      goldColor: detectedMetalContext.goldColor || '',
      currentRingSize: detectedRingSizes.currentRingSize,
      desiredRingSize: detectedRingSizes.desiredRingSize,
      inferredTasks
    });
  }, [availableTasks, applySmartIntakeResults]);

  const handleAnalyzeSmartIntake = useCallback(async () => {
    const parsingText = String(formData.smartIntakeInput || '').trim();
    if (!parsingText) {
      setSmartIntakeError('Enter intake details first.');
      return;
    }

    setAnalyzingSmartIntake(true);
    setSmartIntakeError('');

    try {
      const strippedTasks = availableTasks.map((t) => ({
        id: String(t._id || ''),
        title: t.title || t.displayName || t.name || '',
        description: t.description || '',
        symptoms: t.aiMeta?.symptoms || [],
        whenToUse: t.aiMeta?.whenToUse || '',
        neverUseWhen: t.aiMeta?.neverUseWhen || '',
      })).filter((t) => t.id);

      const response = await fetch('/api/ai/parse-smart-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText: parsingText,
          description: String(formData.description || '').trim(),
          tasks: strippedTasks
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'AI smart intake parse failed');
      }

      const parsed = payload?.data?.parsed || {};
      const matchedTaskIds = Array.isArray(parsed.matchedTaskIds) ? parsed.matchedTaskIds : [];

      let aiMatchedTasks = [];
      if (matchedTaskIds.length > 0) {
        aiMatchedTasks = matchedTaskIds
          .map((id) => availableTasks.find((t) => String(t._id) === id))
          .filter(Boolean);
      }

      if (aiMatchedTasks.length === 0) {
        aiMatchedTasks = inferTasksFromDescription(parsingText, availableTasks);
      }

      aiMatchedTasks = disambiguateSizingTasks(
        aiMatchedTasks, parsingText,
        parsed.currentRingSize || '', parsed.desiredRingSize || ''
      );

      applySmartIntakeResults({
        inputText: parsingText,
        isRing: typeof parsed.isRing === 'boolean' ? parsed.isRing : null,
        metalType: parsed.metalType || '',
        karat: parsed.karat || '',
        goldColor: parsed.goldColor || '',
        currentRingSize: parsed.currentRingSize || '',
        desiredRingSize: parsed.desiredRingSize || '',
        inferredTasks: aiMatchedTasks
      });
    } catch (error) {
      runRuleBasedSmartIntake(parsingText);
      setSmartIntakeError(`AI parse unavailable, used fallback rules. ${error.message || ''}`.trim());
    } finally {
      setAnalyzingSmartIntake(false);
    }
  }, [formData.smartIntakeInput, formData.description, availableTasks, applySmartIntakeResults, runRuleBasedSmartIntake]);

  // Sync wholesale status from props and recalculate prices
  const prevWholesaleProp = useRef(isWholesale);
  useEffect(() => {
    // Only update if the prop actually changed, not the form state
    if (prevWholesaleProp.current !== isWholesale) {
      console.log('💰 Wholesale status changed from prop:', prevWholesaleProp.current, '->', isWholesale);
      prevWholesaleProp.current = isWholesale;
      setFormData(prev => ({
        ...prev,
        isWholesale: isWholesale
      }));
      // Recalculate prices with new wholesale status
      setTimeout(() => {
        recalculateAllItemPrices(isWholesale);
      }, 0);
    }
  }, [isWholesale]); // Only depend on the prop, not the form state

  // Get karat options based on selected metal
  const getKaratOptions = () => {
    const metalConfig = METAL_TYPES.find(m => m.value === formData.metalType);
    return metalConfig?.karatOptions || [];
  };

  // Calculate total cost with admin settings
  const calculateTotalCost = useCallback(async () => {
    console.log('🧮 CALCULATETOTALCOST START');
    const tasksCost = formData.tasks.reduce((sum, item) => 
      sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
    const processesCost = formData.processes.reduce((sum, item) => 
      sum + (parseFloat(item.price || item.pricing?.totalCost || 0) * (item.quantity || 1)), 0);
    const materialsCost = formData.materials.reduce((sum, item) => 
      sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
    const customCost = formData.customLineItems.reduce((sum, item) => 
      sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    
    let subtotal = tasksCost + processesCost + materialsCost + customCost;
    
    console.log('📊 CALCULATETOTALCOST - Individual Costs:', {
      tasksCost,
      processesCost,
      materialsCost,
      customCost,
      subtotal,
      isWholesale: formData.isWholesale
    });
    
    // Note: Individual item prices are already discounted by recalculateAllItemPrices()
    // for wholesale clients, so no additional discount needed here

    // Get admin settings for dynamic pricing
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const settings = await response.json();
        const pricing = settings.pricing || {};
        
        // Apply rush job markup if applicable
        if (formData.isRush) {
          const rushMultiplier = pricing.rushMultiplier || 1.5;
          subtotal = subtotal * rushMultiplier;
        }

        // Add delivery fee if applicable (not subject to wholesale discount)
        if (formData.includeDelivery) {
          const deliveryFee = pricing.deliveryFee || 25.00;
          subtotal = subtotal + deliveryFee;
        }

        // Add tax if applicable (wholesale clients don't pay taxes)
        if (formData.includeTax && !formData.isWholesale) {
          const taxRate = pricing.taxRate || 0.0875;
          subtotal = subtotal * (1 + taxRate);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch admin settings for pricing:', error);
      // Fallback to hardcoded values
      if (formData.isRush) {
        subtotal = subtotal * 1.5;
      }
      if (formData.includeDelivery) {
        subtotal = subtotal + 25.00; // Default delivery fee
      }
      if (formData.includeTax && !formData.isWholesale) {
        subtotal = subtotal * 1.0875; // Default tax rate (8.75%)
      }
    }
    
    return subtotal;
  }, [formData.tasks, formData.processes, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, formData.metalType, formData.karat, formData.goldColor]);

  // Add item handlers
  const addTask = (task) => {
    const baseRetailPrice = computeTaskRetailPrice(task, formData.metalType, formData.karat);
    const wholesalePrice = resolveTaskWholesalePrice(task, formData.metalType, formData.karat, formData.goldColor);
    const price = formData.isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
    const retailPrice = formData.isWholesale
      ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
      : baseRetailPrice;
    const newTask = { ...task, id: Date.now(), quantity: 1, retailPrice, price };
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const addMaterial = (material) => {
    const baseRetailPrice = resolveMaterialRetailPrice(material, formData.metalType, formData.karat, formData.goldColor, adminSettings);
    const wholesalePrice = resolveMaterialWholesalePrice(material, formData.metalType, formData.karat, formData.goldColor, adminSettings);
    const price = formData.isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
    const retailPrice = formData.isWholesale
      ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
      : baseRetailPrice;
    const newMaterial = { ...material, id: Date.now(), quantity: 1, retailPrice, price };
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));
  };

  const addCustomLineItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      quantity: 1,
      price: 0
    };
    setFormData(prev => ({
      ...prev,
      customLineItems: [...prev.customLineItems, newItem]
    }));
  };

  // Recalculate all item prices when wholesale status changes
  const recalculateAllItemPrices = (isWholesale) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        const baseRetailPrice = computeTaskRetailPrice(task, formData.metalType, formData.karat);
        const wholesalePrice = resolveTaskWholesalePrice(task, formData.metalType, formData.karat, formData.goldColor);
        const price = isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
        const retailPrice = isWholesale
          ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
          : baseRetailPrice;
        return { ...task, retailPrice, price };
      }),
      processes: prev.processes.map((process) => {
        const baseRetailPrice = computeProcessRetailPrice(process, formData.metalType, formData.karat);
        const wholesalePrice = resolveProcessWholesalePrice(process, formData.metalType, formData.karat, formData.goldColor, adminSettings);
        const price = isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
        const retailPrice = isWholesale
          ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
          : baseRetailPrice;
        return { ...process, retailPrice, price };
      }),
      materials: prev.materials.map((material) => {
        const baseRetailPrice = resolveMaterialRetailPrice(material, formData.metalType, formData.karat, formData.goldColor, adminSettings);
        const wholesalePrice = resolveMaterialWholesalePrice(material, formData.metalType, formData.karat, formData.goldColor, adminSettings);
        const price = isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
        const retailPrice = isWholesale
          ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
          : baseRetailPrice;
        return { ...material, retailPrice, price };
      })
    }));
  };

  useEffect(() => {
    if (formData.tasks.length > 0) {
      recalculateAllItemPrices(formData.isWholesale);
    }
  }, [formData.metalType, formData.karat, formData.goldColor]);

  useEffect(() => {
    if (formData.isWholesale && (formData.tasks.length > 0 || formData.processes.length > 0 || formData.materials.length > 0)) {
      recalculateAllItemPrices(true);
    }
  }, [wholesalerPricingSettings]);

  // Stuller material integration
  const addStullerMaterial = async () => {
    if (!stullerSku.trim()) {
      setStullerError('Please enter a Stuller SKU');
      return;
    }

    setLoadingStuller(true);
    setStullerError('');

    try {
      // Fetch Stuller data
      const response = await fetch('/api/stuller/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNumber: stullerSku.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Stuller data');
      }

      const stullerData = await response.json();

      // Get admin settings for markup calculation
      const settingsResponse = await fetch('/api/admin/settings');
      let loadedSettings = {};
      let pricing = {};
      
      if (settingsResponse.ok) {
        loadedSettings = await settingsResponse.json();
        pricing = loadedSettings.pricing || {};
      }

      // Apply full retail pricing formula to Stuller base price
      const basePrice = stullerData.data.price || 0;
      const retailPrice = calculateRetailFromBaseCosts(basePrice, 0, { pricing });

      // Create material item for the repair
      const newMaterial = {
        id: Date.now(),
        name: stullerData.data.description,
        displayName: stullerData.data.description,
        description: `${stullerData.data.longDescription || stullerData.data.description} (Stuller: ${stullerSku})`,
        quantity: 1,
        price: retailPrice,
        unitCost: retailPrice,
        category: 'stuller_gemstone',
        supplier: 'Stuller',
        stuller_item_number: stullerSku,
        isStullerItem: true,
        stullerData: {
          originalPrice: basePrice,
          materialMarkup: normalizePricingSettings({ pricing }).materialMarkup,
          businessMultiplier: normalizePricingSettings({ pricing }).businessMultiplier,
          itemNumber: stullerSku,
          weight: stullerData.data.weight,
          dimensions: stullerData.data.dimensions,
          metal: stullerData.data.metal
        }
      };

      // Add to repair materials
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, newMaterial]
      }));

      // Clear the SKU input
      setStullerSku('');
      
      console.log('Added Stuller material:', newMaterial);

    } catch (error) {
      console.error('Error adding Stuller material:', error);
      setStullerError(error.message);
    } finally {
      setLoadingStuller(false);
    }
  };

  // Remove item handlers
  const removeItem = (type, id) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  // Update item quantity/price
  const updateItem = (type, id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Validation
      if (!formData.clientName.trim()) {
        throw new Error('Client name is required');
      }
      if (formData.isWholesale && !String(formData.userID || '').trim()) {
        throw new Error('Please select a client from your wholesale client list');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (formData.metalType === 'gold' && !formData.goldColor) {
        throw new Error('Gold color is required when metal type is Gold');
      }
      // Promise date is only required for non-wholesale submissions
      if (!formData.isWholesale && !formData.promiseDate) {
        throw new Error('Promise date is required');
      }
      
      // Ring sizing validation
      if (formData.isRing) {
        if (!formData.currentRingSize) {
          throw new Error('Current ring size is required for ring repairs');
        }
        if (!formData.desiredRingSize) {
          throw new Error('Desired ring size is required for ring repairs');
        }
      }
      
      // Rush job validation
      if (formData.isRush && !rushJobInfo.canCreate) {
        throw new Error(`Cannot create rush job: ${rushJobInfo.currentRushJobs}/${rushJobInfo.maxRushJobs} rush jobs already active`);
      }

      // Prepare submission data with detailed pricing breakdown
      let totalCost = 0;
      let subtotal = 0;
      let tasksCost = 0;
      let processesCost = 0;
      let materialsCost = 0;
      let customCost = 0;
      
      // For admin users, calculate detailed pricing
      if (!formData.isWholesale) {
        totalCost = await calculateTotalCost();
        
        // Calculate pricing breakdown properly
        tasksCost = formData.tasks.reduce((sum, item) => 
          sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
        processesCost = formData.processes.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.pricing?.totalCost || 0) * (item.quantity || 1)), 0);
        materialsCost = formData.materials.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
        customCost = formData.customLineItems.reduce((sum, item) => 
          sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
        
        // Base subtotal (individual item prices are already wholesale-discounted if applicable)
        subtotal = tasksCost + processesCost + materialsCost + customCost;
      } else {
        // For wholesalers, pricing will be determined by admin later
        console.log('👤 Wholesaler submission: Pricing to be determined by admin');
        totalCost = 0;
        subtotal = 0;
      }
      
      // Note: No additional wholesale discount needed - individual prices are already adjusted
      
      // Calculate fees (only for admin mode)
      const rushFee = (!formData.isWholesale && formData.isRush) ? 
        subtotal * ((adminSettings.rushMultiplier || 1.5) - 1) : 0;
      
      // Calculate delivery fee (flat rate, not subject to wholesale discount)
      const deliveryFee = (!formData.isWholesale && formData.includeDelivery) ? 
        (adminSettings.deliveryFee || 25.00) : 0;
      
      // Calculate tax amount (applied to subtotal + rushFee + deliveryFee, wholesale exempt)
      const taxableAmount = subtotal + rushFee + deliveryFee;
      const taxAmount = (!formData.isWholesale && formData.includeTax && !formData.isWholesale) ? 
        taxableAmount * (adminSettings.taxRate || 0.0875) : 0;

      // Add comprehensive logging
      console.log('🔍 PRICING BREAKDOWN DEBUG:');
      console.log('📊 Base Costs (individual prices already wholesale-adjusted):', { tasksCost, processesCost, materialsCost, customCost, subtotal });
      console.log('💰 Calculated Values:', { subtotal, rushFee, deliveryFee, taxAmount, totalCost });
      console.log('⚙️ Settings:', { 
        isWholesale: formData.isWholesale,
        isRush: formData.isRush, 
        includeDelivery: formData.includeDelivery,
        includeTax: formData.includeTax,
        taxRate: adminSettings.taxRate,
        rushMultiplier: adminSettings.rushMultiplier 
      });
      
      const submissionData = {
        ...formData,
        // For wholesalers, set a placeholder promise date if none provided (admin will update it)
        promiseDate: formData.isWholesale && !formData.promiseDate 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
          : formData.promiseDate,
        totalCost,
        // Detailed pricing breakdown
        subtotal,
        rushFee,
        deliveryFee,
        taxAmount,
        taxRate: adminSettings.taxRate || 0.0875,
        isWholesale: formData.isWholesale,
        includeDelivery: formData.includeDelivery,
        includeTax: formData.includeTax && !formData.isWholesale, // Store actual tax application
        
        // Store metadata drives pricing mode and downstream assignment.
        businessName: formData.storeName || 'Engel Fine Design',
        storeId: formData.storeId || 'engel-fine-design',
        storeName: formData.storeName || 'Engel Fine Design',
        
        createdAt: new Date().toISOString(),
        status: 'RECEIVING' // Use legacy status for compatibility
      };

      // Add comprehensive logging for submission
      console.log('📤 SUBMISSION DATA DEBUG:');
      console.log('🔢 Pricing Fields in Submission:', {
        totalCost: submissionData.totalCost,
        subtotal: submissionData.subtotal,
        rushFee: submissionData.rushFee,
        deliveryFee: submissionData.deliveryFee,
        taxAmount: submissionData.taxAmount,
        taxRate: submissionData.taxRate
      });
      console.log('🎛️ Flags in Submission:', {
        isWholesale: submissionData.isWholesale,
        includeDelivery: submissionData.includeDelivery,
        includeTax: submissionData.includeTax,
        isRush: submissionData.isRush
      });
      console.log('📋 Full Submission Object:', submissionData);

      // Submit the repair
      const result = await RepairsService.createRepair(submissionData);
      
      // ✅ Add the new repair to the repairs context immediately
      if (result && (result.repairID || result.newRepair?.repairID)) {
        const repairToAdd = result.newRepair || result;
        console.log('📝 Adding new repair to context:', repairToAdd.repairID);
        addRepair(repairToAdd);
      } else {
        console.warn('⚠️  Could not add repair to context - no repairID found in result:', result);
      }
      
      onSubmit(result);
      
    } catch (error) {
      const apiErrorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create repair';
      setErrors({ submit: apiErrorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Format phone number as (555) 123-4567
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Handle adding a new client
  const handleAddNewClient = async () => {
    setNewClientLoading(true);
    try {
      console.log('🔄 Creating new client:', newClientData);
      
      const clientToCreate = {
        firstName: newClientData.firstName.trim(),
        lastName: newClientData.lastName.trim(),
        email: newClientData.email.trim(),
        phoneNumber: newClientData.phone.trim() || ''
      };

      console.log('📤 Sending client creation request:', clientToCreate);

      // Determine if we're creating for a wholesale store
      const isCreatingForWholesale = formData.isWholesale;

      let createdClientResponse;
      if (isCreatingForWholesale) {
        // Pass store ownership info so backend assigns parentWholesalerId correctly
        createdClientResponse = await wholesaleClientsAPIClient.createClient({
          ...clientToCreate,
          wholesalerId: formData.storeId,
          wholesalerName: formData.storeName
        });
      } else {
        createdClientResponse = await UsersService.createUser({
          ...clientToCreate,
          name: `${newClientData.firstName.trim()} ${newClientData.lastName.trim()}`,
          role: newClientData.role || 'client',
          status: 'unverified'
        });
      }

      const createdClient = createdClientResponse?.data || createdClientResponse.user || createdClientResponse;
      
      console.log('✅ Created client response:', createdClientResponse);
      console.log('✅ Created client data:', createdClient);
      
      // Check if client is wholesale
      const isWholesaleClient = !!formData.isWholesale;
      console.log('💰 New client wholesale status:', isWholesaleClient);
      
      // Add to available users list
      setAvailableUsers(prev => [...prev, createdClient]);
      
      // Auto-select the newly created client
      const clientName = createdClient.name || `${createdClient.firstName} ${createdClient.lastName}`.trim();
      setFormData(prev => ({
        ...prev,
        clientName: clientName,
        userID: createdClient._id || createdClient.id || createdClient.userID
      }));

      // Trigger price recalculation for current store pricing mode
      if (formData.isWholesale) {
        setTimeout(() => {
          recalculateAllItemPrices(true);
        }, 0);
      }

      // Trigger callback if provided
      if (onWholesaleChange) {
        onWholesaleChange(isWholesaleClient);
      }

      // Reset form and close dialog
      setNewClientData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'client'
      });
      setShowNewClientDialog(false);

      console.log('🎉 New client created and selected successfully');
      
    } catch (error) {
      console.error('❌ Error creating new client:', error);
      alert('Failed to create new client: ' + (error.message || 'Unknown error'));
    } finally {
      setNewClientLoading(false);
    }
  };

  // Handle image capture
  const handleImageCapture = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageDescriptionError('');
      setFormData(prev => ({ ...prev, picture: file }));
    }
  };

  const handleGenerateDescriptionFromImage = async (imageFile) => {
    const file = imageFile || formData.picture;
    if (!file) {
      setImageDescriptionError('Please upload an item photo first.');
      return;
    }

    setGeneratingImageDescription(true);
    setImageDescriptionError('');

    try {
      const payload = new FormData();
      payload.append('image', file);

      const response = await fetch('/api/ai/describe-item-image', {
        method: 'POST',
        body: payload
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to generate description from image');
      }

      const generatedDescription = String(data?.data?.description || '').trim();
      if (!generatedDescription) {
        throw new Error('Gemini did not return a description.');
      }

      setFormData((prev) => ({
        ...prev,
        description: String(prev.description || '').trim()
          ? `${prev.description.trim()}\n${generatedDescription}`
          : generatedDescription
      }));
    } catch (error) {
      setImageDescriptionError(error.message || 'Unable to generate description from image.');
    } finally {
      setGeneratingImageDescription(false);
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 1000, 
      mx: 'auto',
      px: { xs: 0.5, sm: 2 },
      pb: { xs: 10, sm: 2 }
    }}>
      {errors.submit && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.submit}
        </Alert>
      )}

      <Stack spacing={{ xs: 1.5, sm: 3 }}>

        {/* Client Information */}
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1.5, lineHeight: 1 }}>
            Client Information
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {isWholesale ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Store"
                  value={formData.storeName || 'My Wholesale Store'}
                  InputProps={{ readOnly: true }}
                  helperText="Store selection controls wholesale pricing automatically"
                />
              </Grid>
              ) : (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Store</InputLabel>
                  <Select
                    value={formData.storeId || 'engel-fine-design'}
                    label="Store"
                    onChange={(e) => {
                      const nextStoreId = e.target.value;
                      const selectedStore = (availableStores || []).find((store) => String(store.id) === String(nextStoreId));
                      const nextIsWholesale = !!selectedStore?.isWholesale;

                      setFormData((prev) => ({
                        ...prev,
                        storeId: nextStoreId,
                        storeName: selectedStore?.name || 'Engel Fine Design',
                        isWholesale: nextIsWholesale,
                        includeTax: nextIsWholesale ? false : prev.includeTax,
                        clientName: '',
                        userID: ''
                      }));

                      // Switch client list based on store type
                      if (nextIsWholesale) {
                        setAvailableUsers([]); // Clear immediately to avoid showing stale admin clients
                        wholesaleClientsAPIClient.fetchClientsByWholesaler(nextStoreId)
                          .then((res) => {
                            console.log('📋 Wholesale clients fetched for store:', nextStoreId, res);
                            setAvailableUsers(res?.data || []);
                          })
                          .catch((err) => {
                            console.error('Failed to fetch wholesale clients:', err);
                            setAvailableUsers([]);
                          });
                      } else {
                        setAvailableUsers(adminUsersRef.current);
                      }

                      setTimeout(() => {
                        recalculateAllItemPrices(nextIsWholesale);
                      }, 0);

                      if (onWholesaleChange) {
                        onWholesaleChange(nextIsWholesale);
                      }
                    }}
                  >
                    {(availableStores || []).map((store) => (
                      <MenuItem key={store.id} value={store.id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">{store.name}</Typography>
                          {store.isWholesale && (
                            <Chip label="Wholesale" size="small" color="primary" variant="outlined" />
                          )}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    Store selection controls wholesale pricing automatically
                  </Typography>
                </FormControl>
              </Grid>
              )}
              <Grid item xs={12}>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={Array.isArray(availableUsers) ? availableUsers : []}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (option && typeof option === 'object') {
                        return option.name || option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
                      }
                      return '';
                    }}
                    filterOptions={(options, state) => {
                      const input = state.inputValue.toLowerCase().trim();
                      if (!input) return options;
                      return options.filter((opt) => {
                        const name = (opt.name || opt.fullName || `${opt.firstName || ''} ${opt.lastName || ''}`.trim()).toLowerCase();
                        const email = (opt.email || '').toLowerCase();
                        const phone = (opt.phone || opt.phoneNumber || '').toLowerCase();
                        const business = (opt.business || '').toLowerCase();
                        return name.includes(input) || email.includes(input) || phone.includes(input) || business.includes(input);
                      });
                    }}
                    isOptionEqualToValue={(option, val) => {
                      if (!option || !val) return false;
                      if (typeof val === 'string') {
                        const label = option.name || option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
                        return label === val;
                      }
                      return (option._id || option.userID || option.clientID) === (val._id || val.userID || val.clientID);
                    }}
                    inputValue={formData.clientName || ''}
                    onInputChange={(event, newInputValue, reason) => {
                      setFormData(prev => ({
                        ...prev,
                        clientName: newInputValue || '',
                        userID: reason === 'input' || reason === 'clear' ? '' : prev.userID
                      }));
                    }}
                    value={
                      formData.userID
                        ? (Array.isArray(availableUsers) ? availableUsers : []).find(
                            (u) => (u._id || u.userID || u.clientID) === formData.userID
                          ) || formData.clientName || null
                        : null
                    }
                    onChange={(event, newValue) => {
                      console.log('🎯 Autocomplete change:', newValue);
                      if (newValue && typeof newValue === 'object') {
                        const clientName = newValue.name || `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim() || newValue.email || '';
                        const userID = newValue._id || newValue.id || newValue.userID || newValue.clientID || '';
                        const isClientWholesale = !!formData.isWholesale;
                        
                        console.log('👤 Selected client:', { clientName, userID, role: newValue.role, isWholesale: isClientWholesale });
                        
                        setFormData(prev => ({ 
                          ...prev, 
                          clientName,
                          userID
                        }));

                        console.log('💰 Pricing mode from selected store:', isClientWholesale);
                      } else if (typeof newValue === 'string') {
                        console.log('📝 String value entered:', newValue);
                        setFormData(prev => ({ 
                          ...prev, 
                          clientName: newValue,
                          userID: ''
                        }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Client Name"
                        required
                        placeholder={formData.isWholesale ? "Search your clients..." : "Type to search clients..."}
                        helperText={formData.isWholesale ? "Select a client from your wholesale client list" : "Start typing to search existing clients"}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option._id || option.id || option.userID || option.clientID || option}>
                        <Stack sx={{ width: '100%' }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2">
                              {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()}
                            </Typography>
                            {option.role === 'wholesaler' && (
                              <Chip 
                                label="Wholesale" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                          </Stack>
                          {option.email && (
                            <Typography variant="caption" color="text.secondary">
                              📧 {option.email}
                            </Typography>
                          )}
                          {(option.phone || option.phoneNumber) && (
                            <Typography variant="caption" color="text.secondary">
                              📞 {option.phone || option.phoneNumber}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                    noOptionsText={
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          No existing clients found
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setShowNewClientDialog(true)}
                        >
                          Add New Client
                        </Button>
                      </Box>
                    }
                  />
              </Grid>
              
              {/* Quick Add Client Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowNewClientDialog(true)}
                    sx={{ color: 'primary.main' }}
                  >
                    Add New Client
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Rush Job</Typography>
                    <Switch
                      checked={formData.isRush}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRush: e.target.checked }))}
                      disabled={!rushJobInfo.canCreate && !formData.isRush}
                    />
                    {formData.isRush && (
                      <Chip 
                        label={`×${adminSettings.rushMultiplier}`}
                        color="warning" 
                        size="small"
                        variant="filled"
                      />
                    )}
                  </Stack>
                  {!rushJobInfo.canCreate && (
                    <Typography variant="caption" color="error">
                      Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
                    </Typography>
                  )}
                  {rushJobInfo.canCreate && rushJobInfo.remainingSlots <= 2 && (
                    <Typography variant="caption" color="warning.main">
                      {rushJobInfo.remainingSlots} rush job slots remaining
                    </Typography>
                  )}
                  {formData.isRush && (
                    <Typography variant="caption" color="text.secondary">
                      Rush jobs have {((adminSettings.rushMultiplier - 1) * 100).toFixed(0)}% markup
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Pricing Mode</Typography>
                    {formData.isWholesale ? (
                      <Chip label="Wholesale" color="primary" size="small" variant="filled" />
                    ) : (
                      <Chip label="Retail" color="default" size="small" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="caption" color="primary">
                    Set automatically from selected store
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>Include Delivery</Typography>
                    <Switch
                      checked={formData.includeDelivery}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeDelivery: e.target.checked }))}
                    />
                    {formData.includeDelivery && (
                      <Chip 
                        label={`+$${adminSettings.deliveryFee.toFixed(2)}`}
                        color="info" 
                        size="small"
                        variant="filled"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Add ${adminSettings.deliveryFee.toFixed(2)} delivery fee to total cost (not subject to wholesale discount)
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                {!formData.isWholesale ? (
                  <FormControl fullWidth>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography>Include Tax</Typography>
                      <Switch
                        checked={formData.includeTax}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeTax: e.target.checked }))}
                      />
                      {formData.includeTax && (
                        <Chip 
                          label={`+${(adminSettings.taxRate * 100).toFixed(2)}%`}
                          color="secondary" 
                          size="small"
                          variant="filled"
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {`Apply ${(adminSettings.taxRate * 100).toFixed(2)}% tax rate to total cost`}
                    </Typography>
                  </FormControl>
                ) : (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Tax Handling</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Your wholesale total is tax exempt. Customer tax is automatically applied from your account settings.
                    </Typography>
                  </Stack>
                )}
              </Grid>
            </Grid>
        </Box>

        {/* Wholesaler Information */}
        {isWholesale && (
          <Alert severity="info" sx={{ mx: { xs: 2, sm: 0 } }}>
            <Typography variant="subtitle2" gutterBottom>📝 Wholesaler Repair Submission</Typography>
            <Typography variant="body2">
              As a wholesaler, you can record your client&apos;s information and special instructions in the notes section below.
              Our admin team will review your submission and provide pricing details.
            </Typography>
          </Alert>
        )}

        {/* Image Capture */}
        <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1.5, lineHeight: 1 }}>
            Item Photo
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Take a photo with your camera or upload from file
          </Typography>
          <Stack spacing={2} alignItems="center">
              <CameraCapture
                onCapture={(file) => {
                  setImageDescriptionError('');
                  setFormData(prev => ({ ...prev, picture: file }));
                  handleGenerateDescriptionFromImage(file);
                }}
              />
              {formData.picture && (
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <Box sx={{ mb: 1 }}>
                    <img
                      src={URL.createObjectURL(formData.picture)}
                      alt="Captured item"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }}
                    />
                  </Box>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <Chip 
                      label={formData.picture.name} 
                      color="success"
                      onDelete={() => setFormData(prev => ({ ...prev, picture: null }))}
                      deleteIcon={<DeleteIcon />}
                      sx={{ maxWidth: 250 }}
                    />
                  </Stack>
                </Box>
              )}
              <LoadingButton
                variant="outlined"
                onClick={() => handleGenerateDescriptionFromImage()}
                loading={generatingImageDescription}
                loadingPosition="start"
                startIcon={<AutoAwesomeIcon />}
                disabled={!formData.picture}
              >
                Regenerate Description with Gemini
              </LoadingButton>
              {imageDescriptionError && (
                <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                  {imageDescriptionError}
                </Alert>
              )}
              {!formData.picture && (
                <Typography variant="body2" color="text.secondary">
                  No photo selected
                </Typography>
              )}
            </Stack>
        </Box>

        {/* Item Details */}
        <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1.5, lineHeight: 1 }}>
            Item Details
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Smart Intake Input"
                  multiline
                  rows={2}
                  value={formData.smartIntakeInput}
                  onChange={(e) => {
                    setSmartIntakeError('');
                    setFormData(prev => ({ ...prev, smartIntakeInput: e.target.value }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleAnalyzeSmartIntake();
                    }
                  }}
                  placeholder="Tell us about the ring and what we are doing (e.g., 14k white gold ring resize from 6 to 7, retip prongs)"
                  helperText="Press Enter or click Analyze to auto-fill metal, ring sizing, and likely tasks. This does not replace your customer-facing description below."
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <LoadingButton
                    variant="outlined"
                    loading={analyzingSmartIntake}
                    onClick={handleAnalyzeSmartIntake}
                    startIcon={<AutoAwesomeIcon />}
                    loadingPosition="start"
                  >
                    Analyze Smart Intake
                  </LoadingButton>
                  <Typography variant="caption" color="text.secondary">
                    Enter submits analysis. Shift+Enter adds a new line.
                  </Typography>
                </Stack>
                {smartIntakeError ? (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    {smartIntakeError}
                  </Alert>
                ) : null}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </Grid>
              
              {/* Promise Date - Hidden for wholesalers (admin will set it) */}
              {!isWholesale && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Promise Date"
                    type="date"
                    size="small"
                    value={formData.promiseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, promiseDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
              )}

              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Metal Type</InputLabel>
                  <Select
                    value={formData.metalType}
                    label="Metal Type"
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metalType: e.target.value,
                      goldColor: '',
                      karat: '' // Reset karat when metal changes
                    }))}
                  >
                    {METAL_TYPES.map(metal => (
                      <MenuItem key={metal.value} value={metal.value}>
                        {metal.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {getKaratOptions().length > 0 && (
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Karat/Purity</InputLabel>
                    <Select
                      value={formData.karat}
                      label="Karat/Purity"
                      onChange={(e) => setFormData(prev => ({ ...prev, karat: e.target.value }))}
                    >
                      {getKaratOptions().map(karat => (
                        <MenuItem key={karat} value={karat}>
                          {karat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {formData.metalType === 'gold' && (
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gold Color</InputLabel>
                    <Select
                      value={formData.goldColor}
                      label="Gold Color"
                      onChange={(e) => setFormData(prev => ({ ...prev, goldColor: e.target.value }))}
                    >
                      {GOLD_COLORS.map((color) => (
                        <MenuItem key={color.value} value={color.value}>
                          {color.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Ring sizing toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRing}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        isRing: e.target.checked,
                        // Clear ring size fields when toggling off
                        currentRingSize: e.target.checked ? prev.currentRingSize : '',
                        desiredRingSize: e.target.checked ? prev.desiredRingSize : ''
                      }))}
                    />
                  }
                  label="This item is a ring (enable sizing fields)"
                />
              </Grid>

              {/* Ring sizing section */}
              {formData.isRing && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
                      Ring Sizing
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Autocomplete
                      options={RING_SIZES}
                      value={formData.currentRingSize}
                      onChange={(e, value) => setFormData(prev => ({ ...prev, currentRingSize: value }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Current Ring Size" size="small" />
                      )}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <Autocomplete
                      options={RING_SIZES}
                      value={formData.desiredRingSize}
                      onChange={(e, value) => setFormData(prev => ({ ...prev, desiredRingSize: value }))}
                      renderInput={(params) => (
                        <TextField {...params} label="Desired Ring Size" size="small" />
                      )}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  multiline
                  rows={isMobile ? 2 : 3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Customer notes, special instructions..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Internal Notes"
                  multiline
                  rows={isMobile ? 2 : 3}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                  placeholder="Internal team notes, not visible to customer..."
                />
              </Grid>
            </Grid>
        </Box>

        {/* Work Items */}
        <RepairItemsSection
          formData={formData}
          setFormData={setFormData}
          adminSettings={adminSettings}
          availableTasks={availableTasks}
          availableMaterials={availableMaterials}
          addTask={addTask}
          addMaterial={addMaterial}
          addCustomLineItem={addCustomLineItem}
          removeItem={removeItem}
          updateItem={updateItem}
          stullerSku={stullerSku}
          setStullerSku={setStullerSku}
          loadingStuller={loadingStuller}
          stullerError={stullerError}
          addStullerMaterial={addStullerMaterial}
        />

        {/* Total Cost & Pricing Breakdown */}
        <TotalCostCard 
          formData={formData}
          calculateTotalCost={calculateTotalCost}
          adminSettings={adminSettings}
        />
      </Stack>

      {/* New Client Dialog */}
      <Dialog
        open={showNewClientDialog}
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="First Name"
              value={newClientData.firstName}
              onChange={(e) => setNewClientData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Last Name"
              value={newClientData.lastName}
              onChange={(e) => setNewClientData(prev => ({ ...prev, lastName: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Phone"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              placeholder="(555) 123-4567"
              required
            />
            <TextField
              fullWidth
              size="small"
              label="Email"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
              helperText="Optional"
            />

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowNewClientDialog(false)}
            disabled={newClientLoading}
          >
            Cancel
          </Button>
          <LoadingButton 
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="contained"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.phone.trim()}
          >
            {newClientLoading ? 'Creating...' : 'Add Client'}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Save Button - Sticky on mobile */}
      <Box sx={{ 
        position: { xs: 'fixed', sm: 'static' },
        bottom: { xs: 0, sm: 'auto' },
        left: { xs: 0, sm: 'auto' },
        right: { xs: 0, sm: 'auto' },
        zIndex: { xs: 1100, sm: 'auto' },
        p: { xs: 1.5, sm: 0 },
        mt: { xs: 0, sm: 4 },
        bgcolor: { xs: 'background.paper', sm: 'transparent' },
        borderTop: { xs: '1px solid', sm: 'none' },
        borderColor: 'divider',
        boxShadow: { xs: '0 -2px 8px rgba(0,0,0,0.1)', sm: 'none' },
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading}
          startIcon={<SaveIcon />}
          size="large"
          fullWidth
          sx={{ 
            maxWidth: { xs: '100%', sm: 400 },
            py: 1.5,
            fontSize: { xs: '1rem', sm: '1.1rem' },
            fontWeight: 700,
          }}
        >
          {loading ? 'Saving...' : 'SAVE REPAIR'}
        </Button>
      </Box>
    </Box>
  );
}

// Separate component for repair items to keep main component manageable
function RepairItemsSection({
  formData,
  setFormData,
  adminSettings,
  availableTasks,
  availableMaterials,
  addTask,
  addMaterial,
  addCustomLineItem,
  removeItem,
  updateItem,
  stullerSku,
  setStullerSku,
  loadingStuller,
  stullerError,
  addStullerMaterial
}) {
  return (
    <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>

      {/* Tasks */}
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1, display: 'block', mb: 1.5 }}>
        Tasks {formData.tasks.length > 0 && `(${formData.tasks.length})`}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          options={availableTasks}
          getOptionLabel={(option) => `${option.title}`}
          renderInput={(params) => (
            <TextField {...params} label="Add Task" size="small" />
          )}
          onChange={(e, value) => value && addTask(value)}
        />
        {formData.tasks.map(task => (
          <TaskItem
            key={task.id}
            item={task}
            onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
            onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
            showPriceInput={false}
            onRemove={() => removeItem('tasks', task.id)}
          />
        ))}
      </Stack>

      {/* Materials */}
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1, display: 'block', mb: 1.5, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        Materials {formData.materials.length > 0 && `(${formData.materials.length})`}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          options={availableMaterials}
          getOptionLabel={(option) => {
            const displayName = option.displayName || option.name || 'Material';
            const basePrice = resolveMaterialRetailPrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
            return `${displayName} - $${basePrice.toFixed(2)}`;
          }}
          renderInput={(params) => (
            <TextField {...params} label="Add Material" size="small" />
          )}
          onChange={(e, value) => value && addMaterial(value)}
        />

        {/* Stuller Integration */}
        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block', mb: 1 }}>
            Add Stuller Gemstone/Material
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
            <TextField
              label="Stuller SKU"
              value={stullerSku}
              onChange={(e) => setStullerSku(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
              placeholder="Enter Stuller item number..."
              size="small"
              fullWidth
              error={!!stullerError}
              helperText={stullerError}
            />
            <LoadingButton
              onClick={addStullerMaterial}
              loading={loadingStuller}
              disabled={!stullerSku.trim()}
              variant="contained"
              size="small"
              sx={{ minWidth: 80, flexShrink: 0 }}
            >
              Add
            </LoadingButton>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Material will be added with markup applied.
          </Typography>
        </Box>

        {formData.materials.map(material => (
          <TaskItem
            key={material.id}
            item={material}
            onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
            onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
            onRemove={() => removeItem('materials', material.id)}
          />
        ))}
      </Stack>

      {/* Custom Items */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 2, mb: 1.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
          Custom Items {formData.customLineItems.length > 0 && `(${formData.customLineItems.length})`}
        </Typography>
        <Button startIcon={<AddIcon />} onClick={addCustomLineItem} variant="outlined" size="small">
          Add
        </Button>
      </Box>
      <Stack spacing={1.5}>
        {formData.customLineItems.map(item => (
          <CustomLineItem
            key={item.id}
            item={item}
            onDescriptionChange={(desc) => updateItem('customLineItems', item.id, 'description', desc)}
            onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
            onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
            onRemove={() => removeItem('customLineItems', item.id)}
          />
        ))}
      </Stack>
    </Box>
  );
}

// Task/Process/Material item component
function TaskItem({ item, onQuantityChange, onPriceChange, onRemove, showPriceInput = true }) {
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: item.isStullerItem ? 'primary.main' : 'divider', borderRadius: 1 }}>
      <Stack spacing={1}>
        {/* Top row: title + delete */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle2" noWrap>
                {item.title || item.displayName || item.name}
              </Typography>
              {item.isStullerItem && (
                <Chip label="Stuller" size="small" color="primary" variant="outlined" />
              )}
            </Stack>
            {item.description && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {item.description}
              </Typography>
            )}
            {item.isStullerItem && item.stullerData && (
              <Typography variant="caption" color="primary" display="block">
                SKU: {item.stullerData.itemNumber} | 
                Base: ${item.stullerData.originalPrice} | 
                Markup: {((item.stullerData.markup - 1) * 100).toFixed(0)}%
              </Typography>
            )}
          </Box>
          <IconButton color="error" onClick={onRemove} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        {/* Bottom row: qty, price, total */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="number"
            label="Qty"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          {showPriceInput && (
            <>
              <TextField
                type="number"
                label="Price"
                value={item.price}
                onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
                size="small"
                sx={{ width: 90 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
              </Typography>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

// Custom line item component
function CustomLineItem({
  item,
  onDescriptionChange,
  onQuantityChange,
  onPriceChange,
  onRemove
}) {
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <TextField
            fullWidth
            label="Description"
            value={item.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Custom work description..."
            size="small"
          />
          <IconButton color="error" onClick={onRemove} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="number"
            label="Qty"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            type="number"
            label="Price"
            value={item.price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            size="small"
            sx={{ width: 90 }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// Total cost card with rush job information
function TotalCostCard({ formData, calculateTotalCost, adminSettings }) {
  const [totalCost, setTotalCost] = React.useState(0);
  const [costBreakdown, setCostBreakdown] = React.useState({
    subtotal: 0,
    retailSubtotal: 0,
    wholesaleDiscount: 0,
    rushFee: 0,
    deliveryFee: 0,
    taxAmount: 0,
    final: 0,
    retailFinal: 0
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const updateTotal = async () => {
      setLoading(true);
      try {
        // Calculate detailed breakdown
        const tasksCost = formData.tasks.reduce((sum, item) => 
          sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
        const processesCost = formData.processes.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.pricing?.totalCost || 0) * (item.quantity || 1)), 0);
        const materialsCost = formData.materials.reduce((sum, item) => 
          sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
        const customCost = formData.customLineItems.reduce((sum, item) => 
          sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
        
        let originalSubtotal = tasksCost + processesCost + materialsCost + customCost;
        const retailSubtotal = [
          ...formData.tasks.map(t => toNumber(t.retailPrice ?? t.price) * (t.quantity || 1)),
          ...formData.processes.map(p => toNumber(p.retailPrice ?? p.price) * (p.quantity || 1)),
          ...formData.materials.map(m => toNumber(m.retailPrice ?? m.price) * (m.quantity || 1)),
          ...formData.customLineItems.map(c => toNumber(c.price) * (c.quantity || 1))
        ].reduce((sum, v) => sum + v, 0);
        
        console.log('🔍 TOTALCOSTCARD DEBUG:');
        console.log('📊 Individual Item Prices (already discounted if wholesale):', {
          tasksCost,
          processesCost,
          materialsCost,
          customCost,
          originalSubtotal
        });
        console.log('🎛️ Form Flags:', {
          isWholesale: formData.isWholesale,
          isRush: formData.isRush,
          includeDelivery: formData.includeDelivery,
          includeTax: formData.includeTax
        });
        
        // Sample individual item logging
        if (formData.tasks.length > 0) {
          console.log('🔍 Sample Task Item:', formData.tasks[0]);
        }
        
        let currentTotal = originalSubtotal;
        let wholesaleDiscount = 0;
        let rushFee = 0;
        let deliveryFee = 0;
        let taxAmount = 0;

        // Items are already priced at wholesale; compute the display discount from stored retailPrice
        if (formData.isWholesale) {
          wholesaleDiscount = Math.max(Math.round((retailSubtotal - originalSubtotal) * 100) / 100, 0);
        }

        // Build a parallel retail total to show wholesalers what to charge their customer.
        let retailCurrentTotal = retailSubtotal;
        if (formData.isRush) {
          retailCurrentTotal = retailCurrentTotal * adminSettings.rushMultiplier;
        }
        if (formData.includeDelivery) {
          retailCurrentTotal = retailCurrentTotal + adminSettings.deliveryFee;
        }
        if (formData.includeTax) {
          retailCurrentTotal = retailCurrentTotal + (retailCurrentTotal * adminSettings.taxRate);
        }

        // Apply rush job markup if applicable
        if (formData.isRush) {
          const beforeRush = currentTotal;
          currentTotal = currentTotal * adminSettings.rushMultiplier;
          rushFee = currentTotal - beforeRush;
        }

        // Add delivery fee if applicable (not subject to wholesale discount)
        if (formData.includeDelivery) {
          deliveryFee = adminSettings.deliveryFee;
          currentTotal = currentTotal + deliveryFee;
        }

        // Add tax if applicable (wholesale clients don't pay taxes)
        if (formData.includeTax && !formData.isWholesale) {
          taxAmount = currentTotal * adminSettings.taxRate;
          currentTotal = currentTotal + taxAmount;
        }

        setCostBreakdown({
          subtotal: originalSubtotal,
          retailSubtotal,
          wholesaleDiscount,
          rushFee,
          deliveryFee,
          taxAmount,
          final: currentTotal,
          retailFinal: retailCurrentTotal
        });

        const cost = await calculateTotalCost();
        setTotalCost(cost);
      } catch (error) {
        console.error('Error calculating total cost:', error);
        setTotalCost(0);
      } finally {
        setLoading(false);
      }
    };

    updateTotal();
  }, [formData.tasks, formData.processes, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, calculateTotalCost, adminSettings]);

  return (
    <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '2px solid', borderColor: 'warning.main', pt: 2 }}>
      <Stack spacing={2}>
          {/* Main Total */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formData.isWholesale ? 'Pricing Summary:' : 'Total Cost:'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              {loading ? (
                <Box component="span" sx={{ color: 'warning.main', fontSize: '0.7em' }}>Calculating...</Box>
              ) : (
                `$${totalCost.toFixed(2)}`
              )}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
              {formData.isWholesale && (
                <Chip label="Wholesale Pricing" color="primary" variant="outlined" size="small" />
              )}
              {formData.isRush && (
                <Chip label={`Rush (×${adminSettings.rushMultiplier})`} color="warning" variant="outlined" size="small" />
              )}
              {formData.includeDelivery && (
                <Chip label={`Delivery (+$${adminSettings.deliveryFee.toFixed(2)})`} color="info" variant="outlined" size="small" />
              )}
              {formData.includeTax && !formData.isWholesale && (
                <Chip label={`Tax (+${(adminSettings.taxRate * 100).toFixed(2)}%)`} color="secondary" variant="outlined" size="small" />
              )}
            </Stack>
          </Box>

          {!loading && formData.isWholesale && costBreakdown.retailSubtotal > 0 && (
            <Box sx={{
              p: 2,
              backgroundColor: 'primary.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.200'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Wholesaler Pricing
              </Typography>
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Price you are paying:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                    ${costBreakdown.final.toFixed(2)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Price you are charging:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    ${costBreakdown.retailFinal.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}
          
          {/* Detailed Cost Breakdown */}
          {!loading && !formData.isWholesale && costBreakdown.subtotal > 0 && (
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                Cost Breakdown:
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {formData.isWholesale ? 'Services & Materials (Wholesale):' : 'Services & Materials:'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${costBreakdown.subtotal.toFixed(2)}
                  </Typography>
                </Stack>

                {formData.isWholesale && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'primary.main' }}>
                    <Typography variant="body2">Services & Materials (Retail):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      ${costBreakdown.retailSubtotal.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.isWholesale && costBreakdown.wholesaleDiscount > 0 && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ color: 'primary.main' }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2">Wholesale Discount ({adminSettings.pricing?.wholesaleMarkup ? `${((adminSettings.pricing.wholesaleMarkup - 1) * 100).toFixed(0)}% over base` : 'configured rate'}):</Typography>
                      <Tooltip
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Wholesale Pricing</Typography>
                            <Typography variant="caption" display="block">• Wholesale total reflects the direct charge to your account</Typography>
                            <Typography variant="caption" display="block">• Suggested retail reflects your saved account markup and tax settings</Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'grey.300' }}>Set one markup and tax rate from Account Settings.</Typography>
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 14, cursor: 'help' }} />
                      </Tooltip>
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      -${costBreakdown.wholesaleDiscount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.isRush && costBreakdown.rushFee > 0 && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'warning.main' }}>
                    <Typography variant="body2">Rush Job Fee (×{adminSettings.rushMultiplier}):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      +${costBreakdown.rushFee.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.includeDelivery && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'info.main' }}>
                    <Typography variant="body2">Delivery Fee:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      +${costBreakdown.deliveryFee.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.includeTax && !formData.isWholesale && costBreakdown.taxAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'secondary.main' }}>
                    <Typography variant="body2">Tax ({(adminSettings.taxRate * 100).toFixed(2)}%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      +${costBreakdown.taxAmount.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                
                {formData.isWholesale && (
                  <Stack direction="row" justifyContent="space-between" sx={{ color: 'success.main' }}>
                    <Typography variant="body2">Tax (Wholesale Exempt):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      $0.00
                    </Typography>
                  </Stack>
                )}
                
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Final Total:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main', fontSize: '1.1em' }}>
                    ${costBreakdown.final.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}
          
          {!formData.isWholesale && (formData.isRush || formData.includeDelivery || (formData.includeTax && !formData.isWholesale)) && (
            <Typography variant="body2" color="text.secondary">
              {[
                formData.isRush && 'rush job markup', 
                formData.includeDelivery && 'delivery fee',
                (formData.includeTax && !formData.isWholesale) && 'tax'
              ].filter(Boolean).length > 1 
                ? `Price includes: ${[
                    formData.isRush && 'rush job markup', 
                    formData.includeDelivery && 'delivery fee',
                    (formData.includeTax && !formData.isWholesale) && 'tax'
                  ].filter(Boolean).join(', ')}`
                : formData.isRush 
                ? 'Price includes rush job markup'
                : formData.includeDelivery
                ? 'Price includes delivery fee'
                : 'Price includes tax'
              }
            </Typography>
          )}
        </Stack>
    </Box>
  );
};
