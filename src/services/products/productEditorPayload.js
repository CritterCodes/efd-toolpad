const ADMIN_STATUSES = new Set(['draft', 'approved', 'archived']);
const NESTED_FIELDS = ['gemstone', 'jewelry', 'pricing', 'seo', 'inventory', 'fulfillment', 'references'];
const SCALAR_FIELDS = [
  'title', 'description', 'sku', 'productType', 'channels', 'collections',
  'vendor', 'tags', 'related', 'price', 'availability',
];

const numberOrNull = (value) => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const list = (value) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
};

const text = (value) => {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') {
    const dimensions = [value.length, value.width, value.height].filter((item) => item != null && item !== '');
    return dimensions.length ? dimensions.join(' x ') : '';
  }
  return value ?? '';
};

const dimensions = (value) => {
  const raw = String(value || '').trim();
  const parts = raw.split(/\s*(?:x|\u00d7)\s*/i).map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return { length: parts[0], width: parts[1], height: parts[2] };
  }
  return raw;
};

export const EMPTY_EDITOR_FORM = Object.freeze({
  title: '', description: '', sku: '', productType: 'gemstone',
  species: '', variety: '', cut: '', dimensions: '', carat: '', color: '', clarity: '', origin: '', treatment: '', certNumber: '', certFile: '',
  jewelryCategory: '', size: '', metalType: '', karat: '', metalWeight: '', linkedGemstones: '', findings: '', hallmark: '',
  costBasis: '', laborHours: '', laborRate: '', markupPct: '', salePrice: '', compareAtPrice: '',
  handle: '', metaTitle: '', metaDescription: '', tags: '',
  status: 'draft', channels: [], artisan: '', collections: [], vendor: '',
  onHandQty: '', location: '', continueSelling: false,
  weight: '', shippingClass: '', related: [], updatedAt: '', createdAt: '',
});

export function productToEditorForm(product = {}) {
  const gem = product.gemstone || {};
  const jewelry = product.jewelry || {};
  const pricing = product.pricing || {};
  const seo = product.seo || {};
  const inventory = product.inventory || {};
  const fulfillment = product.fulfillment || {};
  const metal = Array.isArray(jewelry.metals) ? jewelry.metals[0] || {} : {};
  const referencedGemstones = product.references?.gemstoneIds;
  const gemstoneIds = Array.isArray(referencedGemstones) && referencedGemstones.length > 0
    ? referencedGemstones
    : product.references?.gemstoneId
      ? [product.references.gemstoneId]
      : jewelry.linkedGemstones || [];
  const certification = gem.certification || {};

  return {
    ...EMPTY_EDITOR_FORM,
    title: product.title || '',
    description: product.description || '',
    sku: product.sku || inventory.sku || '',
    productType: product.productType || 'gemstone',
    species: gem.species || product.species || '',
    variety: gem.variety || gem.subspecies || product.variety || '',
    cut: text(gem.cut || product.cut),
    dimensions: text(gem.dimensions || product.dimensions),
    carat: gem.carat ?? product.carat ?? '',
    color: text(gem.color || product.color),
    clarity: gem.clarity || product.clarity || '',
    origin: gem.origin || product.origin || '',
    treatment: text(gem.treatment || product.treatment),
    certNumber: certification.number || gem.certNumber || product.certNumber || '',
    certFile: certification.url || gem.certFile || product.certFile || '',
    jewelryCategory: jewelry.type || jewelry.jewelryCategory || product.jewelryCategory || '',
    size: jewelry.size || product.size || '',
    metalType: metal.type || jewelry.metalType || product.metalType || '',
    karat: metal.purity || jewelry.karat || product.karat || '',
    metalWeight: metal.weight ?? jewelry.metalWeight ?? product.metalWeight ?? '',
    linkedGemstones: text(gemstoneIds),
    findings: jewelry.findings || product.findings || '',
    hallmark: jewelry.hallmark || product.hallmark || '',
    costBasis: pricing.costBasis ?? product.costBasis ?? '',
    laborHours: pricing.laborHours ?? product.laborHours ?? '',
    laborRate: pricing.laborRate ?? product.laborRate ?? '',
    markupPct: pricing.markupPct ?? product.markupPct ?? '',
    salePrice: pricing.retailPrice ?? pricing.salePrice ?? product.salePrice ?? product.price ?? '',
    compareAtPrice: pricing.compareAtPrice ?? product.compareAtPrice ?? '',
    handle: seo.handle || product.handle || product.slug || '',
    metaTitle: seo.metaTitle || product.metaTitle || '',
    metaDescription: seo.metaDescription || product.metaDescription || '',
    tags: text(product.tags),
    status: product.status === 'active' ? 'published' : (product.status || 'draft'),
    channels: Array.isArray(product.channels) ? product.channels : [],
    artisan: product.artisanId || product.userId || product.artisan || '',
    collections: product.collections || product.collectionIds || [],
    vendor: product.vendor || '',
    onHandQty: inventory.quantity ?? inventory.onHandQty ?? product.onHandQty ?? '',
    location: inventory.location || product.location || '',
    continueSelling: inventory.continueSelling ?? product.continueSelling ?? false,
    weight: fulfillment.weight ?? product.weight ?? '',
    shippingClass: fulfillment.shippingClass || product.shippingClass || '',
    related: Array.isArray(product.related) ? product.related : [],
    updatedAt: product.updatedAt || '',
    createdAt: product.createdAt || '',
  };
}

