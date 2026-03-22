export const GET_PRODUCT_BY_HANDLE_QUERY = `
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
