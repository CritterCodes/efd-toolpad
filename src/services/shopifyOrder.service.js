// Shopify Storefront API client for creating orders
export class ShopifyOrderService {
  constructor() {
    this.storeUrl = process.env.SHOPIFY_STORE_URL;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = '2023-10';
  }

  async makeRequest(query, variables = {}) {
    const url = `https://${this.storeUrl}/admin/api/${this.apiVersion}/graphql.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async createDepositOrder(ticket, customerInfo) {
    try {
      // Calculate deposit amount (typically 50% of quote total)
      const depositAmount = (ticket.quoteTotal || 0) * 0.5;
      
      const orderTags = `${ticket.type}-deposit, ticket-${ticket.ticketID}`;
      
      const mutation = `
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              name
              totalPrice
              tags
              invoiceUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          lineItems: [
            {
              title: `${ticket.type === 'repair' ? 'Jewelry Repair' : 'Custom Design'} - Deposit`,
              price: depositAmount.toFixed(2),
              quantity: 1,
              taxable: true,
              customAttributes: [
                {
                  key: 'ticket_id',
                  value: ticket.ticketID
                },
                {
                  key: 'order_type',
                  value: 'deposit'
                }
              ]
            }
          ],
          customer: {
            email: customerInfo.email,
            firstName: customerInfo.firstName || '',
            lastName: customerInfo.lastName || ''
          },
          tags: orderTags,
          note: `Deposit for ${ticket.type} ticket: ${ticket.title}. Ticket ID: ${ticket.ticketID}`,
          useCustomerDefaultAddress: true
        }
      };

      const result = await this.makeRequest(mutation, variables);
      
      if (result.draftOrderCreate.userErrors.length > 0) {
        throw new Error(`Shopify order creation failed: ${JSON.stringify(result.draftOrderCreate.userErrors)}`);
      }

      const order = result.draftOrderCreate.draftOrder;
      
      console.log('✅ Shopify deposit order created:', order.name);
      
      return {
        orderId: order.id,
        orderName: order.name,
        totalPrice: order.totalPrice,
        invoiceUrl: order.invoiceUrl
      };
    } catch (error) {
      console.error('❌ Error creating Shopify deposit order:', error);
      throw error;
    }
  }

  async createFinalOrder(ticket, customerInfo) {
    try {
      // Calculate final amount (quote total minus any deposit already paid)
      const depositAmount = (ticket.quoteTotal || 0) * 0.5;
      const finalAmount = (ticket.quoteTotal || 0) - depositAmount;
      
      const orderTags = `${ticket.type}-final, ticket-${ticket.ticketID}`;
      
      const mutation = `
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              name
              totalPrice
              tags
              invoiceUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          lineItems: [
            {
              title: `${ticket.type === 'repair' ? 'Jewelry Repair' : 'Custom Design'} - Final Payment`,
              price: finalAmount.toFixed(2),
              quantity: 1,
              taxable: true,
              customAttributes: [
                {
                  key: 'ticket_id',
                  value: ticket.ticketID
                },
                {
                  key: 'order_type',
                  value: 'final'
                }
              ]
            }
          ],
          customer: {
            email: customerInfo.email,
            firstName: customerInfo.firstName || '',
            lastName: customerInfo.lastName || ''
          },
          tags: orderTags,
          note: `Final payment for ${ticket.type} ticket: ${ticket.title}. Ticket ID: ${ticket.ticketID}`,
          useCustomerDefaultAddress: true
        }
      };

      const result = await this.makeRequest(mutation, variables);
      
      if (result.draftOrderCreate.userErrors.length > 0) {
        throw new Error(`Shopify order creation failed: ${JSON.stringify(result.draftOrderCreate.userErrors)}`);
      }

      const order = result.draftOrderCreate.draftOrder;
      
      console.log('✅ Shopify final order created:', order.name);
      
      return {
        orderId: order.id,
        orderName: order.name,
        totalPrice: order.totalPrice,
        invoiceUrl: order.invoiceUrl
      };
    } catch (error) {
      console.error('❌ Error creating Shopify final order:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId) {
    try {
      const query = `
        query getDraftOrder($id: ID!) {
          draftOrder(id: $id) {
            id
            name
            status
            totalPrice
            invoiceUrl
            completedAt
            customer {
              email
              firstName
              lastName
            }
          }
        }
      `;

      const variables = { id: orderId };
      const result = await this.makeRequest(query, variables);
      
      return result.draftOrder;
    } catch (error) {
      console.error('❌ Error fetching Shopify order details:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const shopifyOrderService = new ShopifyOrderService();
