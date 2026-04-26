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

const UI = {
  bgPrimary: '#0F1115',
  bgPanel: '#15181D',
  bgCard: '#171A1F',
  bgTertiary: '#1F232A',
  border: '#2A2F38',
  textPrimary: '#E6E8EB',
  textHeader: '#D1D5DB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#D4AF37',
  shadow: '0 8px 24px rgba(0,0,0,0.45)'
};

const sectionCardSx = {
  px: { xs: 0, sm: 2.5, md: 3 },
  py: { xs: 2, sm: 2.5 },
  backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
  border: { xs: 'none', sm: '1px solid' },
  borderColor: UI.border,
  borderRadius: { xs: 0, sm: 3 },
  boxShadow: { xs: 'none', sm: UI.shadow },
  borderTop: { xs: '1px solid', sm: 'none' }
};

const sectionLabelSx = {
  color: UI.textSecondary,
  fontWeight: 700,
  display: 'block',
  mb: 1.25,
  lineHeight: 1,
  letterSpacing: '0.08em'
};

const neutralChipSx = {
  backgroundColor: UI.bgTertiary,
  color: UI.textPrimary,
  border: '1px solid',
  borderColor: UI.border
};

const autocompleteSlotProps = {
  paper: {
    sx: {
      mt: 0.5,
      backgroundColor: UI.bgCard,
      color: UI.textPrimary,
      border: '1px solid',
      borderColor: UI.border,
      boxShadow: UI.shadow,
      backgroundImage: 'none'
    }
  },
  listbox: {
    sx: {
      py: 0.5,
      '& .MuiAutocomplete-option': {
        alignItems: 'flex-start',
        borderBottom: '1px solid',
        borderColor: UI.border,
        px: 1.5,
        py: 1.25,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&[aria-selected="true"]': {
          backgroundColor: UI.bgTertiary
        },
        '&.Mui-focused, &.Mui-focusVisible': {
          backgroundColor: UI.bgPanel
        }
      }
    }
  },
  popper: {
    sx: {
      '& .MuiAutocomplete-noOptions': {
        color: UI.textSecondary,
        backgroundColor: UI.bgCard
      }
    }
  }
};

const selectMenuProps = {
  PaperProps: {
    sx: {
      mt: 0.5,
      backgroundColor: UI.bgCard,
      color: UI.textPrimary,
      border: '1px solid',
      borderColor: UI.border,
      boxShadow: UI.shadow,
      backgroundImage: 'none',
      '& .MuiMenuItem-root': {
        fontSize: '0.95rem',
        borderBottom: '1px solid',
        borderColor: UI.border,
        '&:last-of-type': {
          borderBottom: 'none'
        },
        '&.Mui-selected': {
          backgroundColor: UI.bgTertiary
        },
        '&.Mui-focusVisible, &:hover': {
          backgroundColor: UI.bgPanel
        }
      }
    }
  },
  MenuListProps: {
    sx: {
      py: 0.5
    }
  }
};

function FormSection({ title, subtitle, children, sx }) {
  return (
    <Box sx={{ ...sectionCardSx, ...sx }}>
      <Box sx={{ mb: 2, px: { xs: 0.5, sm: 0 } }}>
        <Typography variant="overline" sx={sectionLabelSx}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: UI.textSecondary }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ px: { xs: 0.5, sm: 0 } }}>{children}</Box>
    </Box>
  );
}

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

  // Retail line prices must stay pre-tax. Tax is applied at the receipt/total level.
  return Math.round(basePaidPrice * markupMultiplier * 100) / 100;
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

const resolveMaterialWholesalePrice = (material = {}, metalType = '', karat = '', goldColor = '', adminSettings = {}) => {
  const rawBaseCost = resolveMaterialRawPortionBaseCost(material, metalType, karat, goldColor);
  if (rawBaseCost > 0) {
    const { wholesaleMarkup } = normalizePricingSettings(adminSettings);
    return Math.round(rawBaseCost * wholesaleMarkup * 100) / 100;
  }
  return 0;
};


