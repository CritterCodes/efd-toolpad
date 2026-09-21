'use client';

/**
 * useNewRepairForm — the intake form's data seam.
 *
 * Step 2 of the intake redesign (docs: facelift handoff INTAKE.md): every
 * piece of data fetching, derived state, and every handler from
 * NewRepairForm.js, moved here VERBATIM as a pure move — no logic edits, no
 * renames. The one exception by necessity: the Store select's inline
 * onChange body became `handleStoreChange(nextStoreId)` so the render could
 * call it by name; its body is unchanged.
 *
 * The component that renders from this hook is presentational; this hook
 * carries all the parity risk and is NOT redesigned with the UI.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Services
import tasksService from '@/services/tasks.service';
import materialsService from '@/services/materials.service';
import RepairsService from '@/services/repairs';
import UsersService from '@/services/users';
import wholesaleClientsAPIClient from '@/api-clients/wholesaleClients.client';
import wholesaleAccountSettingsAPIClient from '@/api-clients/wholesaleAccountSettings.client';
import pricingEngine from '@/services/PricingEngine';
import { alignTasksToMetal } from '@/services/repairs/metalTaskFilter';
import { extractRingSizesFromDescription, extractMetalContextFromDescription, normalizeRingSizeValue } from '@/services/repairs/smartIntakeExtractors';

// Context
import { useRepairs } from '@/app/context/repairs.context';

// Hooks
import usePromiseDateEstimate from '@/hooks/repairs/usePromiseDateEstimate';

// Metal configuration — single source of truth, shared with the custom-request intake.
import { METAL_TYPES } from '@/constants/customRequest.constants';
// Ported from main (2026-09-18/21): custom labor lines are TASKS priced from hours; store names
// come from the wholesaler's BUSINESS record, never the contact.
import {
  buildCustomLaborTask,
  updateCustomLaborTask as applyCustomLaborPatch,
  repriceCustomLaborTask,
  isCustomLaborTask,
} from '@/services/repairs/customLabor';
import { wholesalerBusinessName } from '@/services/wholesale/businessName';


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



const normalizeIsoPromiseDate = (value = '') => {
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

const buildLocalDate = (year, monthIndex, day) => new Date(year, monthIndex, day, 12, 0, 0, 0);

const formatLocalDateIso = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parsePromiseDateFromDescription = (description = '', referenceDate = new Date()) => {
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

const getRingSizeDelta = (currentRingSize = '', desiredRingSize = '') => {
  const current = Number(currentRingSize);
  const desired = Number(desiredRingSize);
  if (!Number.isFinite(current) || !Number.isFinite(desired)) return 0;
  return Math.round((desired - current) * 100) / 100;
};

const getAdditionalSizingMaterialQuantity = (currentRingSize = '', desiredRingSize = '') => {
  const delta = getRingSizeDelta(currentRingSize, desiredRingSize);
  if (delta <= 1) return 0;
  return Math.round((delta - 1) * 2) / 2;
};

const inferMaterialHintsFromSmartIntake = ({
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


export const toNumber = (value) => {
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

export const resolveTaskBasePrice = (task = {}, metalType = '', karat = '', goldColor = '') => {
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
  const { businessMultiplier } = normalizePricingSettings(adminSettings);

  // materialMarkup deprecated — retail = baseCost × businessMultiplier only (materials no longer double-marked-up)
  const retail = (safeMaterials + safeLabor) * businessMultiplier;
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

  // Retail line prices must stay pre-tax. Tax is applied at the receipt/total level.
  return Math.round(basePaidPrice * markupMultiplier * 100) / 100;
};

export const resolveMaterialRawPortionBaseCost = (material = {}, metalType = '', karat = '', goldColor = '') => {
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

export const resolveMaterialRetailPrice = (material = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const rawPortionBase = resolveMaterialRawPortionBaseCost(material, metalType, karat, goldColor);
  if (rawPortionBase > 0) {
    return calculateRetailFromBaseCosts(rawPortionBase, 0, adminSettings);
  }

  return resolveMaterialBasePrice(material, metalType, karat, goldColor);
};


// Wholesale price resolvers use stored wholesalePrice on tasks; baseCost × wholesaleMarkup for materials
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

export const resolveMaterialWholesalePrice = (material = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const rawBaseCost = resolveMaterialRawPortionBaseCost(material, metalType, karat, goldColor);
  if (rawBaseCost > 0) {
    const { wholesaleMarkup } = normalizePricingSettings(adminSettings);
    return Math.round(rawBaseCost * wholesaleMarkup * 100) / 100;
  }
  return 0;
};


export default function useNewRepairForm({
  onSubmit,
  initialData = null,
  submitMode = 'create',
  persistOnSubmit = true,
  isQuote = false,
  repairID = null,
  clientInfo = null,
  isWholesale = false,
  onWholesaleChange = null,
  wholesalerStoreId = null,
  wholesalerStoreName = null
}) {
  // Repairs context for updating the repairs list
  const { addRepair, updateRepair } = useRepairs();

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
    materials: [],
    customLineItems: [],

    // Pricing
    isWholesale: isWholesale || false, // Set wholesale status from prop
    storeId: 'engel-fine-design',
    storeName: 'Engel Fine Design',
    includeDelivery: false,
    includeTax: true, // Tax enabled by default
    compRepair: false,
    includedWithSale: false,
    whileYouWait: false,
    assignedTo: '',
    assignedJeweler: '',

    // Image
    picture: null
  });

  // Auto-suggested promise date (read-only for wholesalers, see render below).
  const {
    estimate: promiseDateEstimate,
    context: promiseDateContext,
    loading: promiseDateLoading,
    error: promiseDateError,
  } = usePromiseDateEstimate({
    tasks: formData.tasks,
    isRush: formData.isRush,
    isWholesale: formData.isWholesale,
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
  const pricingContextRef = useRef(null);
  const hydratingPricingContextRef = useRef(null);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'customer' // Default role
  });
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [wholesalerPricingSettings, setWholesalerPricingSettings] = useState(DEFAULT_WHOLESALER_PRICING_SETTINGS);

  // Data lists
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [benchJewelers, setBenchJewelers] = useState([]);
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
  const [picturePreviewUrl, setPicturePreviewUrl] = useState('');

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
        const settings = await wholesaleAccountSettingsAPIClient.fetchSettings(wholesalerStoreId);
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
  }, [isWholesale, wholesalerStoreId]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      const { processes, ...safeInitialData } = initialData;
      const normalizedMetalType = String(safeInitialData.metalType || '').toLowerCase();
      const inferredMetalType =
        normalizedMetalType.includes('gold') ? 'gold' :
        normalizedMetalType.includes('silver') ? 'silver' :
        normalizedMetalType.includes('platinum') ? 'platinum' :
        safeInitialData.metalType || '';
      const inferredKarat =
        safeInitialData.karat ||
        (normalizedMetalType.match(/\b(10k|14k|18k|22k|925|950|999)\b/) || [])[1] ||
        '';
      const inferredGoldColor =
        safeInitialData.goldColor ||
        (String(safeInitialData.baseMetal || '').includes('yellow') ? 'yellow' :
          String(safeInitialData.baseMetal || '').includes('white') ? 'white' :
          String(safeInitialData.baseMetal || '').includes('rose') ? 'rose' :
          safeInitialData.tasks?.find((task) => String(task?.baseMetal || '').includes('yellow')) ? 'yellow' :
          safeInitialData.tasks?.find((task) => String(task?.baseMetal || '').includes('white')) ? 'white' :
          safeInitialData.tasks?.find((task) => String(task?.baseMetal || '').includes('rose')) ? 'rose' :
          safeInitialData.materials?.flatMap((material) => material?.stullerProducts || []).find((product) => String(product?.metalType || '').includes('yellow')) ? 'yellow' :
          safeInitialData.materials?.flatMap((material) => material?.stullerProducts || []).find((product) => String(product?.metalType || '').includes('white')) ? 'white' :
          safeInitialData.materials?.flatMap((material) => material?.stullerProducts || []).find((product) => String(product?.metalType || '').includes('rose')) ? 'rose' :
          '');
      const inferredStoreId =
        safeInitialData.storeId ||
        (safeInitialData.isWholesale ? (safeInitialData.submittedBy || safeInitialData.createdBy || 'my-wholesale-store') : 'engel-fine-design');
      const inferredStoreName =
        safeInitialData.storeName ||
        safeInitialData.businessName ||
        (safeInitialData.isWholesale ? 'Wholesale Store' : 'Engel Fine Design');
      const initialPricingContext = `${inferredMetalType}|${inferredKarat}|${inferredMetalType === 'gold' ? inferredGoldColor : ''}`;
      pricingContextRef.current = initialPricingContext;
      hydratingPricingContextRef.current = initialPricingContext;

      setFormData(prev => ({
        ...prev,
        ...safeInitialData,
        metalType: inferredMetalType,
        karat: inferredKarat,
        goldColor: inferredMetalType === 'gold' ? inferredGoldColor : '',
        storeId: inferredStoreId,
        storeName: inferredStoreName
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (!formData.picture) {
      setPicturePreviewUrl('');
      return undefined;
    }

    if (typeof formData.picture === 'string') {
      setPicturePreviewUrl(formData.picture);
      return undefined;
    }

    if (formData.picture instanceof Blob) {
      const objectUrl = URL.createObjectURL(formData.picture);
      setPicturePreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPicturePreviewUrl('');
    return undefined;
  }, [formData.picture]);

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
          // allSettled for the same reason as the admin branch below: one failing catalog must not
          // discard the two that loaded. This is the wholesaler's intake form — a wholesaler hit the
          // same materials 401, so this branch had the identical failure waiting.
          const wsSettled = await Promise.allSettled([
            wholesaleClientsAPIClient.fetchMyClients(),
            tasksService.getTasks({ context: 'repair' }),
            materialsService.getMaterials()
          ]);
          const [users, tasks, materials] = wsSettled.map((r) => (r.status === 'fulfilled' ? r.value : null));
          const wsFailed = ['clients', 'tasks', 'materials'].filter((_, i) => wsSettled[i].status === 'rejected');
          if (wsFailed.length > 0) {
            console.error('[wholesale intake] failed to load:', wsFailed.join(', '),
              wsSettled.filter((r) => r.status === 'rejected').map((r) => r.reason?.message || r.reason));
            setErrors((prev) => ({
              ...prev,
              submit: `Could not load ${wsFailed.join(' and ')}. Those options will be missing — reload the page, and tell an admin if it keeps happening.`,
            }));
          }
          const usersData = users?.data || [];
          setAvailableUsers(usersData);
          setAvailableTasks(tasks?.data || tasks || []);
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
          // allSettled, NOT all. One failing catalog must not blank the others.
          //
          // This is how a single 401 took out the whole intake form: getMaterials started returning 401
          // for onsite artisans, Promise.all rejected, and the task list and wholesale-account list —
          // both of which had returned 200 with data — were thrown away with it. Two empty dropdowns,
          // no error on screen, and no way to write up a repair. The failure was in materials; the
          // symptom was everywhere else, which is what made it hard to find.
          const settled = await Promise.allSettled([
            tasksService.getTasks({ context: 'repair' }),
            materialsService.getMaterials(),
            UsersService.getAllUsers(),
            fetch('/api/users?role=wholesaler').then((res) => res.ok ? res.json() : { data: [] }),
          ]);
          const [tasks, materials, users, wholesalers] = settled.map((r) => (r.status === 'fulfilled' ? r.value : null));

          // Say which one broke, ON SCREEN. Silence is what turned a 401 into a mystery: two empty
          // dropdowns and nothing to indicate the form hadn't finished loading.
          const failedLoads = ['tasks', 'materials', 'clients', 'wholesale accounts']
            .filter((_, i) => settled[i].status === 'rejected');
          if (failedLoads.length > 0) {
            console.error('[repair intake] failed to load:', failedLoads.join(', '),
              settled.filter((r) => r.status === 'rejected').map((r) => r.reason?.message || r.reason));
            setErrors((prev) => ({
              ...prev,
              submit: `Could not load ${failedLoads.join(' and ')}. Those options will be missing — reload the page, and tell an admin if it keeps happening.`,
            }));
          }

          console.log('📋 Tasks loaded:', tasks);
          console.log('📦 Materials loaded:', materials);
          console.log('👥 Users loaded:', users);

          // Optional-chained: a rejected load is null now, and `null.data` would throw a TypeError
          // here — trading a silent empty list for a crashed form.
          setAvailableTasks(tasks?.data || tasks || []);
          setAvailableMaterials(materials?.data || materials || []);

          const usersData = users?.users || users?.data || users || [];
          setAvailableUsers(usersData.filter((user) => String(user?.role || '').toLowerCase() !== 'wholesaler'));
          adminUsersRef.current = usersData.filter((user) => String(user?.role || '').toLowerCase() !== 'wholesaler');

          const wholesalerData = Array.isArray(wholesalers?.data) ? wholesalers.data : [];
          const wholesalerStores = wholesalerData.map((store) => ({
            id: store.userID || store._id,
            // The BUSINESS, never the contact: Greers Pawn had only wholesaleApplication.businessName and
            // this line named the store "Sam Johnson", keying 20 repairs + 7 invoices to a person.
            name: wholesalerBusinessName(store, 'Wholesale Store'),
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

  useEffect(() => {
    let cancelled = false;

    fetch('/api/repairs/bench-jewelers')
      .then(async (res) => {
        if (!res.ok) return [];
        return await res.json();
      })
      .then((data) => {
        if (!cancelled) setBenchJewelers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBenchJewelers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getJewelerLabel = (jeweler) => (
    [jeweler.firstName, jeweler.lastName].filter(Boolean).join(' ').trim()
    || jeweler.name
    || jeweler.email
    || jeweler.userID
  );

  // Live price helpers use PricingEngine directly so repair pricing stays calculated from current cost inputs.
  const computeTaskPricing = (task, metalType, karat, goldColor = '') => {
    try {
      return pricingEngine.calculateTaskCost(
        task,
        adminSettings,
        [],
        availableMaterials,
        metalType && karat ? { metalType, karat, goldColor } : null
      );
    } catch {
      return null;
    }
  };

  const computeTaskRetailPrice = (task, metalType, karat, goldColor = '') => {
    const livePricing = computeTaskPricing(task, metalType, karat, goldColor);
    if (livePricing?.retailPrice > 0) return livePricing.retailPrice;
    const pricingRetail = toNumber(task?.pricing?.retailPrice);
    if (pricingRetail > 0) return pricingRetail;

    const stored = resolveTaskBasePrice(task, metalType, karat, '');
    return stored > 0 ? stored : 0;
  };

  const computeTaskWholesalePrice = (task, metalType, karat, goldColor = '') => {
    const livePricing = computeTaskPricing(task, metalType, karat, goldColor);
    if (livePricing?.wholesalePrice > 0) return livePricing.wholesalePrice;

    const pricing = task?.pricing || {};
    const fallbackBaseCost = toNumber(
      pricing.baseCost ??
      (
        toNumber(pricing.laborCost) +
        toNumber(
          pricing.totalMaterialCost ??
          pricing.totalMaterialsCost ??
          pricing.totalProcessMaterialCost ??
          pricing.markedUpMaterialCost ??
          pricing.materialsCost
        ) +
        toNumber(pricing.toolDepreciationCost)
      )
    );
    if (fallbackBaseCost > 0) {
      const { wholesaleMarkup } = normalizePricingSettings(adminSettings);
      return Math.round(fallbackBaseCost * wholesaleMarkup * 100) / 100;
    }

    const universalWholesale = getUniversalVariantWholesalePrice(task.universalPricing, metalType, karat, goldColor);
    return universalWholesale > 0 ? universalWholesale : 0;
  };

  const buildTaskItemsFromInferred = useCallback((tasks = [], previousForm) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    const nextMetalType = previousForm?.metalType || '';
    const nextKarat = previousForm?.karat || '';
    const nextGoldColor = previousForm?.goldColor || '';

    return tasks.map((task, index) => {
      const livePricing = computeTaskPricing(task, nextMetalType, nextKarat, nextGoldColor);
      const baseRetailPrice = livePricing?.retailPrice || computeTaskRetailPrice(task, nextMetalType, nextKarat, nextGoldColor);
      const wholesalePrice = livePricing?.wholesalePrice || computeTaskWholesalePrice(task, nextMetalType, nextKarat, nextGoldColor);
      const paidPrice = previousForm.isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
      const retailPrice = previousForm.isWholesale
        ? applyWholesalerRetailAdjustments(paidPrice, wholesalerPricingSettings)
        : baseRetailPrice;

      return {
        ...task,
        id: Date.now() + index,
        // Per-unit tasks (per prong / per stone) arrive from smart intake with a
        // counted quantity; everything else defaults to 1 exactly as before.
        quantity: Math.max(1, Math.round(Number(task.__aiQuantity) || 1)),
        pricing: livePricing ? { ...(task.pricing || {}), ...livePricing, liveCalculated: true } : task.pricing,
        retailPrice,
        price: paidPrice
      };
    });
  }, [wholesalerPricingSettings]);

  const buildMaterialItemsFromInferred = useCallback((materialHints = [], previousForm) => {
    if (!Array.isArray(materialHints) || materialHints.length === 0 || !Array.isArray(availableMaterials) || availableMaterials.length === 0) {
      return [];
    }

    const nextMetalType = previousForm?.metalType || '';
    const nextKarat = previousForm?.karat || '';
    const nextGoldColor = previousForm?.goldColor || '';

    const scoreMaterialForHint = (material, hintType) => {
      const searchText = [
        material?.name,
        material?.displayName,
        material?.description,
        material?.category,
        material?.metalType,
        material?.karat,
        material?.sku,
        ...(Array.isArray(material?.stullerProducts)
          ? material.stullerProducts.flatMap((product) => [
              product?.description,
              product?.metalType,
              product?.karat,
              product?.itemNumber
            ])
          : [])
      ].filter(Boolean).join(' ').toLowerCase();

      let score = 0;

      if (hintType === 'sizing_material') {
        if (String(material?.category || '').toLowerCase() === 'sizing_material') score += 100;
        if (searchText.includes('sizing stock')) score += 60;
        if (searchText.includes('sizing')) score += 25;
        if (searchText.includes('stock')) score += 10;
      }

      const context = keyMatchesContext(searchText, nextMetalType, nextKarat, nextGoldColor);
      if (context.hasMetal) score += 20;
      if (context.hasKarat) score += 10;
      if (context.hasExactContext) score += 25;

      return score;
    };

    return materialHints.map((hint, index) => {
      const normalizedHintType = String(hint?.type || '').trim().toLowerCase();
      const quantity = Math.max(Number(hint?.quantity || 0), 0);
      if (!normalizedHintType || quantity <= 0) return null;

      const matchedMaterial = [...availableMaterials]
        .map((material) => ({ material, score: scoreMaterialForHint(material, normalizedHintType) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.material;

      if (!matchedMaterial) return null;

      const baseRetailPrice = resolveMaterialRetailPrice(
        matchedMaterial,
        nextMetalType,
        nextKarat,
        nextGoldColor,
        adminSettings
      );
      const wholesalePrice = resolveMaterialWholesalePrice(
        matchedMaterial,
        nextMetalType,
        nextKarat,
        nextGoldColor,
        adminSettings
      );
      const paidPrice = previousForm.isWholesale
        ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice)
        : baseRetailPrice;
      const retailPrice = previousForm.isWholesale
        ? applyWholesalerRetailAdjustments(paidPrice, wholesalerPricingSettings)
        : baseRetailPrice;

      return {
        ...matchedMaterial,
        id: Date.now() + index,
        quantity,
        retailPrice,
        price: paidPrice,
        _smartIntakeHintType: normalizedHintType,
        _smartIntakeReason: hint?.reason || ''
      };
    }).filter(Boolean);
  }, [adminSettings, availableMaterials, wholesalerPricingSettings]);

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
      } else if ((updates.metalType || prev.metalType) === 'platinum' && !results.karat && !String(prev.karat || '').trim()) {
        // Platinum without a stated purity defaults to 950 — the form's primary
        // platinum option and the key the material variants price under. Without
        // this, the pricing context is null and platinum tasks price at base.
        updates.karat = '950';
      }

      if (isRing && results.currentRingSize) {
        updates.currentRingSize = normalizeRingSizeValue(results.currentRingSize);
      }

      if (isRing && results.desiredRingSize) {
        updates.desiredRingSize = normalizeRingSizeValue(results.desiredRingSize);
      }

      if (results.promiseDate && !String(prev.promiseDate || '').trim()) {
        const normalizedPromiseDate = normalizeIsoPromiseDate(results.promiseDate);
        if (normalizedPromiseDate) {
          updates.promiseDate = normalizedPromiseDate;
        }
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

      if (Array.isArray(results.materialHints) && results.materialHints.length > 0) {
        const inferredMaterialItems = buildMaterialItemsFromInferred(results.materialHints, {
          ...prev,
          ...updates
        });

        if (inferredMaterialItems.length > 0) {
          const mergedMaterials = [...(prev.materials || [])];

          inferredMaterialItems.forEach((item) => {
            const matchIndex = mergedMaterials.findIndex((existing) => {
              const sameId = existing?._id && item?._id && String(existing._id) === String(item._id);
              const sameName = String(existing?.name || existing?.displayName || '').trim().toLowerCase()
                === String(item?.name || item?.displayName || '').trim().toLowerCase();
              return sameId || sameName;
            });

            if (matchIndex >= 0) {
              const existing = mergedMaterials[matchIndex];
              mergedMaterials[matchIndex] = {
                ...existing,
                quantity: Math.max(Number(existing.quantity || 0), Number(item.quantity || 0)),
                _smartIntakeHintType: existing._smartIntakeHintType || item._smartIntakeHintType,
                _smartIntakeReason: existing._smartIntakeReason || item._smartIntakeReason
              };
              return;
            }

            mergedMaterials.push(item);
          });

          updates.materials = mergedMaterials;
        }
      }

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [buildMaterialItemsFromInferred, buildTaskItemsFromInferred]);

  const runRuleBasedSmartIntake = useCallback((inputText = '') => {
    const parsingText = String(inputText || '').trim();
    if (!parsingText) {
      return;
    }

    const detectedMetalContext = extractMetalContextFromDescription(parsingText) || {};
    const detectedRingSizes = extractRingSizesFromDescription(parsingText);
    const inferredTasks = alignTasksToMetal(
      inferTasksFromDescription(parsingText, availableTasks),
      detectedMetalContext.metalType || '',
      availableTasks
    );
    const isRingCategory = SIZEABLE_CATEGORIES.some((cat) => parsingText.toLowerCase().includes(cat) || parsingText.toLowerCase().includes('ring'));
    const promiseDate = parsePromiseDateFromDescription(parsingText);
    const materialHints = inferMaterialHintsFromSmartIntake({
      inputText: parsingText,
      isRing: isRingCategory,
      currentRingSize: detectedRingSizes.currentRingSize,
      desiredRingSize: detectedRingSizes.desiredRingSize
    });

    applySmartIntakeResults({
      inputText: parsingText,
      isRing: isRingCategory,
      metalType: detectedMetalContext.metalType || '',
      karat: detectedMetalContext.karat || '',
      goldColor: detectedMetalContext.goldColor || '',
      currentRingSize: detectedRingSizes.currentRingSize,
      desiredRingSize: detectedRingSizes.desiredRingSize,
      promiseDate,
      materialHints,
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
        metals: Array.isArray(t.metals) && t.metals.length ? t.metals : undefined,
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

      // A gateway timeout (504) returns Vercel's HTML error page, not JSON —
      // parse defensively so the fallback banner names the failure instead of
      // showing a JSON.parse token error.
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `AI request failed (HTTP ${response.status})`);
      }

      const parsed = payload?.data?.parsed || {};
      // matchedTasks carries per-task quantity ("retip 14 prongs" = retip x14);
      // matchedTaskIds is the legacy shape and implies quantity 1.
      const matchedPairs = Array.isArray(parsed.matchedTasks) && parsed.matchedTasks.length > 0
        ? parsed.matchedTasks
        : (Array.isArray(parsed.matchedTaskIds) ? parsed.matchedTaskIds : []).map((id) => ({ id, quantity: 1 }));
      const quantityByTaskId = new Map(
        matchedPairs.map((p) => [String(p.id), Math.max(1, Number(p.quantity) || 1)])
      );

      let aiMatchedTasks = [];
      if (matchedPairs.length > 0) {
        aiMatchedTasks = matchedPairs
          .map((p) => availableTasks.find((t) => String(t._id) === String(p.id)))
          .filter(Boolean);
      }

      if (aiMatchedTasks.length === 0) {
        aiMatchedTasks = inferTasksFromDescription(parsingText, availableTasks);
      }

      aiMatchedTasks = disambiguateSizingTasks(
        aiMatchedTasks, parsingText,
        parsed.currentRingSize || '', parsed.desiredRingSize || ''
      );

      // Metal is the recipe: a platinum job swaps generic matches for the
      // laser-welded platinum tasks, and a platinum task never lands on a gold
      // job. Deterministic — the AI prompt only hints, this decides. Aligned
      // one at a time so each task's quantity survives an identity swap.
      aiMatchedTasks = aiMatchedTasks
        .map((task) => {
          const [aligned] = alignTasksToMetal([task], parsed.metalType || '', availableTasks);
          if (!aligned) return null;
          return { ...aligned, __aiQuantity: quantityByTaskId.get(String(task._id)) || 1 };
        })
        .filter(Boolean);

      applySmartIntakeResults({
        inputText: parsingText,
        isRing: typeof parsed.isRing === 'boolean' ? parsed.isRing : null,
        metalType: parsed.metalType || '',
        karat: parsed.karat || '',
        goldColor: parsed.goldColor || '',
        currentRingSize: parsed.currentRingSize || '',
        desiredRingSize: parsed.desiredRingSize || '',
        promiseDate: parsed.promiseDate || parsePromiseDateFromDescription(parsingText),
        materialHints: Array.isArray(parsed.materialHints) && parsed.materialHints.length > 0
          ? parsed.materialHints
          : inferMaterialHintsFromSmartIntake({
              inputText: parsingText,
              isRing: typeof parsed.isRing === 'boolean' ? parsed.isRing : false,
              currentRingSize: parsed.currentRingSize || '',
              desiredRingSize: parsed.desiredRingSize || ''
            }),
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
    if (formData.compRepair || formData.includedWithSale) return 0;

    console.log('🧮 CALCULATETOTALCOST START');
    const tasksCost = formData.tasks.reduce((sum, item) =>
      sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
    const materialsCost = formData.materials.reduce((sum, item) =>
      sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
    const customCost = formData.customLineItems.reduce((sum, item) =>
      sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);

    let subtotal = tasksCost + materialsCost + customCost;

    console.log('📊 CALCULATETOTALCOST - Individual Costs:', {
      tasksCost,
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
  }, [formData.tasks, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, formData.metalType, formData.karat, formData.goldColor]);

  // Add item handlers
  const addTask = (task) => {
    const livePricing = computeTaskPricing(task, formData.metalType, formData.karat, formData.goldColor);
    const baseRetailPrice = livePricing?.retailPrice || computeTaskRetailPrice(task, formData.metalType, formData.karat, formData.goldColor);
    const wholesalePrice = livePricing?.wholesalePrice || computeTaskWholesalePrice(task, formData.metalType, formData.karat, formData.goldColor);
    const price = formData.isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
    const retailPrice = formData.isWholesale
      ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
      : baseRetailPrice;
    const newTask = {
      ...task,
      id: Date.now(),
      quantity: 1,
      pricing: livePricing ? { ...(task.pricing || {}), ...livePricing, liveCalculated: true } : task.pricing,
      retailPrice,
      price
    };
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

  // Custom NON-labor charge (a sourced part, a fee). No labor hours — labor is a task.
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

  // Custom LABOR line: a task priced from hours × wage through the task engine, so it gets
  // sign-off / hand-off / per-jeweler labor credit like any catalog task. Price is editable
  // (bulk discount) and the override survives re-pricing. See services/repairs/customLabor.js.
  const addCustomLaborTask = () => {
    const task = buildCustomLaborTask({ id: Date.now(), adminSettings, isWholesale: formData.isWholesale });
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const patchCustomLaborTask = (id, patch) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task) => (
        task.id === id && isCustomLaborTask(task)
          ? applyCustomLaborPatch(task, patch, { adminSettings, isWholesale: prev.isWholesale })
          : task
      ))
    }));
  };

  // Recalculate all item prices when wholesale status changes
  const recalculateAllItemPrices = (isWholesale) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (isCustomLaborTask(task)) {
          return repriceCustomLaborTask(task, { adminSettings, isWholesale });
        }
        const livePricing = computeTaskPricing(task, formData.metalType, formData.karat, formData.goldColor);
        const baseRetailPrice = livePricing?.retailPrice || computeTaskRetailPrice(task, formData.metalType, formData.karat, formData.goldColor);
        const wholesalePrice = livePricing?.wholesalePrice || computeTaskWholesalePrice(task, formData.metalType, formData.karat, formData.goldColor);
        const price = isWholesale ? (wholesalePrice > 0 ? wholesalePrice : baseRetailPrice) : baseRetailPrice;
        const retailPrice = isWholesale
          ? applyWholesalerRetailAdjustments(price, wholesalerPricingSettings)
          : baseRetailPrice;
        return {
          ...task,
          pricing: livePricing ? { ...(task.pricing || {}), ...livePricing, liveCalculated: true } : task.pricing,
          retailPrice,
          price
        };
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
    const pricingContext = `${formData.metalType || ''}|${formData.karat || ''}|${formData.goldColor || ''}`;
    if (hydratingPricingContextRef.current) {
      if (pricingContext === hydratingPricingContextRef.current) {
        pricingContextRef.current = pricingContext;
        hydratingPricingContextRef.current = null;
      }
      return;
    }

    if (pricingContextRef.current === null) {
      pricingContextRef.current = pricingContext;
      return;
    }

    if (pricingContextRef.current === pricingContext) {
      return;
    }

    pricingContextRef.current = pricingContext;
    if (formData.tasks.length > 0) {
      recalculateAllItemPrices(formData.isWholesale);
    }
  }, [formData.metalType, formData.karat, formData.goldColor]);

  useEffect(() => {
    if (submitMode === 'edit') return;
    if (formData.isWholesale && (formData.tasks.length > 0 || formData.materials.length > 0)) {
      recalculateAllItemPrices(true);
    }
  }, [wholesalerPricingSettings]);

  // Store selection — lifted verbatim from the Store <Select> onChange in the
  // render (the only inline handler with data fetching). Body unchanged.
  const handleStoreChange = (nextStoreId) => {
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
  };

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
        retailPrice,
        unitCost: basePrice,
        stullerPrice: basePrice,
        baseCostPerPortion: basePrice,
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
  // `opts.requestQuote` — the store can't price it: create the repair with no tasks and ask EFD to
  // quote (services/repairs/quoteRequest.js). The onClick handler passes a click event, not opts.
  const handleSubmit = async (opts = {}) => {
    const requestQuote = opts?.requestQuote === true;
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
      // Promise date is only required for non-wholesale submissions, and never
      // for a quote — see the isQuote prop.
      if (!isQuote && !formData.isWholesale && !formData.promiseDate) {
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
      if (formData.whileYouWait && !formData.assignedTo) {
        throw new Error('Choose the artisan who completed the while-you-wait repair');
      }

      // Prepare submission data with detailed pricing breakdown
      let totalCost = 0;
      let subtotal = 0;
      let tasksCost = 0;
      let materialsCost = 0;
      let customCost = 0;

      const isCompedRepair = formData.compRepair || formData.includedWithSale;

      // For admin users, calculate detailed pricing
      if (!formData.isWholesale && !isCompedRepair) {
        totalCost = await calculateTotalCost();

        // Calculate pricing breakdown properly
        tasksCost = formData.tasks.reduce((sum, item) =>
          sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
        materialsCost = formData.materials.reduce((sum, item) =>
          sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
        customCost = formData.customLineItems.reduce((sum, item) =>
          sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);

        // Base subtotal (individual item prices are already wholesale-discounted if applicable)
        subtotal = tasksCost + materialsCost + customCost;
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
      console.log('📊 Base Costs (individual prices already wholesale-adjusted):', { tasksCost, materialsCost, customCost, subtotal });
      console.log('💰 Calculated Values:', { subtotal, rushFee, deliveryFee, taxAmount, totalCost });
      console.log('⚙️ Settings:', {
        isWholesale: formData.isWholesale,
        isRush: formData.isRush,
        includeDelivery: formData.includeDelivery,
        includeTax: formData.includeTax,
        taxRate: adminSettings.taxRate,
        rushMultiplier: adminSettings.rushMultiplier
      });

      const selectedWhileYouWaitJeweler = benchJewelers.find((jeweler) => jeweler.userID === formData.assignedTo);
      const whileYouWaitJewelerName = selectedWhileYouWaitJeweler ? getJewelerLabel(selectedWhileYouWaitJeweler) : formData.assignedJeweler;
      const completedNow = new Date().toISOString();
      const sanitizedFormData = formData;
      const submissionData = {
        ...sanitizedFormData,
        ...(requestQuote ? { quoteRequested: true } : {}),
        // For wholesalers, set a placeholder promise date if none provided (admin will update it)
        promiseDate: isQuote
          ? ''
          : formData.isWholesale && !formData.promiseDate
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

        createdAt: initialData?.createdAt || new Date().toISOString(),
        status: submitMode === 'create' && formData.whileYouWait
          ? 'COMPLETED'
          : submitMode === 'edit'
          ? (formData.status || initialData?.status || 'READY FOR WORK')
          : 'READY FOR WORK',
        ...(submitMode === 'create' && formData.whileYouWait ? {
          benchStatus: null,
          assignedTo: formData.assignedTo,
          assignedJeweler: whileYouWaitJewelerName,
          claimedAt: completedNow,
          completedBy: whileYouWaitJewelerName,
          completedAt: completedNow,
          qcBy: whileYouWaitJewelerName,
          qcDate: completedNow,
          whileYouWaitCompletedAt: completedNow,
          whileYouWaitCompletedBy: whileYouWaitJewelerName
        } : {})
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

      if (!persistOnSubmit) {
        onSubmit(submissionData);
        setLoading(false);
        return;
      }

      if (requestQuote) submissionData.tasks = [];
      const result = submitMode === 'edit' && repairID
        ? await RepairsService.updateRepair(repairID, submissionData)
        : await RepairsService.createRepair(submissionData);

      if (submitMode === 'edit') {
        const repairToUpdate = result?.repair || result?.newRepair || result;
        if (repairToUpdate?.repairID) {
          console.log('Updating repair in context:', repairToUpdate.repairID);
          updateRepair(repairToUpdate.repairID, repairToUpdate);
        } else if (repairID) {
          console.warn('Update response did not include a repairID; merging submitted data into context:', result);
          updateRepair(repairID, submissionData);
        }
      } else if (isCompedRepair) {
        totalCost = 0;
        subtotal = 0;
        tasksCost = 0;
        materialsCost = 0;
        customCost = 0;
      } else {
        // Add the new repair to the repairs context immediately
        if (result && (result.repairID || result.newRepair?.repairID)) {
          const repairToAdd = result.newRepair || result;
          console.log('Adding new repair to context:', repairToAdd.repairID);
          addRepair(repairToAdd);
        } else {
          console.warn('Could not add repair to context - no repairID found in result:', result);
        }
      }

      onSubmit(result);

    } catch (error) {
      // Coerce to a STRING. A gateway 504 returns { error: { code, message } }; setting that
      // object as errors.submit and rendering it crashed the page (React error #31 —
      // "objects are not valid as a React child").
      const data = error?.response?.data;
      const candidate =
        (typeof data?.error === 'string' && data.error) ||
        (data?.error && typeof data.error === 'object' && (data.error.message || data.error.code)) ||
        (typeof data?.message === 'string' && data.message) ||
        error?.message ||
        'Failed to create repair';
      setErrors({ submit: typeof candidate === 'string' ? candidate : String(candidate) });
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
          role: newClientData.role || 'customer',
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
        role: 'customer'
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

  return {
    // Form state
    formData,
    setFormData,

    // UI state
    loading,
    errors,
    expandedSection,
    setExpandedSection,
    showNewClientDialog,
    setShowNewClientDialog,
    analyzingSmartIntake,
    smartIntakeError,
    setSmartIntakeError,
    generatingImageDescription,
    imageDescriptionError,
    setImageDescriptionError,
    newClientData,
    setNewClientData,
    newClientLoading,
    picturePreviewUrl,

    // Data lists
    availableTasks,
    availableMaterials,
    availableUsers,
    benchJewelers,
    availableStores,
    rushJobInfo,
    adminSettings,
    wholesalerPricingSettings,

    // Stuller
    stullerSku,
    setStullerSku,
    loadingStuller,
    stullerError,
    addStullerMaterial,

    // Promise date estimate
    promiseDateEstimate,
    promiseDateContext,
    promiseDateLoading,
    promiseDateError,

    // Derived helpers
    getJewelerLabel,
    getKaratOptions,
    calculateTotalCost,
    formatPhoneNumber,

    // Handlers
    handleStoreChange,
    addTask,
    addMaterial,
    addCustomLineItem,
    addCustomLaborTask,
    patchCustomLaborTask,
    removeItem,
    updateItem,
    recalculateAllItemPrices,
    handleSubmit,
    handleAddNewClient,
    handleImageCapture,
    handleGenerateDescriptionFromImage,
    handleAnalyzeSmartIntake
  };
}
