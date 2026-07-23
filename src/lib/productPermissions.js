export function getUserArtisanTypes(userProfile) {
  const raw = userProfile?.artisanApplication?.artisanType;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : raw.split(',');
  // Real data stores Title Case labels ("Gem Cutter"); normalize to kebab-case so the
  // canManage* checks ('gem-cutter', 'jeweler') actually match.
  return arr.map((s) => String(s).trim().toLowerCase().replace(/[\s_]+/g, '-')).filter(Boolean);
}

export function canManageGemstones(role, artisanTypes) {
  if (['admin', 'staff', 'dev'].includes(role)) return true;
  return artisanTypes.some((t) => t === 'gem-cutter');
}

export function canManageJewelry(role, artisanTypes) {
  if (['admin', 'staff', 'dev'].includes(role)) return true;
  return artisanTypes.some((t) => t === 'jeweler');
}

export function canPublishProduct(role, artisanTypes, product, userId) {
  if (['admin', 'superadmin', 'dev', 'staff'].includes(role)) return true;
  const isOwner = product.userId === userId;
  if (!isOwner) return false;
  if (product.productType === 'jewelry' && artisanTypes.includes('jeweler')) return true;
  if (product.productType === 'gemstone' && artisanTypes.includes('gem-cutter')) return true;
  return false;
}