export default function NewRepairForm({ 
  onSubmit, 
  initialData = null,
  submitMode = 'create',
  repairID = null,
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
    role: 'customer' // Default role
  });
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [wholesalerPricingSettings, setWholesalerPricingSettings] = useState(DEFAULT_WHOLESALER_PRICING_SETTINGS);
  
  // Data lists
  const [availableTasks, setAvailableTasks] = useState([]);
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
      
      console.log('Ã°Å¸â€Â Client info detected:', { 
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
      console.log('Ã°Å¸â€™Â° Client wholesale status detected:', isClientWholesale);
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
        console.log('Ã°Å¸â€â€ž Loading repair form data...');
        
        // For wholesalers, load their clients and item catalogs
        if (isWholesale) {
          console.log('Ã°Å¸â€˜Â¤ Wholesale mode: Loading wholesaler clients and item catalogs...');
          const [users, tasks, materials] = await Promise.all([
            wholesaleClientsAPIClient.fetchMyClients(),
            tasksService.getTasks(),
            materialsService.getMaterials()
          ]);
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
          console.log('Ã¢Å“â€¦ Wholesale clients and item catalogs loaded');
        } else {
          console.log('Ã°Å¸â€Â§ Admin mode: Loading all data...');
          const [tasks, materials, users, wholesalers] = await Promise.all([
            tasksService.getTasks(),
            materialsService.getMaterials(),
            UsersService.getAllUsers(),
            fetch('/api/users?role=wholesaler').then((res) => res.ok ? res.json() : { data: [] }),
            // Temporarily disable rush jobs API call due to MongoDB import issues
            // fetch('/api/rush-jobs?action=canCreate').then(res => res.json())
          ]);
          
          console.log('Ã°Å¸â€œâ€¹ Tasks loaded:', tasks);
          console.log('Ã°Å¸â€œÂ¦ Materials loaded:', materials);
          console.log('Ã°Å¸â€˜Â¥ Users loaded:', users);
          
          setAvailableTasks(tasks.data || tasks || []);
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
          console.log('Ã¢Å“â€¦ Admin data loading completed');
        }
        
        // Rush job functionality (same for both modes)
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      } catch (error) {
        console.error('Ã¢ÂÅ’ Error loading data:', error);
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
        quantity: 1,
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
    const inferredTasks = inferTasksFromDescription(parsingText, availableTasks);
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
      console.log('Ã°Å¸â€™Â° Wholesale status changed from prop:', prevWholesaleProp.current, '->', isWholesale);
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
    console.log('Ã°Å¸Â§Â® CALCULATETOTALCOST START');
    const tasksCost = formData.tasks.reduce((sum, item) => 
      sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
    const materialsCost = formData.materials.reduce((sum, item) => 
      sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
    const customCost = formData.customLineItems.reduce((sum, item) => 
      sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);
    
    let subtotal = tasksCost + materialsCost + customCost;
    
    console.log('Ã°Å¸â€œÅ  CALCULATETOTALCOST - Individual Costs:', {
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
    if (formData.tasks.length > 0) {
      recalculateAllItemPrices(formData.isWholesale);
    }
  }, [formData.metalType, formData.karat, formData.goldColor]);

  useEffect(() => {
    if (formData.isWholesale && (formData.tasks.length > 0 || formData.materials.length > 0)) {
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
      let materialsCost = 0;
      let customCost = 0;
      
      // For admin users, calculate detailed pricing
      if (!formData.isWholesale) {
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
        console.log('Ã°Å¸â€˜Â¤ Wholesaler submission: Pricing to be determined by admin');
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
      console.log('Ã°Å¸â€Â PRICING BREAKDOWN DEBUG:');
      console.log('Ã°Å¸â€œÅ  Base Costs (individual prices already wholesale-adjusted):', { tasksCost, materialsCost, customCost, subtotal });
      console.log('Ã°Å¸â€™Â° Calculated Values:', { subtotal, rushFee, deliveryFee, taxAmount, totalCost });
      console.log('Ã¢Å¡â„¢Ã¯Â¸Â Settings:', { 
        isWholesale: formData.isWholesale,
        isRush: formData.isRush, 
        includeDelivery: formData.includeDelivery,
        includeTax: formData.includeTax,
        taxRate: adminSettings.taxRate,
        rushMultiplier: adminSettings.rushMultiplier 
      });
      
      const { processes, ...sanitizedFormData } = formData;
      const submissionData = {
        ...sanitizedFormData,
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
        
        createdAt: initialData?.createdAt || new Date().toISOString(),
        status: 'RECEIVING' // Use legacy status for compatibility
      };

      // Add comprehensive logging for submission
      console.log('Ã°Å¸â€œÂ¤ SUBMISSION DATA DEBUG:');
      console.log('Ã°Å¸â€Â¢ Pricing Fields in Submission:', {
        totalCost: submissionData.totalCost,
        subtotal: submissionData.subtotal,
        rushFee: submissionData.rushFee,
        deliveryFee: submissionData.deliveryFee,
        taxAmount: submissionData.taxAmount,
        taxRate: submissionData.taxRate
      });
      console.log('Ã°Å¸Å½â€ºÃ¯Â¸Â Flags in Submission:', {
        isWholesale: submissionData.isWholesale,
        includeDelivery: submissionData.includeDelivery,
        includeTax: submissionData.includeTax,
        isRush: submissionData.isRush
      });
      console.log('Ã°Å¸â€œâ€¹ Full Submission Object:', submissionData);

      const result = submitMode === 'edit' && repairID
        ? await RepairsService.updateRepair(repairID, submissionData)
        : await RepairsService.createRepair(submissionData);
      
      if (submitMode !== 'edit') {
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
      console.log('Ã°Å¸â€â€ž Creating new client:', newClientData);
      
      const clientToCreate = {
        firstName: newClientData.firstName.trim(),
        lastName: newClientData.lastName.trim(),
        email: newClientData.email.trim(),
        phoneNumber: newClientData.phone.trim() || ''
      };

      console.log('Ã°Å¸â€œÂ¤ Sending client creation request:', clientToCreate);

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
      
      console.log('Ã¢Å“â€¦ Created client response:', createdClientResponse);
      console.log('Ã¢Å“â€¦ Created client data:', createdClient);
      
      // Check if client is wholesale
      const isWholesaleClient = !!formData.isWholesale;
      console.log('Ã°Å¸â€™Â° New client wholesale status:', isWholesaleClient);
      
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

      console.log('Ã°Å¸Å½â€° New client created and selected successfully');
      
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error creating new client:', error);
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
      px: 0,
      pb: { xs: 10, sm: 2 }
    }}>
      {errors.submit && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: UI.bgPanel, border: '1px solid', borderColor: UI.border, color: UI.textPrimary }}>
          {errors.submit}
        </Alert>
      )}

      <Stack spacing={{ xs: 1.5, sm: 3 }}>

        {/* Client Information */}
        <FormSection title="Client Information">
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
                    MenuProps={selectMenuProps}
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
                            console.log('Ã°Å¸â€œâ€¹ Wholesale clients fetched for store:', nextStoreId, res);
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
                          <Typography variant="body2" sx={{ color: UI.textPrimary }}>{store.name}</Typography>
                          {store.isWholesale && (
                              <Chip label="Wholesale" size="small" variant="outlined" sx={neutralChipSx} />
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
                    disablePortal
                    freeSolo
                    size="small"
                    options={Array.isArray(availableUsers) ? availableUsers : []}
                    slotProps={autocompleteSlotProps}
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
                      console.log('Ã°Å¸Å½Â¯ Autocomplete change:', newValue);
                      if (newValue && typeof newValue === 'object') {
                        const clientName = newValue.name || `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim() || newValue.email || '';
                        const userID = newValue._id || newValue.id || newValue.userID || newValue.clientID || '';
                        const isClientWholesale = !!formData.isWholesale;
                        
                        console.log('Ã°Å¸â€˜Â¤ Selected client:', { clientName, userID, role: newValue.role, isWholesale: isClientWholesale });
                        
                        setFormData(prev => ({ 
                          ...prev, 
                          clientName,
                          userID
                        }));

                        console.log('Ã°Å¸â€™Â° Pricing mode from selected store:', isClientWholesale);
                      } else if (typeof newValue === 'string') {
                        console.log('Ã°Å¸â€œÂ String value entered:', newValue);
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
                            <Typography variant="body2" sx={{ color: UI.textPrimary }}>
                              {option.name || `${option.firstName || ''} ${option.lastName || ''}`.trim()}
                            </Typography>
                            {option.role === 'wholesaler' && (
                              <Chip 
                                label="Wholesale" 
                                size="small" 
                                variant="outlined"
                                sx={neutralChipSx}
                              />
                            )}
                          </Stack>
                          {option.email && (
                            <Typography variant="caption" sx={{ color: UI.textSecondary }}>
                              Email: {option.email}
                            </Typography>
                          )}
                          {(option.phone || option.phoneNumber) && (
                            <Typography variant="caption" sx={{ color: UI.textSecondary }}>
                              Phone: {option.phone || option.phoneNumber}
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
                          sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
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
                      sx={{ color: UI.accent }}
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
                        label={`x${adminSettings.rushMultiplier}`}
                        size="small"
                        variant="filled"
                        sx={neutralChipSx}
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
                      <Chip label="Wholesale" size="small" variant="filled" sx={neutralChipSx} />
                    ) : (
                      <Chip label="Retail" size="small" variant="outlined" sx={neutralChipSx} />
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: UI.accent }}>
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
                        size="small"
                        variant="filled"
                        sx={neutralChipSx}
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
                          size="small"
                          variant="filled"
                          sx={neutralChipSx}
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
        </FormSection>

        {/* Wholesaler Information */}
        {isWholesale && (
          <Alert
            severity="info"
            sx={{
              mx: { xs: 2, sm: 0 },
              backgroundColor: UI.bgPanel,
              border: '1px solid',
              borderColor: UI.border,
              color: UI.textPrimary,
              boxShadow: UI.shadow,
              '& .MuiAlert-icon': {
                color: UI.accent
              }
            }}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ color: UI.textPrimary, fontWeight: 600 }}>
              Wholesaler Repair Submission
            </Typography>
            <Typography variant="body2">
              As a wholesaler, you can record your client&apos;s information and special instructions in the notes section below.
              Our admin team will review your submission and provide pricing details.
            </Typography>
          </Alert>
        )}

        {/* Image Capture */}
        <FormSection
          title="Item Photo"
          subtitle="Take a photo with your camera or upload from file"
        >
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
                    src={picturePreviewUrl}
                    alt="Captured item"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain', border: `1px solid ${UI.border}`, background: UI.bgCard }}
                  />
                </Box>
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                  <Chip
                    label={typeof formData.picture === 'string' ? 'Existing photo' : (formData.picture.name || 'Captured photo')}
                    onDelete={() => setFormData(prev => ({ ...prev, picture: null }))}
                    deleteIcon={<DeleteIcon />}
                    sx={{ ...neutralChipSx, maxWidth: 250 }}
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
              sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
            >
              Regenerate Description with Gemini
            </LoadingButton>
            {imageDescriptionError && (
              <Alert severity="error" sx={{ width: '100%', textAlign: 'left', backgroundColor: UI.bgCard, border: '1px solid', borderColor: UI.border }}>
                {imageDescriptionError}
              </Alert>
            )}
            {!formData.picture && (
              <Typography variant="body2" color="text.secondary">
                No photo selected
              </Typography>
            )}
          </Stack>
        </FormSection>

        {/* Item Details */}
        <FormSection title="Item Details">
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
                    sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
                  >
                    Analyze Smart Intake
                  </LoadingButton>
                  <Typography variant="caption" color="text.secondary">
                    Enter submits analysis. Shift+Enter adds a new line.
                  </Typography>
                </Stack>
                {smartIntakeError ? (
                  <Alert severity="warning" sx={{ mt: 1.5, backgroundColor: UI.bgCard, border: '1px solid', borderColor: UI.border }}>
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
                    MenuProps={selectMenuProps}
                    value={formData.metalType}
                    label="Metal Type"
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metalType: e.target.value,
                      goldColor: '',
                      karat: ''
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
                      MenuProps={selectMenuProps}
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
                      MenuProps={selectMenuProps}
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

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRing}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        isRing: e.target.checked,
                        currentRingSize: e.target.checked ? prev.currentRingSize : '',
                        desiredRingSize: e.target.checked ? prev.desiredRingSize : ''
                      }))}
                    />
                  }
                  label="This item is a ring (enable sizing fields)"
                />
              </Grid>

              {formData.isRing && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="overline" sx={sectionLabelSx}>
                      Ring Sizing
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Autocomplete
                      disablePortal
                      slotProps={autocompleteSlotProps}
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
                      disablePortal
                      slotProps={autocompleteSlotProps}
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
        </FormSection>

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
          viewerIsWholesaler={isWholesale}
        />
      </Stack>

      {/* New Client Dialog */}
      <Dialog
        open={showNewClientDialog}
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: UI.bgPanel,
            border: '1px solid',
            borderColor: UI.border,
            boxShadow: UI.shadow,
            color: UI.textPrimary
          }
        }}
      >
        <DialogTitle sx={{ color: UI.textPrimary, borderBottom: '1px solid', borderColor: UI.border }}>
          Add New Client
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
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
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid', borderColor: UI.border }}>
          <Button 
            onClick={() => setShowNewClientDialog(false)}
            disabled={newClientLoading}
            sx={{ color: UI.textSecondary }}
          >
            Cancel
          </Button>
          <LoadingButton 
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="outlined"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.phone.trim()}
            sx={{ borderColor: UI.border, color: UI.textPrimary, backgroundColor: UI.bgCard }}
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
        bgcolor: { xs: UI.bgPanel, sm: 'transparent' },
        borderTop: { xs: '1px solid', sm: 'none' },
        borderColor: UI.border,
        boxShadow: { xs: UI.shadow, sm: 'none' },
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Button 
          variant="outlined" 
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
            borderColor: UI.border,
            color: UI.textPrimary,
            backgroundColor: UI.bgCard,
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
    <FormSection title="Work Items" subtitle="Tasks, materials, and custom charges for this repair">
      <Typography variant="overline" sx={sectionLabelSx}>
        Tasks {formData.tasks.length > 0 && `(${formData.tasks.length})`}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          disablePortal
          slotProps={autocompleteSlotProps}
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

      <Typography
        variant="overline"
        sx={{
          ...sectionLabelSx,
          borderTop: '1px solid',
          borderColor: UI.border,
          pt: 2.5
        }}
      >
        Materials {formData.materials.length > 0 && `(${formData.materials.length})`}
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Autocomplete
          disablePortal
          slotProps={autocompleteSlotProps}
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

        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: UI.border,
            borderRadius: 2,
            backgroundColor: UI.bgPanel,
            boxShadow: UI.shadow
          }}
        >
          <Typography variant="caption" sx={{ color: UI.textSecondary, fontWeight: 600, display: 'block', mb: 1 }}>
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
              variant="outlined"
              size="small"
              sx={{
                minWidth: 80,
                flexShrink: 0,
                borderColor: UI.border,
                color: UI.textPrimary,
                backgroundColor: UI.bgCard
              }}
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: UI.border, pt: 2.5, mb: 1.5 }}>
        <Typography variant="overline" sx={sectionLabelSx}>
          Custom Items {formData.customLineItems.length > 0 && `(${formData.customLineItems.length})`}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={addCustomLineItem}
          variant="outlined"
          size="small"
          sx={{ borderColor: UI.border, color: UI.textPrimary }}
        >
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
    </FormSection>
  );
}

// Task/Process/Material item component
function TaskItem({ item, onQuantityChange, onPriceChange, onRemove, showPriceInput = true }) {
  const unitPrice = toNumber(item.price);
  const lineTotal = unitPrice * (item.quantity || 1);

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: UI.border,
        borderRadius: 2,
        backgroundColor: UI.bgCard,
        boxShadow: UI.shadow
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle2" noWrap sx={{ color: UI.textPrimary, fontWeight: 600 }}>
                {item.title || item.displayName || item.name}
              </Typography>
              {item.isStullerItem && (
                <Chip label="Stuller" size="small" variant="outlined" sx={neutralChipSx} />
              )}
            </Stack>
            {item.description && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {item.description}
              </Typography>
            )}
            {item.isStullerItem && item.stullerData && (
              <Typography variant="caption" sx={{ color: UI.accent }} display="block">
                SKU: {item.stullerData.itemNumber} | Base: ${item.stullerData.originalPrice} | Markup: {((item.stullerData.markup - 1) * 100).toFixed(0)}%
              </Typography>
            )}
          </Box>
          <IconButton onClick={onRemove} size="small" sx={{ color: UI.textSecondary }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="number"
            label="Qty"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 1)}
            size="small"
            sx={{ width: 70 }}
            inputProps={{ min: 1 }}
          />
          {showPriceInput ? (
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
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
                ${lineTotal.toFixed(2)}
              </Typography>
            </>
          ) : (
            <>
              <Box sx={{ minWidth: 88 }}>
                <Typography variant="caption" sx={{ color: UI.textMuted, display: 'block', lineHeight: 1.2 }}>
                  Price
                </Typography>
                <Typography variant="body2" sx={{ color: UI.textPrimary, fontWeight: 600 }}>
                  ${unitPrice.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
                ${lineTotal.toFixed(2)}
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
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: UI.border,
        borderRadius: 2,
        backgroundColor: UI.bgCard,
        boxShadow: UI.shadow
      }}
    >
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
          <IconButton onClick={onRemove} size="small" sx={{ color: UI.textSecondary }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="number"
            label="Qty"
            value={item.quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || 1)}
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
          <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700, whiteSpace: 'nowrap', color: UI.textHeader }}>
            ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// Total cost card with rush job information
function TotalCostCard({ formData, calculateTotalCost, adminSettings, viewerIsWholesaler = false }) {
  const [totalCost, setTotalCost] = React.useState(0);
  const [costBreakdown, setCostBreakdown] = React.useState({
    subtotal: 0,
    retailSubtotal: 0,
    laborHours: 0,
    laborCost: 0,
    averageLaborRate: 0,
    materialsBaseCost: 0,
    wholesalerMarkupAmount: 0,
    wholesalerMarkupPercent: 0,
    retailerMarkupAmount: 0,
    customCost: 0,
    wholesaleDiscount: 0,
    rushFee: 0,
    deliveryFee: 0,
    taxAmount: 0,
    suggestedRetailModifiers: 0,
    final: 0,
    retailFinal: 0
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const updateTotal = async () => {
      setLoading(true);
      try {
        const taskLaborHours = formData.tasks.reduce((sum, item) =>
          sum + (toNumber(item.laborHours ?? item.pricing?.totalLaborHours ?? item.pricing?.baseLaborHours) * (item.quantity || 1)), 0);
        const totalLaborHours = taskLaborHours;

        const taskLaborCost = formData.tasks.reduce((sum, item) =>
          sum + (toNumber(item.pricing?.laborCost ?? item.pricing?.weightedLaborCost) * (item.quantity || 1)), 0);
        const totalLaborCost = taskLaborCost;

        const taskMaterialsBaseCost = formData.tasks.reduce((sum, item) => {
          const pricing = item.pricing || {};
          const derivedBaseMaterials = Math.max(
            toNumber(pricing.baseCost) - toNumber(pricing.laborCost) - toNumber(pricing.toolDepreciationCost),
            0
          );
          const rawTaskMaterials = toNumber(
            pricing.baseMaterialsCost ??
            pricing.weightedBaseMaterialsCost ??
            pricing.totalProcessMaterialCost ??
            pricing.baseMaterialCost ??
            derivedBaseMaterials
          );

          return sum + (rawTaskMaterials * (item.quantity || 1));
        }, 0);
        const materialLineBaseCost = formData.materials.reduce((sum, item) =>
          sum + (resolveMaterialRawPortionBaseCost(item, formData.metalType, formData.karat, formData.goldColor) * (item.quantity || 1)), 0);
        const materialsBaseCost = taskMaterialsBaseCost + materialLineBaseCost;

        const tasksCost = formData.tasks.reduce((sum, item) =>
          sum + (parseFloat(item.price ?? resolveTaskBasePrice(item, formData.metalType, formData.karat, formData.goldColor)) * (item.quantity || 1)), 0);
        const materialsCost = formData.materials.reduce((sum, item) =>
          sum + (parseFloat(item.price || item.unitCost || item.costPerPortion || 0) * (item.quantity || 1)), 0);
        const customCost = formData.customLineItems.reduce((sum, item) =>
          sum + (parseFloat(item.price || 0) * (item.quantity || 1)), 0);

        const originalSubtotal = tasksCost + materialsCost + customCost;
        const retailSubtotal = [
          ...formData.tasks.map(t => toNumber(t.retailPrice ?? t.price) * (t.quantity || 1)),
          ...formData.materials.map(m => toNumber(m.retailPrice ?? m.price) * (m.quantity || 1)),
          ...formData.customLineItems.map(c => toNumber(c.price) * (c.quantity || 1))
        ].reduce((sum, v) => sum + v, 0);

        let currentTotal = originalSubtotal;
        let wholesaleDiscount = 0;
        let wholesalerMarkupAmount = 0;
        let wholesalerMarkupPercent = 0;
        let retailerMarkupAmount = 0;
        let rushFee = 0;
        let deliveryFee = 0;
        let taxAmount = 0;
        let suggestedRetailModifiers = 0;

        if (formData.isWholesale) {
          const costOfGoods = totalLaborCost + materialsBaseCost + customCost;
          wholesaleDiscount = Math.max(Math.round((retailSubtotal - originalSubtotal) * 100) / 100, 0);
          wholesalerMarkupAmount = Math.max(
            Math.round((originalSubtotal - costOfGoods) * 100) / 100,
            0
          );
          wholesalerMarkupPercent = costOfGoods > 0
            ? Math.round((wholesalerMarkupAmount / costOfGoods) * 1000) / 10
            : 0;
          retailerMarkupAmount = Math.max(
            Math.round((retailSubtotal - originalSubtotal) * 100) / 100,
            0
          );
        }

        let retailCurrentTotal = retailSubtotal;
        if (formData.isRush) {
          retailCurrentTotal *= adminSettings.rushMultiplier;
        }
        if (formData.includeDelivery) {
          retailCurrentTotal += adminSettings.deliveryFee;
        }
        if (formData.includeTax) {
          retailCurrentTotal += retailCurrentTotal * adminSettings.taxRate;
        }
        suggestedRetailModifiers = Math.max(Math.round((retailCurrentTotal - retailSubtotal) * 100) / 100, 0);

        if (formData.isRush) {
          const beforeRush = currentTotal;
          currentTotal *= adminSettings.rushMultiplier;
          rushFee = currentTotal - beforeRush;
        }

        if (formData.includeDelivery) {
          deliveryFee = adminSettings.deliveryFee;
          currentTotal += deliveryFee;
        }

        if (formData.includeTax && !formData.isWholesale) {
          taxAmount = currentTotal * adminSettings.taxRate;
          currentTotal += taxAmount;
        }

        setCostBreakdown({
          subtotal: originalSubtotal,
          retailSubtotal,
          laborHours: totalLaborHours,
          laborCost: totalLaborCost,
          averageLaborRate: totalLaborHours > 0 ? (totalLaborCost / totalLaborHours) : 0,
          materialsBaseCost,
          wholesalerMarkupAmount,
          wholesalerMarkupPercent,
          retailerMarkupAmount,
          customCost,
          wholesaleDiscount,
          rushFee,
          deliveryFee,
          taxAmount,
          suggestedRetailModifiers,
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
  }, [formData.tasks, formData.materials, formData.customLineItems, formData.isWholesale, formData.isRush, formData.includeDelivery, formData.includeTax, calculateTotalCost, adminSettings]);

  return (
    <FormSection title={formData.isWholesale ? 'Pricing Summary' : 'Total Cost'} subtitle="Review the final pricing before saving the repair">
      <Stack spacing={2}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: UI.textHeader,
              mt: 0.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}
          >
            {loading ? (
              <Box component="span" sx={{ color: UI.textSecondary, fontSize: '0.7em' }}>Calculating...</Box>
            ) : (
              `$${totalCost.toFixed(2)}`
            )}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
            {formData.isWholesale && (
              <Chip label="Wholesale Pricing" variant="outlined" size="small" sx={neutralChipSx} />
            )}
            {formData.isRush && (
              <Chip label={`Rush (${adminSettings.rushMultiplier}x)`} variant="outlined" size="small" sx={neutralChipSx} />
            )}
            {formData.includeDelivery && (
              <Chip label={`Delivery (+$${adminSettings.deliveryFee.toFixed(2)})`} variant="outlined" size="small" sx={neutralChipSx} />
            )}
            {formData.includeTax && !formData.isWholesale && (
              <Chip label={`Tax (+${(adminSettings.taxRate * 100).toFixed(2)}%)`} variant="outlined" size="small" sx={neutralChipSx} />
            )}
          </Stack>
        </Box>

        {!loading && formData.isWholesale && costBreakdown.retailSubtotal > 0 && (
          <Box sx={{ p: 2, backgroundColor: UI.bgCard, borderRadius: 2, border: '1px solid', borderColor: UI.border }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: UI.textPrimary }}>
              Wholesaler Pricing
            </Typography>
            <Stack spacing={0.75}>
              {/* What EFD invoices the wholesaler */}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">{viewerIsWholesaler ? 'What you pay:' : 'What they pay you:'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: UI.textPrimary }}>
                  ${costBreakdown.final.toFixed(2)}
                </Typography>
              </Stack>
              <Divider sx={{ borderColor: UI.border, my: 0.25 }} />
              {/* Suggested retail breakdown for the wholesaler's reference */}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Suggested retail (pre-tax):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: UI.accent }}>
                  ${costBreakdown.retailSubtotal.toFixed(2)}
                </Typography>
              </Stack>
              {costBreakdown.suggestedRetailModifiers > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {formData.includeTax && !formData.isRush && !formData.includeDelivery && adminSettings?.taxRate > 0
                      ? `+ Tax (${Math.round(adminSettings.taxRate * 1000) / 10}%):`
                      : '+ Tax & fees:'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: UI.accent }}>
                    +${costBreakdown.suggestedRetailModifiers.toFixed(2)}
                  </Typography>
                </Stack>
              )}
              {costBreakdown.retailFinal > costBreakdown.retailSubtotal && (
                <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: UI.textPrimary }}>Suggested total to customer:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: UI.accent }}>
                    ${costBreakdown.retailFinal.toFixed(2)}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        {!loading && formData.isWholesale && costBreakdown.subtotal > 0 && (
          <Box sx={{ p: 2, backgroundColor: UI.bgCard, borderRadius: 2, border: '1px solid', borderColor: UI.border }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: UI.textPrimary }}>
              Wholesale Breakdown
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="body2" color="text.secondary">
                  Labor
                  {costBreakdown.laborHours > 0 && (
                    <Box component="span" sx={{ display: 'block', color: UI.textMuted, fontSize: '0.85em', mt: 0.25 }}>
                      {costBreakdown.laborHours.toFixed(2)} hrs @ ${costBreakdown.averageLaborRate.toFixed(2)}/hr
                    </Box>
                  )}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                  ${costBreakdown.laborCost.toFixed(2)}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Material Cost
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                  ${costBreakdown.materialsBaseCost.toFixed(2)}
                </Typography>
              </Stack>

              {costBreakdown.customCost > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Additional Custom Charges
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                    ${costBreakdown.customCost.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                <Typography variant="body2">
                  Wholesaler Markup {costBreakdown.wholesalerMarkupPercent > 0 ? `(${costBreakdown.wholesalerMarkupPercent.toFixed(1)}% on COG)` : ''}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  +${costBreakdown.wholesalerMarkupAmount.toFixed(2)}
                </Typography>
              </Stack>

              <Divider sx={{ my: 0.5, borderColor: UI.border }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontWeight: 600, color: UI.textPrimary }}>
                  Wholesale Subtotal
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: UI.textHeader }}>
                  ${costBreakdown.subtotal.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {!loading && costBreakdown.subtotal > 0 && (
          <Box sx={{ p: 2, backgroundColor: UI.bgCard, borderRadius: 2, border: '1px solid', borderColor: UI.border }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: UI.textPrimary }}>
              Cost Breakdown
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  {formData.isWholesale ? 'Services & Materials (Wholesale):' : 'Services & Materials:'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: UI.textPrimary }}>
                  ${costBreakdown.subtotal.toFixed(2)}
                </Typography>
              </Stack>

              {formData.isWholesale && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Services & Materials (Retail):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${costBreakdown.retailSubtotal.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.isWholesale && costBreakdown.wholesaleDiscount > 0 && (
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ color: UI.accent }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2">Wholesale Discount ({adminSettings.pricing?.wholesaleMarkup ? `${((adminSettings.pricing.wholesaleMarkup - 1) * 100).toFixed(0)}% over base` : 'configured rate'}):</Typography>
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Wholesale Pricing</Typography>
                          <Typography variant="caption" display="block">Wholesale total reflects the direct charge to your account.</Typography>
                          <Typography variant="caption" display="block">Suggested retail reflects your saved account markup and tax settings.</Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: UI.textMuted }}>Set one markup and tax rate from Account Settings.</Typography>
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
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Rush Job Fee ({adminSettings.rushMultiplier}x):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    +${costBreakdown.rushFee.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.includeDelivery && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Delivery Fee:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    +${costBreakdown.deliveryFee.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.includeTax && !formData.isWholesale && costBreakdown.taxAmount > 0 && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.accent }}>
                  <Typography variant="body2">Tax ({(adminSettings.taxRate * 100).toFixed(2)}%):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    +${costBreakdown.taxAmount.toFixed(2)}
                  </Typography>
                </Stack>
              )}

              {formData.isWholesale && (
                <Stack direction="row" justifyContent="space-between" sx={{ color: UI.textSecondary }}>
                  <Typography variant="body2">Tax (Wholesale Exempt):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    $0.00
                  </Typography>
                </Stack>
              )}

              <Divider sx={{ my: 1, borderColor: UI.border }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body1" sx={{ fontWeight: 600, color: UI.textPrimary }}>
                  Final Total:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: UI.textHeader, fontSize: '1.1em' }}>
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
    </FormSection>
  );
}
