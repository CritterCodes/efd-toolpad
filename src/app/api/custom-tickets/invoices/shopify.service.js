import { getShopifyConfig } from '@/utils/shopifyConfig';

export default class ShopifyInvoiceService {
  static async createShopifyInvoice(ticket, type, amount, customerEmail, description, projectTotal, totalPaid, newTotalPaid, paymentProgress, newPaymentProgress, willStartProduction) {
    const shopifyConfig = await getShopifyConfig();
    
    if (!shopifyConfig.enabled) {
      console.log('ℹ️ Shopify integration is disabled');
      return null;
    }

    console.log('🏪 Shopify is enabled, creating order...');

    const existingCustomer = await this._findCustomerByEmail(customerEmail, shopifyConfig);
    const fallbackAddress = this._getFallbackAddress(ticket, customerEmail);
    const customerShippingAddress = existingCustomer?.default_address || fallbackAddress;
    const customerBillingAddress = existingCustomer?.default_address || fallbackAddress;

    const baseTags = [`custom-design`, type, ticket.ticketID];
    const jewelryType = ticket.requestDetails?.jewelryType;
    if (jewelryType) {
      const jewelryTag = jewelryType.toLowerCase().replace(/\s+/g, '-');
      baseTags.push(jewelryTag);
      if (jewelryType.toLowerCase() === 'engagement ring') {
        baseTags.push('engagement-ring');
      }
    }
    const orderTags = baseTags.join(',');

    const orderData = {
      email: customerEmail,
      financial_status: 'pending',
      fulfillment_status: null,
      note: `Custom Design ${type} invoice for ticket ${ticket.ticketID}`,
      tags: orderTags,
      line_items: [{
        title: description ? `${ticket.title} - ${description}` : `${ticket.title} - ${type.charAt(0).toUpperCase() + type.slice(1)} Payment`,
        quantity: 1,
        price: amount.toString(),
        requires_shipping: false,
        taxable: true,
        tax_lines: [],
        sku: `CUSTOM-${type.toUpperCase()}-${ticket.ticketID}`,
        vendor: 'Engel Fine Design',
        product_id: null,
        variant_id: null
      }],
      tax_lines: [],
      taxes_included: false,
      total_tax: null,
      customer: existingCustomer ? { id: existingCustomer.id } : {
        email: customerEmail,
        first_name: fallbackAddress.first_name,
        last_name: fallbackAddress.last_name,
        phone: fallbackAddress.phone
      },
      shipping_address: customerShippingAddress,
      billing_address: customerBillingAddress,
      metafields: [
        { namespace: 'efd', key: 'ticket_id', value: ticket.ticketID, type: 'single_line_text_field' },
        { namespace: 'efd', key: 'invoice_type', value: type, type: 'single_line_text_field' }
      ]
    };

    return await this._createDraftOrderAndInvoice(orderData, customerEmail, ticket, type, amount, description, projectTotal, totalPaid, newTotalPaid, paymentProgress, newPaymentProgress, willStartProduction, shopifyConfig, jewelryType);
  }

