import storefront from './client';
import { 
  GET_PRODUCTS_QUERY, 
  GET_PRODUCTS_BY_TAG_QUERY, 
  GET_PRODUCTS_BY_TAG_FILTERS_QUERY, 
  GET_CUSTOM_HIGHLIGHTS_QUERY, 
  GET_PRODUCTS_BY_VENDOR_QUERY 
} from './queries/products.queries';
import { GET_PRODUCT_BY_HANDLE_QUERY } from './queries/product-details.queries';

export async function getProducts(first = 20) {
  const data = await storefront(GET_PRODUCTS_QUERY, { first });
  if (!data || !data.products) {
    return [];
  }
  return data.products.edges.map(edge => edge.node);
}

export async function getProductByHandle(handle) {
  const data = await storefront(GET_PRODUCT_BY_HANDLE_QUERY, { handle });
  const product = data?.productByHandle;
  
  if (product) {
    const model3dMedia = product.media?.edges?.find(edge => 
      edge.node.mediaContentType === 'MODEL_3D'
    );
    
    if (model3dMedia && model3dMedia.node.sources?.length > 0) {
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

export async function getProductsByAvailability(availability, first = 24) {
  const tagQuery = `tag:${availability}`;
  const data = await storefront(GET_PRODUCTS_BY_TAG_QUERY, { tag: tagQuery, first });
  return data?.products?.edges.map(edge => edge.node) || [];
}

export async function getProductsByTagFilters(filters = {}, first = 24) {
  let queryParts = [];
  
  if (filters.availability) queryParts.push(`tag:${filters.availability}`);
  if (filters.category) queryParts.push(`tag:${filters.category}`);
  if (filters.type) queryParts.push(`tag:${filters.type}`);
  if (filters.gemstone) queryParts.push(`tag:${filters.gemstone}`);
  if (filters.material) queryParts.push(`tag:${filters.material}`);
  if (filters.gender) queryParts.push(`tag:${filters.gender}`);
  if (filters.productType) queryParts.push(`product_type:${filters.productType}`);
  
  const queryString = queryParts.join(' AND ');
  const data = await storefront(GET_PRODUCTS_BY_TAG_FILTERS_QUERY, { queryString, first });
  return data?.products?.edges.map(edge => edge.node) || [];
}

export async function getCustomHighlights(first = 8) {
  let queryParts = ['tag:custom', 'tag:highlight'];
  const queryString = queryParts.join(' AND ');
  const data = await storefront(GET_CUSTOM_HIGHLIGHTS_QUERY, { queryString, first });
  if (!data || !data.products) {
    return [];
  }
  return data.products.edges.map(edge => edge.node);
}

export async function getProductsByVendor(vendorName, limit = 20) {
  try {
    const variables = {
      first: limit,
      vendorQuery: `vendor:${vendorName}`
    };

    const data = await storefront(GET_PRODUCTS_BY_VENDOR_QUERY, variables);
    
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
