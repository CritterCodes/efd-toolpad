// lib/shopify.js
// Shopify Storefront API client

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const storefront = async (query, variables = {}) => {
  // Check if required environment variables are available
  if (!domain || !storefrontAccessToken) {
    console.warn('Shopify environment variables not configured');
    return null;
  }

  try {
    const res = await fetch(`https://${domain}/api/2025-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const json = await res.json();
    if (json.errors) {
      console.error('Shopify API errors:', json.errors);
      // Throw detailed API errors
      throw new Error(`Shopify Storefront API request failed: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  } catch (error) {
    console.error('Shopify API request failed:', error);
    return null;
  }
};

export default storefront;

// Helper functions for common queries
export async function getProducts(first = 20) {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            tags
            productType
            vendor
            availableForSale
            totalInventory
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  availableForSale
                  quantityAvailable
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await storefront(query, { first });
  if (!data || !data.products) {
    return [];
  }
  return data.products.edges.map(edge => edge.node);
}

export async function getCollections(first = 10) {
  const query = `
    query getCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            image {
              url
              altText
            }
          }
        }
      }
    }
  `;
  
  const data = await storefront(query, { first });
  if (!data || !data.collections) {
    return [];
  }
  return data.collections.edges.map(edge => edge.node);
}

export async function getCollectionByHandle(handle, first = 24) {
  const query = `
    query getCollectionByHandle($handle: String!, $first: Int!) {
      collectionByHandle(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        image {
          url
          altText
        }
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              tags
              productType
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await storefront(query, { handle, first });
  if (!data || !data.collectionByHandle) {
    return null;
  }
  return data.collectionByHandle;
}

export async function getProductByHandle(handle) {
  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        tags
        productType
        vendor
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
              width
              height
            }
          }
        }
        media(first: 10) {
          edges {
            node {
              ... on MediaImage {
                id
                image {
                  url
                  altText
                  width
                  height
                }
              }
              ... on Model3d {
                id
                alt
                mediaContentType
                previewImage {
                  url
                  altText
                  width
                  height
                }
                sources {
                  url
                  mimeType
                  format
                  filesize
                }
              }
              ... on Video {
                id
                alt
                mediaContentType
                previewImage {
                  url
                  altText
                  width
                  height
                }
                sources {
                  url
                  mimeType
                  format
                  height
                  width
                }
              }
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              availableForSale
              quantityAvailable
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              selectedOptions {
                name
                value
              }
              image {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
        options {
          id
          name
          values
        }
        seo {
          title
          description
        }
      }
    }
  `;
  
  const data = await storefront(query, { handle });
  const product = data.productByHandle;
  
  if (product) {
    // Process 3D model data if available
    const model3dMedia = product.media?.edges?.find(edge => 
      edge.node.mediaContentType === 'MODEL_3D'
    );
    
    if (model3dMedia && model3dMedia.node.sources?.length > 0) {
      // Find GLB format first (preferred), then GLTF
      const glbSource = model3dMedia.node.sources.find(source => 
        source.format === 'glb' || source.mimeType === 'model/gltf-binary'
      );
      const gltfSource = model3dMedia.node.sources.find(source => 
        source.format === 'gltf' || source.mimeType === 'model/gltf+json'
      );
      
      product.model3dUrl = glbSource?.url || gltfSource?.url || null;
      product.model3dPreviewImageUrl = model3dMedia.node.previewImage?.url || null;
      product.model3dAlt = model3dMedia.node.alt || `${product.title} 3D model`;
    }
  }
  
  return product;
}

// Product Availability Helper Functions (Updated for new tag structure)
export function getProductAvailability(product) {
  return getProductAvailabilityTag(product) || 'unknown';
}

// Inventory Helper Functions
export function hasInventory(product) {
  // Check if product is active and has inventory
  if (!product) return false;
  
  // Get product availability type
  const availability = getProductAvailabilityTag(product);
  
  // Handle different availability types
  switch (availability) {
    case 'signature-design':
      // Made-to-order items are always "available" regardless of physical inventory
      // Only check if Shopify says it's available for sale
      return product.availableForSale;
      
    case 'ready-to-ship':
      // Ready-to-ship items need actual physical inventory
      break; // Fall through to inventory check
      
    case 'one-of-one':
      // Unique pieces - check actual inventory since once sold, they're gone
      break; // Fall through to inventory check
      
    default:
      // Unknown availability type - be conservative and check inventory
      break; // Fall through to inventory check
  }
  
  // Check actual physical inventory for ready-to-ship, one-of-one, and unknown types
  
  // Check totalInventory first (if available)
  if (product.totalInventory !== undefined) {
    return product.totalInventory > 0;
  }
  
  // Fallback to checking variants
  if (product.variants && product.variants.edges) {
    return product.variants.edges.some(edge => {
      const variant = edge.node;
      return variant.availableForSale && (variant.quantityAvailable === undefined || variant.quantityAvailable > 0);
    });
  }
  
  // Final fallback to availableForSale
  return product.availableForSale;
}

export function isOutOfStock(product) {
  return !hasInventory(product);
}

export function shouldShowInCollections(product) {
  // Show all active products regardless of inventory status
  // Individual products will handle their own availability display
  return product && product.availableForSale;
}

export function filterProductsWithInventory(products) {
  // Note: Now shows ALL active products, not just those with inventory
  // Individual product pages will handle availability display and purchasing logic
  return products.filter(shouldShowInCollections);
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

// Collection filtering by availability
export async function getProductsByAvailability(availability, first = 24) {
  const query = `
    query getProductsByTag($tag: String!, $first: Int!) {
      products(first: $first, query: $tag) {
        edges {
          node {
            id
            title
            handle
            tags
            productType
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            media(first: 1) {
              edges {
                node {
                  ... on Model3d {
                    id
                    mediaContentType
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const tagQuery = `tag:${availability}`;
  const data = await storefront(query, { tag: tagQuery, first });
  return data.products.edges.map(edge => edge.node);
}

// Tag-based filtering and navigation helpers following EFD SOP

// Extract availability tag from product (one required per product)
export function getProductAvailabilityTag(product) {
  if (!product || !product.tags) return null;
  
  const tags = product.tags.map(tag => tag.toLowerCase());
  const availabilityTags = ['ready-to-ship', 'signature-design', 'one-of-one'];
  
  return availabilityTags.find(tag => tags.includes(tag)) || null;
}

// Extract category tag from product (one required per product)
export function getProductCategoryTag(product) {
  if (!product || !product.tags) return null;
  
  const tags = product.tags.map(tag => tag.toLowerCase());
  const categoryTags = ['bridal', 'statement-piece'];
  
  return categoryTags.find(tag => tags.includes(tag)) || null;
}

// Extract type tags from product (one or more required per product)
export function getProductTypeTags(product) {
  if (!product || !product.tags) return [];
  
  const tags = product.tags.map(tag => tag.toLowerCase());
  const typeTags = [
    // Bridal types
    'engagement-ring', 'wedding-band', 'bridal-set',
    
    // Statement Pieces types
    'ring', 'earring', 'pendant', 'dog-tag', 'body-jewelry',
    
    // Legacy/alternative type tags
    'rings', 'earrings', 'pendants', 'necklaces', 'bracelets'
  ];
  
  return typeTags.filter(tag => tags.includes(tag));
}

// Extract gemstone tags from product (optional)
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

// Extract material tags from product (optional)
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

// Extract gender tags from product (optional)
export function getProductGenderTags(product) {
  if (!product || !product.tags) return [];
  
  const tags = product.tags.map(tag => tag.toLowerCase());
  const genderTags = ['mens', 'womens', 'unisex'];
  
  return genderTags.filter(tag => tags.includes(tag));
}

// Get products by multiple tag filters
export async function getProductsByTagFilters(filters = {}, first = 24) {
  let queryParts = [];
  
  // Build tag-based query
  if (filters.availability) {
    queryParts.push(`tag:${filters.availability}`);
  }
  if (filters.category) {
    queryParts.push(`tag:${filters.category}`);
  }
  if (filters.type) {
    queryParts.push(`tag:${filters.type}`);
  }
  if (filters.gemstone) {
    queryParts.push(`tag:${filters.gemstone}`);
  }
  if (filters.material) {
    queryParts.push(`tag:${filters.material}`);
  }
  if (filters.gender) {
    queryParts.push(`tag:${filters.gender}`);
  }
  
  // Add productType filter if specified
  if (filters.productType) {
    queryParts.push(`product_type:${filters.productType}`);
  }
  
  const query = `
    query getProductsByTagFilters($queryString: String!, $first: Int!) {
      products(first: $first, query: $queryString) {
        edges {
          node {
            id
            title
            handle
            tags
            productType
            vendor
            availableForSale
            totalInventory
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  availableForSale
                  quantityAvailable
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            media(first: 1) {
              edges {
                node {
                  ... on Model3d {
                    id
                    mediaContentType
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const queryString = queryParts.join(' AND ');
  const data = await storefront(query, { queryString, first });
  return data.products.edges.map(edge => edge.node);
}

// Enhanced collection function that supports both Shopify collections and tag-based collections
export async function getCollectionOrAvailability(handle, first = 24) {
  // Availability-based collections
  const availabilityCollections = {
    'ready-to-ship': 'ready-to-ship',
    'signature-design': 'signature-design',
    'one-of-one': 'one-of-one'
  };
  
  // Category-based collections matching navigation structure
  const categoryCollections = {
    'bridal': 'bridal',
    'statement-pieces': 'statement-piece', // URL uses plural, tag is singular
    'gemstones': 'gemstone'
  };
  
  // Type-based collections matching navigation structure
  const typeCollections = {
    // Bridal types
    'engagement-rings': 'engagement-ring',
    'wedding-bands': 'wedding-band',
    'bridal-sets': 'bridal-set',
    
    // Statement Pieces types
    'rings': 'ring',
    'earrings': 'earring',
    'pendants': 'pendant',
    'dog-tags': 'dog-tag',
    'body-jewelry': 'body-jewelry',
    
    // Gemstone types
    'diamonds': 'diamond',
    'emerald': 'emerald',
    'sapphire': 'sapphire',
    'ruby': 'ruby',
    'colored-stones': 'colored-stones',
    
    // Utility collections
    'new-arrivals': 'new-arrivals',
    'best-sellers': 'best-sellers',
    'sale': 'sale'
  };
  
  // Handle compound routes (e.g., 'bridal/engagement-rings')
  const pathParts = handle.split('/');
  let filters = {};
  let collectionTitle = '';
  let collectionDescription = '';
  
  if (pathParts.length === 2) {
    // Compound route like 'bridal/engagement-rings'
    const [category, type] = pathParts;
    
    if (categoryCollections[category] && typeCollections[type]) {
      filters = {
        category: categoryCollections[category],
        type: typeCollections[type]
      };
      collectionTitle = `${category.charAt(0).toUpperCase() + category.slice(1)} - ${type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
      collectionDescription = `Shop our collection of ${type.replace('-', ' ')} in the ${category} category.`;
    }
  } else {
    // Single route
    if (availabilityCollections[handle]) {
      filters = { availability: availabilityCollections[handle] };
      const displayInfo = getAvailabilityDisplayInfo(availabilityCollections[handle]);
      collectionTitle = displayInfo.label;
      collectionDescription = displayInfo.description;
    } else if (categoryCollections[handle]) {
      filters = { category: categoryCollections[handle] };
      collectionTitle = handle.charAt(0).toUpperCase() + handle.slice(1).replace('-', ' ');
      collectionDescription = `Shop our ${collectionTitle.toLowerCase()} collection.`;
    } else if (typeCollections[handle]) {
      filters = { type: typeCollections[handle] };
      collectionTitle = handle.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      collectionDescription = `Browse our selection of ${collectionTitle.toLowerCase()}.`;
    }
  }
  
  // If we have filters, create a tag-based collection
  if (Object.keys(filters).length > 0) {
    const products = await getProductsByTagFilters(filters, first);
    
    // Filter to only show active products (all inventory statuses included)
    const activeProducts = filterProductsWithInventory(products);
    
    return {
      id: `tag-collection-${handle}`,
      title: collectionTitle,
      handle: handle,
      description: collectionDescription,
      descriptionHtml: `<p>${collectionDescription}</p>`,
      image: null,
      products: {
        edges: activeProducts.map(product => ({ node: product }))
      },
      isTagCollection: true,
      filters: filters
    };
  }
  
  // Fall back to regular Shopify collection
  try {
    return await getCollectionByHandle(handle, first);
  } catch (error) {
    console.error('Collection not found:', handle, error);
    return null;
  }
}

// Get available filter options for a collection
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
    // Extract all tag types
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
  
  // Convert sets to sorted arrays
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

// Get custom highlights products (tagged with both "custom" and "highlight")
export async function getCustomHighlights(first = 8) {
  const filters = {
    // Must have both custom and highlight tags
    custom: 'custom',
    highlight: 'highlight'
  };
  
  let queryParts = [];
  queryParts.push('tag:custom');
  queryParts.push('tag:highlight');
  
  const query = `
    query getCustomHighlights($queryString: String!, $first: Int!) {
      products(first: $first, query: $queryString) {
        edges {
          node {
            id
            title
            handle
            tags
            productType
            vendor
            availableForSale
            totalInventory
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  availableForSale
                  quantityAvailable
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            media(first: 1) {
              edges {
                node {
                  ... on Model3d {
                    id
                    mediaContentType
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const queryString = queryParts.join(' AND ');
  const data = await storefront(query, { queryString, first });
  if (!data || !data.products) {
    return [];
  }
  return data.products.edges.map(edge => edge.node);
}

// Filter products client-side based on selected filters
export function filterProducts(products, activeFilters) {
  return products.filter(product => {
    // First check: only show active products (now includes all inventory statuses)
    if (!shouldShowInCollections(product)) {
      return false;
    }
    
    // Check availability filter
    if (activeFilters.availability && activeFilters.availability.length > 0) {
      const productAvailability = getProductAvailabilityTag(product);
      if (!productAvailability || !activeFilters.availability.includes(productAvailability)) {
        return false;
      }
    }
    
    // Check category filter
    if (activeFilters.category && activeFilters.category.length > 0) {
      const productCategory = getProductCategoryTag(product);
      if (!productCategory || !activeFilters.category.includes(productCategory)) {
        return false;
      }
    }
    
    // Check type filter
    if (activeFilters.type && activeFilters.type.length > 0) {
      const productTypes = getProductTypeTags(product);
      if (!productTypes.some(type => activeFilters.type.includes(type))) {
        return false;
      }
    }
    
    // Check gemstone filter
    if (activeFilters.gemstone && activeFilters.gemstone.length > 0) {
      const productGemstones = getProductGemstoneTags(product);
      if (!productGemstones.some(gem => activeFilters.gemstone.includes(gem))) {
        return false;
      }
    }
    
    // Check material filter
    if (activeFilters.material && activeFilters.material.length > 0) {
      const productMaterials = getProductMaterialTags(product);
      if (!productMaterials.some(material => activeFilters.material.includes(material))) {
        return false;
      }
    }
    
    // Check gender filter
    if (activeFilters.gender && activeFilters.gender.length > 0) {
      const productGenders = getProductGenderTags(product);
      if (!productGenders.some(gender => activeFilters.gender.includes(gender))) {
        return false;
      }
    }
    
    // Check productType filter
    if (activeFilters.productType && activeFilters.productType.length > 0) {
      if (!activeFilters.productType.includes(product.productType)) {
        return false;
      }
    }
    
    // Check vendor filter
    if (activeFilters.vendor && activeFilters.vendor.length > 0) {
      if (!activeFilters.vendor.includes(product.vendor)) {
        return false;
      }
    }
    
    return true;
  });
}

// Get products by specific vendor
export async function getProductsByVendor(vendorName, limit = 20) {
  try {
    const query = `
      query getProductsByVendor($first: Int!, $vendorQuery: String!) {
        products(first: $first, query: $vendorQuery) {
          edges {
            node {
              id
              title
              handle
              vendor
              productType
              tags
              availableForSale
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      first: limit,
      vendorQuery: `vendor:${vendorName}`
    };

    const data = await storefront(query, variables);
    
    if (!data?.products?.edges) {
      return [];
    }

    const products = data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      vendor: node.vendor,
      productType: node.productType,
      tags: node.tags || [],
      availableForSale: node.availableForSale,
      priceRange: node.priceRange,
      images: node.images.edges.map(({ node: image }) => ({
        url: image.url,
        altText: image.altText,
        width: image.width,
        height: image.height,
      })),
      variants: node.variants.edges.map(({ node: variant }) => ({
        id: variant.id,
        availableForSale: variant.availableForSale,
        price: variant.price,
      })),
    }));

    return products;
  } catch (error) {
    console.error('Error fetching products by vendor:', error);
    return [];
  }
}
