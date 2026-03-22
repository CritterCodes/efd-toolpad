import { getDateRangeForTimeline } from "./timeline.js";

export function buildVendorAnalyticsQuery(vendorName, timeline) {
  const { since, until } = getDateRangeForTimeline(timeline);
  
  // Use Shopify Orders API with vendor filtering in the query
  return `
    query getVendorAnalytics {
      orders(first: 250, query: "created_at:>=${since} AND created_at:<=${until}") {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  product {
                    id
                    title
                    vendor
                  }
                  originalTotalSet {
                    shopMoney {
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
    }
  `;
}