  static async _findCustomerByEmail(email, config) {
    try {
      const url = `https://${config.storeUrl}/admin/api/${config.apiVersion}/customers/search.json?query=email:${encodeURIComponent(email)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': config.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.customers && data.customers.length > 0) {
          return data.customers[0];
        }
      }
    } catch (error) {
      console.error('⚠️ Error searching for customer:', error.message);
    }
    return null;
  }

  static _getFallbackAddress(ticket, email) {
    return {
      first_name: ticket.customerName?.split(' ')[0] || ticket.clientInfo?.name?.split(' ')[0] || 'Customer',
      last_name: ticket.customerName?.split(' ').slice(1).join(' ') || ticket.clientInfo?.name?.split(' ').slice(1).join(' ') || '',
      company: null,
      address1: '123 Digital Service',
      address2: null,
      city: 'Online',
      province: 'Digital',
      country: 'US',
      zip: '00000',
      phone: ticket.customerPhone || ticket.clientInfo?.phone || null
    };
  }

  static async _createDraftOrderAndInvoice(orderData, email, ticket, type, amount, description, projectTotal, totalPaid, newTotalPaid, paymentProgress, newPaymentProgress, willStartProduction, config, jewelryType) {
    console.log('📝 Creating draft order...');
    const url = `https://${config.storeUrl}/admin/api/${config.apiVersion}/draft_orders.json`;
    
    const draftResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ draft_order: orderData })
    });

    if (!draftResponse.ok) {
      const errorData = await draftResponse.json();
      throw new Error(`Draft order creation failed: ${JSON.stringify(errorData)}`);
    }

    const draftResult = await draftResponse.json();
    const draftOrder = draftResult.draft_order;

    const customMessage = this._generateInvoiceMessage(ticket.ticketID, type, amount, description, projectTotal, totalPaid, newTotalPaid, paymentProgress, newPaymentProgress, willStartProduction, jewelryType);
    
    const invoicePayload = {
      draft_order_invoice: {
        to: email,
        from: null,
        subject: `Invoice: Custom ${jewelryType || 'Design'} ${type.charAt(0).toUpperCase() + type.slice(1)} - ${ticket.ticketID}`,
        custom_message: customMessage,
        bcc: null
      }
    };

    const invoiceUrl = `https://${config.storeUrl}/admin/api/${config.apiVersion}/draft_orders/${draftOrder.id}/send_invoice.json`;
    
    // Try sending professional invoice
    let invoiceSuccess = await this._sendInvoiceWithRetry(invoiceUrl, invoicePayload, config);
    
    if (!invoiceSuccess) {
      console.log('🔄 Trying minimal invoice payload as last resort...');
      invoiceSuccess = await this._sendInvoiceWithRetry(invoiceUrl, { draft_order_invoice: { to: email } }, config, 2, 1000);
      
      if (!invoiceSuccess) {
        console.log('🔄 Final fallback: completing draft order directly...');
        const completeUrl = `https://${config.storeUrl}/admin/api/${config.apiVersion}/draft_orders/${draftOrder.id}/complete.json`;
        const completeResponse = await fetch(completeUrl, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': config.accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payment_pending: true }),
        });
        
        if (completeResponse.ok) {
          const completeResult = await completeResponse.json();
          if (completeResult.draft_order.order_id) {
            return {
              order: draftOrder,
              orderNumber: draftOrder.name,
              orderUrl: `https://${config.storeUrl}/admin/orders/${completeResult.draft_order.order_id}`
            };
          }
        }
      }
    }

    return {
      order: draftOrder,
      orderNumber: draftOrder.name,
      orderUrl: `https://${config.storeUrl}/admin/draft_orders/${draftOrder.id}`
    };
  }

  static async _sendInvoiceWithRetry(url, payload, config, retries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': config.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) return true;

      const errorText = await response.text();
      if (response.status === 422 && errorText.includes('not finished calculating')) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      return false;
    }
    return false;
  }

  static _generateInvoiceMessage(ticketId, type, amount, description, projectTotal, totalPaid, newTotalPaid, paymentProgress, newPaymentProgress, willStartProduction, jewelryType) {
    return `Thank you for choosing Engel Fine Design for your custom ${jewelryType || 'jewelry'} project.
This invoice is for your ${type} payment of $${amount} for ticket ${ticketId}.

${description ? `Project Details: ${description}` : ''}

Payment Progress:
• Total Project Value: $${projectTotal.toFixed(2)}
• Current Progress: ${paymentProgress.toFixed(1)}% paid ($${totalPaid.toFixed(2)})
• This Payment: $${parseFloat(amount).toFixed(2)}
• New Progress: ${newPaymentProgress.toFixed(1)}% ($${newTotalPaid.toFixed(2)})

${willStartProduction ?
  '🎉 Great news! This payment will reach 50% and we\'ll begin production of your custom piece!' :
  newPaymentProgress >= 100 ?
    '✅ This completes your payment! Your piece will be completed and ready soon.' :
    `Production will begin once we reach 50% payment (need $${(projectTotal * 0.5 - totalPaid).toFixed(2)} more).`
}

Please review and complete payment to proceed with your custom design. Once payment is received, we'll ${willStartProduction ? 'begin production of' : 'continue work on'} your piece.
If you have any questions, please don't hesitate to contact us.

Best regards,
The Engel Fine Design Team`;
  }
}