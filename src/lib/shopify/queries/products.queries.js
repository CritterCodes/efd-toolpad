export const GET_PRODUCTS_QUERY = `
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



export const GET_PRODUCTS_BY_TAG_QUERY = `
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

export const GET_PRODUCTS_BY_TAG_FILTERS_QUERY = `
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

export const GET_CUSTOM_HIGHLIGHTS_QUERY = `
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

export const GET_PRODUCTS_BY_VENDOR_QUERY = `
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
