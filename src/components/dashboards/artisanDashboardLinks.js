export function isOnsiteRepairOpsUser(user) {
  return user?.employment?.isOnsite === true
    && user?.staffCapabilities?.repairOps === true;
}

export function buildArtisanShopUrl(slug, shopBaseUrl = 'https://shop.engelfinedesign.com') {
  if (!slug) return null;
  return `${shopBaseUrl.replace(/\/$/, '')}/vendors/${encodeURIComponent(slug)}`;
}
