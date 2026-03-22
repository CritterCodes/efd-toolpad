import { getProductAvailabilityTag } from './tags.helpers';

export function getProductAvailability(product) {
  return getProductAvailabilityTag(product) || 'unknown';
}

export function hasInventory(product) {
  if (!product) return false;
  
  const availability = getProductAvailabilityTag(product);
  
  switch (availability) {
    case 'signature-design':
      return product.availableForSale;
    case 'ready-to-ship':
    case 'one-of-one':
    default:
      break; 
  }
  
  if (product.totalInventory !== undefined) {
    return product.totalInventory > 0;
  }
  
  if (product.variants && product.variants.edges) {
    return product.variants.edges.some(edge => {
      const variant = edge.node;
      return variant.availableForSale && (variant.quantityAvailable === undefined || variant.quantityAvailable > 0);
    });
  }
  
  return product.availableForSale;
}

export function isOutOfStock(product) {
  return !hasInventory(product);
}

export function getAvailabilityDisplayInfo(availability) {
  const availabilityMap = {
    'ready-to-ship': {
      label: 'Ready-to-Ship',
      description: 'In-stock and available immediately',
      badgeColor: 'bg-green-500',
      timeframe: 'Ships within 1-2 business days'
    },
    'signature-design': {
      label: 'Signature Design',
      description: 'Repeatable designs made upon order',
      badgeColor: 'bg-blue-500',
      timeframe: 'Production takes 4-6 weeks'
    },
    'one-of-one': {
      label: 'One-of-One',
      description: 'Unique, single-production designs',
      badgeColor: 'bg-purple-500',
      timeframe: 'Exclusive piece - Contact for details'
    },
    'unknown': {
      label: 'Contact for Availability',
      description: 'Please contact us for availability information',
      badgeColor: 'bg-gray-500',
      timeframe: 'Contact for details'
    }
  };
  
  return availabilityMap[availability] || availabilityMap['unknown'];
}

export function getProductDescriptionTemplate(availability, productName) {
  const templates = {
    'signature-design': `This Signature Design is digitally showcased and crafted exclusively upon order. The ${productName} represents our commitment to exceptional craftsmanship and timeless design. Production takes approximately 4-6 weeks from the date of purchase.`,
    'ready-to-ship': `This beautiful ${productName} is currently in stock and ready to ship immediately. Each piece is carefully inspected and prepared for delivery within 1-2 business days.`,
    'one-of-one': `This is a truly unique ${productName} - a one-of-one creation that will never be reproduced. Once sold, this exclusive design becomes part of a private collection forever.`
  };
  return templates[availability] || `Contact us for more information about this ${productName}.`;
}
