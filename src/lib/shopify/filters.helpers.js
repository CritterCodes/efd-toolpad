import { 
  getProductAvailabilityTag, 
  getProductCategoryTag, 
  getProductTypeTags, 
  getProductGemstoneTags, 
  getProductMaterialTags, 
  getProductGenderTags 
} from './tags.helpers';

export function shouldShowInCollections(product) {
  return product && product.availableForSale;
}

export function filterProductsWithInventory(products) {
  return products.filter(shouldShowInCollections);
}

export function getAvailableFilters(products) {
  const filters = {
    availability: new Set(),
    category: new Set(),
    type: new Set(),
    gemstone: new Set(),
    material: new Set(),
    gender: new Set(),
    productType: new Set(),
    vendor: new Set()
  };
  
  products.forEach(product => {
    const availability = getProductAvailabilityTag(product);
    const category = getProductCategoryTag(product);
    const types = getProductTypeTags(product);
    const gemstones = getProductGemstoneTags(product);
    const materials = getProductMaterialTags(product);
    const genders = getProductGenderTags(product);
    
    if (availability) filters.availability.add(availability);
    if (category) filters.category.add(category);
    types.forEach(type => filters.type.add(type));
    gemstones.forEach(gem => filters.gemstone.add(gem));
    materials.forEach(material => filters.material.add(material));
    genders.forEach(gender => filters.gender.add(gender));
    
    if (product.productType) filters.productType.add(product.productType);
    if (product.vendor) filters.vendor.add(product.vendor);
  });
  
  return {
    availability: Array.from(filters.availability).sort(),
    category: Array.from(filters.category).sort(),
    type: Array.from(filters.type).sort(),
    gemstone: Array.from(filters.gemstone).sort(),
    material: Array.from(filters.material).sort(),
    gender: Array.from(filters.gender).sort(),
    productType: Array.from(filters.productType).sort(),
    vendor: Array.from(filters.vendor).sort()
  };
}

export function filterProducts(products, activeFilters) {
  return products.filter(product => {
    if (!shouldShowInCollections(product)) {
      return false;
    }
    
    if (activeFilters.availability && activeFilters.availability.length > 0) {
      const productAvailability = getProductAvailabilityTag(product);
      if (!productAvailability || !activeFilters.availability.includes(productAvailability)) {
        return false;
      }
    }
    
    if (activeFilters.category && activeFilters.category.length > 0) {
      const productCategory = getProductCategoryTag(product);
      if (!productCategory || !activeFilters.category.includes(productCategory)) {
        return false;
      }
    }
    
    if (activeFilters.type && activeFilters.type.length > 0) {
      const productTypes = getProductTypeTags(product);
      if (!productTypes.some(type => activeFilters.type.includes(type))) {
        return false;
      }
    }
    
    if (activeFilters.gemstone && activeFilters.gemstone.length > 0) {
      const productGemstones = getProductGemstoneTags(product);
      if (!productGemstones.some(gem => activeFilters.gemstone.includes(gem))) {
        return false;
      }
    }
    
    if (activeFilters.material && activeFilters.material.length > 0) {
      const productMaterials = getProductMaterialTags(product);
      if (!productMaterials.some(material => activeFilters.material.includes(material))) {
        return false;
      }
    }
    
    if (activeFilters.gender && activeFilters.gender.length > 0) {
      const productGenders = getProductGenderTags(product);
      if (!productGenders.some(gender => activeFilters.gender.includes(gender))) {
        return false;
      }
    }
    
    if (activeFilters.productType && activeFilters.productType.length > 0) {
      if (!activeFilters.productType.includes(product.productType)) {
        return false;
      }
    }
    
    if (activeFilters.vendor && activeFilters.vendor.length > 0) {
      if (!activeFilters.vendor.includes(product.vendor)) {
        return false;
      }
    }
    
    return true;
  });
}