export function editorFormToPayload(form = {}) {
  const retailPrice = numberOrNull(form.salePrice);
  const costBasis = numberOrNull(form.costBasis);
  const laborHours = numberOrNull(form.laborHours);
  const laborRate = numberOrNull(form.laborRate);
  const laborCost = (laborHours || 0) * (laborRate || 0);
  const gemstoneIds = list(form.linkedGemstones);
  const metals = form.metalType || form.karat || form.metalWeight !== ''
    ? [{ type: form.metalType || null, purity: form.karat || null, weight: numberOrNull(form.metalWeight) }]
    : [];

  return {
    title: String(form.title || '').trim(),
    description: String(form.description || ''),
    sku: String(form.sku || '').trim(),
    productType: ['gemstone', 'jewelry'].includes(form.productType) ? form.productType : null,
    status: form.status || 'draft',
    channels: Array.isArray(form.channels) ? form.channels : [],
    artisanId: String(form.artisan || '').trim() || null,
    collections: Array.isArray(form.collections) ? form.collections : [],
    vendor: String(form.vendor || ''),
    tags: list(form.tags),
    related: Array.isArray(form.related) ? form.related : [],
    price: retailPrice,
    gemstone: {
      species: String(form.species || ''), variety: String(form.variety || ''),
      cut: list(form.cut), dimensions: dimensions(form.dimensions), carat: numberOrNull(form.carat),
      color: list(form.color), clarity: String(form.clarity || ''), origin: String(form.origin || ''),
      treatment: list(form.treatment),
      certification: { number: String(form.certNumber || ''), url: String(form.certFile || '') },
    },
    jewelry: {
      type: String(form.jewelryCategory || ''), size: String(form.size || ''), metals,
      findings: String(form.findings || ''), hallmark: String(form.hallmark || ''),
    },
    pricing: {
      costBasis, laborHours, laborRate, laborCost,
      markupPct: numberOrNull(form.markupPct), retailPrice,
      compareAtPrice: numberOrNull(form.compareAtPrice),
      marginPct: retailPrice && retailPrice > 0 ? ((retailPrice - (costBasis || 0) - laborCost) / retailPrice) * 100 : null,
    },
    seo: {
      handle: String(form.handle || ''), metaTitle: String(form.metaTitle || ''),
      metaDescription: String(form.metaDescription || ''),
    },
    inventory: {
      sku: String(form.sku || '').trim(), quantity: numberOrNull(form.onHandQty),
      location: String(form.location || ''), continueSelling: Boolean(form.continueSelling),
    },
    fulfillment: { weight: numberOrNull(form.weight), shippingClass: String(form.shippingClass || '') },
    references: { gemstoneIds, gemstoneId: gemstoneIds[0] || null },
  };
}

export function mergeProductEditorUpdate(existing = {}, input = {}, { canAdminister = false } = {}) {
  const update = {};
  for (const field of SCALAR_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) update[field] = input[field];
  }
  for (const field of NESTED_FIELDS) {
    if (input[field] && typeof input[field] === 'object' && !Array.isArray(input[field])) {
      update[field] = { ...(existing[field] || {}), ...input[field] };
    }
  }
  if (input.gemstone?.certification && typeof input.gemstone.certification === 'object') {
    update.gemstone.certification = {
      ...(existing.gemstone?.certification || {}),
      ...input.gemstone.certification,
    };
  }
  if (Object.prototype.hasOwnProperty.call(input.inventory || {}, 'quantity')) {
    const quantity = numberOrNull(input.inventory.quantity);
    const reserved = Number(existing.inventory?.reserved) || 0;
    update.inventory.quantity = quantity;
    update.inventory.available = quantity == null ? null : Math.max(0, quantity - reserved);
  }
  if (canAdminister && ADMIN_STATUSES.has(input.status)) update.status = input.status;
  if (canAdminister && typeof input.artisanId === 'string' && input.artisanId.trim()) {
    const artisanId = input.artisanId.trim();
    update.artisanId = artisanId;
    update.artisanInfo = { ...(existing.artisanInfo || {}), artisanId };
    update.seller = { ...(existing.seller || {}), userId: artisanId };
  }
  return update;
}
