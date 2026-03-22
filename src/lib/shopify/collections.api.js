import storefront from './client';
import { GET_COLLECTIONS_QUERY, GET_COLLECTION_BY_HANDLE_QUERY } from './queries/collections.queries';
import { getAvailabilityDisplayInfo } from './availability.helpers';
import { getProductsByTagFilters } from './products.api';
import { filterProductsWithInventory } from './filters.helpers';

export async function getCollections(first = 10) {
  const data = await storefront(GET_COLLECTIONS_QUERY, { first });
  if (!data || !data.collections) {
    return [];
  }
  return data.collections.edges.map(edge => edge.node);
}

export async function getCollectionByHandle(handle, first = 24) {
  const data = await storefront(GET_COLLECTION_BY_HANDLE_QUERY, { handle, first });
  if (!data || !data.collectionByHandle) {
    return null;
  }
  return data.collectionByHandle;
}

export async function getCollectionOrAvailability(handle, first = 24) {
  const availabilityCollections = {
    'ready-to-ship': 'ready-to-ship',
    'signature-design': 'signature-design',
    'one-of-one': 'one-of-one'
  };
  
  const categoryCollections = {
    'bridal': 'bridal',
    'statement-pieces': 'statement-piece',
    'gemstones': 'gemstone'
  };
  
  const typeCollections = {
    'engagement-rings': 'engagement-ring', 'wedding-bands': 'wedding-band', 'bridal-sets': 'bridal-set',
    'rings': 'ring', 'earrings': 'earring', 'pendants': 'pendant', 'dog-tags': 'dog-tag', 'body-jewelry': 'body-jewelry',
    'diamonds': 'diamond', 'emerald': 'emerald', 'sapphire': 'sapphire', 'ruby': 'ruby', 'colored-stones': 'colored-stones',
    'new-arrivals': 'new-arrivals', 'best-sellers': 'best-sellers', 'sale': 'sale'
  };
  
  const pathParts = handle.split('/');
  let filters = {};
  let collectionTitle = '';
  let collectionDescription = '';
  
  if (pathParts.length === 2) {
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
  
  if (Object.keys(filters).length > 0) {
    const products = await getProductsByTagFilters(filters, first);
    const activeProducts = filterProductsWithInventory(products);
    
    return {
      id: `tag-collection-${handle}`,
      title: collectionTitle,
      handle: handle,
      description: collectionDescription,
      descriptionHtml: `<p>${collectionDescription}</p>`,
      image: null,
      products: { edges: activeProducts.map(product => ({ node: product })) },
      isTagCollection: true,
      filters: filters
    };
  }
  
  try {
    return await getCollectionByHandle(handle, first);
  } catch (error) {
    console.error('Collection not found:', handle, error);
    return null;
  }
}
