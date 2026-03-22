export function getProductAvailabilityTag(product) {
  if (!product || !product.tags) return null;
  const tags = product.tags.map(tag => tag.toLowerCase());
  const availabilityTags = ['ready-to-ship', 'signature-design', 'one-of-one'];
  return availabilityTags.find(tag => tags.includes(tag)) || null;
}

export function getProductCategoryTag(product) {
  if (!product || !product.tags) return null;
  const tags = product.tags.map(tag => tag.toLowerCase());
  const categoryTags = ['bridal', 'statement-piece'];
  return categoryTags.find(tag => tags.includes(tag)) || null;
}

export function getProductTypeTags(product) {
  if (!product || !product.tags) return [];
  const tags = product.tags.map(tag => tag.toLowerCase());
  const typeTags = [
    'engagement-ring', 'wedding-band', 'bridal-set',
    'ring', 'earring', 'pendant', 'dog-tag', 'body-jewelry',
    'rings', 'earrings', 'pendants', 'necklaces', 'bracelets'
  ];
  return typeTags.filter(tag => tags.includes(tag));
}

export function getProductGemstoneTags(product) {
  if (!product || !product.tags) return [];
  const tags = product.tags.map(tag => tag.toLowerCase());
  const gemstoneTags = [
    'diamond', 'sapphire', 'ruby', 'emerald', 'amethyst', 'topaz',
    'garnet', 'peridot', 'citrine', 'aquamarine', 'tanzanite',
    'opal', 'turquoise', 'jade', 'pearl', 'onyx'
  ];
  return gemstoneTags.filter(tag => tags.includes(tag));
}

export function getProductMaterialTags(product) {
  if (!product || !product.tags) return [];
  const tags = product.tags.map(tag => tag.toLowerCase());
  const materialTags = [
    'gold', 'white-gold', 'yellow-gold', 'rose-gold',
    'platinum', 'silver', 'sterling-silver',
    'titanium', 'palladium'
  ];
  return materialTags.filter(tag => tags.includes(tag));
}

export function getProductGenderTags(product) {
  if (!product || !product.tags) return [];
  const tags = product.tags.map(tag => tag.toLowerCase());
  const genderTags = ['mens', 'womens', 'unisex'];
  return genderTags.filter(tag => tags.includes(tag));
}
