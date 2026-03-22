import storefront from './shopify/client';

export default storefront;

export * from './shopify/queries/products.queries';
export * from './shopify/queries/product-details.queries';
export * from './shopify/queries/collections.queries';

export * from './shopify/products.api';
export * from './shopify/collections.api';

export * from './shopify/availability.helpers';
export * from './shopify/tags.helpers';
export * from './shopify/filters.helpers';
