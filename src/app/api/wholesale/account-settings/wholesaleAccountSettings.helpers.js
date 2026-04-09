import { ObjectId } from 'mongodb';

export const DEFAULT_WHOLESALER_PRICING_SETTINGS = {
  retailMarkupMultiplier: 1,
  taxRate: 0
};

const MARKUP_LIMITS = {
  min: 0.5,
  max: 5
};

const TAX_RATE_LIMITS = {
  min: 0,
  max: 0.25
};

const MAX_LOGO_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const BUSINESS_PROFILE_FIELDS = [
  'businessName',
  'businessAddress',
  'businessCity',
  'businessState',
  'businessZip',
  'businessCountry',
  'contactFirstName',
  'contactLastName',
  'contactTitle',
  'contactEmail',
  'contactPhone'
];

export function toNumber(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampMarkup(value) {
  return Math.min(Math.max(value, MARKUP_LIMITS.min), MARKUP_LIMITS.max);
}

function normalizeTaxRate(value) {
  const parsed = toNumber(value, DEFAULT_WHOLESALER_PRICING_SETTINGS.taxRate);
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.min(Math.max(normalized, TAX_RATE_LIMITS.min), TAX_RATE_LIMITS.max);
}

function sanitizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function getLegacyMarkup(markups = {}) {
  const candidates = [markups.tasks, markups.processes, markups.materials]
    .map((value) => toNumber(value, 0))
    .filter((value) => value > 0);

  return candidates[0] || DEFAULT_WHOLESALER_PRICING_SETTINGS.retailMarkupMultiplier;
}

export function normalizeWholesalerPricingSettings(pricingSettings = {}, legacyRetailMarkups = {}) {
  const legacyMarkup = getLegacyMarkup(legacyRetailMarkups);
  const retailMarkupMultiplier = clampMarkup(
    toNumber(
      pricingSettings.retailMarkupMultiplier ?? pricingSettings.markupMultiplier ?? pricingSettings.retailMarkup,
      legacyMarkup
    )
  );

  const taxRate = normalizeTaxRate(
    pricingSettings.taxRate ?? pricingSettings.retailTaxRate ?? DEFAULT_WHOLESALER_PRICING_SETTINGS.taxRate
  );

  return {
    retailMarkupMultiplier,
    taxRate
  };
}

export function buildUserLookupQuery(sessionUser = {}) {
  const ids = [sessionUser.userID, sessionUser.id, sessionUser._id]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  const orConditions = [];

  if (sessionUser.email) {
    orConditions.push({ email: sessionUser.email });
  }

  for (const id of ids) {
    orConditions.push({ userID: id });

    if (ObjectId.isValid(id)) {
      orConditions.push({ _id: new ObjectId(id) });
    }
  }

  return orConditions.length > 0 ? { $or: orConditions } : null;
}

function getOwnerName(user = {}, fallbackName = 'Wholesale Account') {
  const first = sanitizeText(user.firstName);
  const last = sanitizeText(user.lastName);
  const fullName = `${first} ${last}`.trim();

  return fullName || user.business || user.name || fallbackName;
}

function normalizeBusinessProfile(user = {}, sessionUser = {}) {
  const application = user.wholesaleApplication || {};

  return {
    businessName: sanitizeText(application.businessName, user.business || ''),
    businessAddress: sanitizeText(application.businessAddress),
    businessCity: sanitizeText(application.businessCity),
    businessState: sanitizeText(application.businessState),
    businessZip: sanitizeText(application.businessZip),
    businessCountry: sanitizeText(application.businessCountry || 'United States'),
    contactFirstName: sanitizeText(application.contactFirstName, user.firstName || ''),
    contactLastName: sanitizeText(application.contactLastName, user.lastName || ''),
    contactTitle: sanitizeText(application.contactTitle),
    contactEmail: sanitizeText(application.contactEmail, user.email || sessionUser.email || ''),
    contactPhone: sanitizeText(application.contactPhone, user.phoneNumber || '')
  };
}

export function serializeSettings(user = {}, sessionUser = {}) {
  const storedSettings = user.wholesalerPricingSettings || {};
  const wholesalerPricingSettings = normalizeWholesalerPricingSettings(
    storedSettings,
    storedSettings.retailMarkups || {}
  );

  return {
    ownerName: getOwnerName(user, sessionUser?.name),
    wholesalerPricingSettings,
    retailMarkupMultiplier: wholesalerPricingSettings.retailMarkupMultiplier,
    taxRate: wholesalerPricingSettings.taxRate,
    retailMarkups: {
      tasks: wholesalerPricingSettings.retailMarkupMultiplier,
      processes: wholesalerPricingSettings.retailMarkupMultiplier,
      materials: wholesalerPricingSettings.retailMarkupMultiplier
    },
    businessProfile: normalizeBusinessProfile(user, sessionUser),
    ticketLogoUrl: storedSettings.ticketLogoUrl || null,
    updatedAt: storedSettings.updatedAt || null
  };
}

export async function parseSettingsPayload(request) {
  const contentType = String(request.headers.get('content-type') || '');

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const rawRetailMarkups = formData.get('retailMarkups');
    const rawWholesalerPricingSettings = formData.get('wholesalerPricingSettings');
    const rawBusinessProfile = formData.get('businessProfile');
    let retailMarkups = {};
    let wholesalerPricingSettings = {};
    let businessProfile = {};

    if (typeof rawRetailMarkups === 'string' && rawRetailMarkups.trim()) {
      try {
        retailMarkups = JSON.parse(rawRetailMarkups);
      } catch {
        retailMarkups = {};
      }
    }

    if (typeof rawWholesalerPricingSettings === 'string' && rawWholesalerPricingSettings.trim()) {
      try {
        wholesalerPricingSettings = JSON.parse(rawWholesalerPricingSettings);
      } catch {
        wholesalerPricingSettings = {};
      }
    }

    if (typeof rawBusinessProfile === 'string' && rawBusinessProfile.trim()) {
      try {
        businessProfile = JSON.parse(rawBusinessProfile);
      } catch {
        businessProfile = {};
      }
    }

    const removeTicketLogo = String(formData.get('removeTicketLogo') || '').toLowerCase() === 'true';
    const ticketLogoFile = formData.get('ticketLogoFile');

    return {
      wholesalerPricingSettings,
      retailMarkups,
      businessProfile,
      removeTicketLogo,
      ticketLogoFile: ticketLogoFile instanceof File ? ticketLogoFile : null
    };
  }

  const payload = await request.json().catch(() => ({}));

  return {
    wholesalerPricingSettings: payload?.wholesalerPricingSettings || {},
    retailMarkups: payload?.retailMarkups || {},
    businessProfile: payload?.businessProfile || {},
    removeTicketLogo: Boolean(payload?.removeTicketLogo),
    ticketLogoFile: null
  };
}

export function validateLogoFile(file) {
  if (!file) {
    return;
  }

  if (!ALLOWED_LOGO_MIME_TYPES.has(file.type)) {
    throw new Error('Logo file must be a PNG, JPG, or WEBP image');
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    throw new Error('Logo file must be 3MB or smaller');
  }
}

export function buildBusinessProfileUpdateFields(businessProfile = {}) {
  const updateFields = {};

  for (const field of BUSINESS_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(businessProfile, field)) {
      updateFields[`wholesaleApplication.${field}`] = sanitizeText(businessProfile[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(businessProfile, 'businessName')) {
    updateFields.business = sanitizeText(businessProfile.businessName);
  }

  if (Object.prototype.hasOwnProperty.call(businessProfile, 'contactPhone')) {
    updateFields.phoneNumber = sanitizeText(businessProfile.contactPhone);
  }

  return updateFields;
}
