/**
 * Pure helpers for the unified products catalog page.
 * No DB access — accepts a products array and returns filtered/sorted/stats results.
 */

const TYPE_MAP = { gemstone: 'gemstone', jewelry: 'jewelry' };

export function getProductThumb(product) {
  if (!product) return '';
  const imgs = product.images;
  const first = Array.isArray(imgs) ? imgs[0] : imgs;
  if (!first) return '';
  if (typeof first === 'string') return first;
  if (typeof first === 'object') return first.url || first.src || first.location || first.key || '';
  return '';
}

export function formatPrice(product) {
  const p = product.price ?? product.pricing?.retailPrice ?? product.pricing?.price;
  if (p == null || p === '' || Number.isNaN(Number(p))) return null;
  return Number(p);
}

export function formatMargin(product) {
  const m = product.pricing?.margin ?? product.margin;
  if (m == null || m === '') return null;
  return Number(m);
}

export function catalogStats(products) {
  return {
    total: products.length,
    active: products.filter((p) => p.status === 'active' || p.status === 'approved' || p.status === 'Available').length,
    draft: products.filter((p) => !p.status || p.status === 'draft').length,
    outOfStock: products.filter((p) => {
      const inv = p.inventory;
      if (!inv) return false;
      return (inv.available ?? inv.quantity ?? 1) === 0;
    }).length,
  };
}

export function filterCatalog(products, { search = '', type = 'all', status = 'all', artisanId = 'all', sort = 'newest' } = {}) {
  const q = search.trim().toLowerCase();
  const normalized = TYPE_MAP[type] ?? null;

  let result = products.filter((p) => {
    if (normalized && (p.productType || 'jewelry') !== normalized) return false;
    if (status !== 'all' && (p.status || 'draft') !== status) return false;
    if (artisanId !== 'all' && (p.artisanId || p.artisanInfo?.artisanId) !== artisanId) return false;
    if (!q) return true;
    return [p.title, p.description, p.productType, p.artisanInfo?.businessName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  result = [...result].sort((a, b) => {
    if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
    if (sort === 'price_asc') return (formatPrice(a) ?? 0) - (formatPrice(b) ?? 0);
    if (sort === 'price_desc') return (formatPrice(b) ?? 0) - (formatPrice(a) ?? 0);
    // newest (default)
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return result;
}
