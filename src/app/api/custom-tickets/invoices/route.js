/**
 * Custom Ticket Invoices API
 * Handles invoice creation and Shopify order integration
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import { getShopifyConfig } from '@/utils/shopifyConfig';

/**
 * POST /api/custom-tickets/invoices
 * Create a new invoice and Shopify order
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      ticketId,
      type,
      amount,
      customerEmail,
      description,
      quoteData,
      isPartialPayment = false,
      projectTotalAmount = null
    } = await request.json();

    // Validate required fields
    if (!ticketId || !type || !amount || !customerEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: ticketId, type, amount, customerEmail' 
      }, { status: 400 });
    }

    // Validate payment type - now supports partial payments
    const validTypes = ['deposit', 'progress', 'final', 'partial'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: `Invalid payment type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    await db.connect();

    // Get the ticket
    const ticket = await db._instance
      .collection('customTickets')
      .findOne({ ticketID: ticketId });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    console.log('🎫 Processing payment for ticket:', {
      ticketId,
      type,
      amount: parseFloat(amount),
      isPartialPayment
    });

    // Get existing invoices for this ticket to calculate payment progress
    const existingInvoices = await db._instance
      .collection('invoices')
      .find({ ticketId: ticketId })
      .toArray();

    console.log('💰 Existing invoices:', {
      count: existingInvoices.length,
      invoices: existingInvoices.map(inv => ({
        type: inv.type,
        amount: inv.amount,
        status: inv.status,
        paidAt: inv.paidAt
      }))
    });

    // Calculate payment progress
    const paidInvoices = existingInvoices.filter(inv => inv.paidAt || inv.shopifyOrderStatus === 'paid');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const projectTotal = projectTotalAmount || ticket.quote?.totalAmount || ticket.estimatedPrice || 0;
    const paymentProgress = projectTotal > 0 ? (totalPaid / projectTotal) * 100 : 0;

    console.log('📊 Payment progress:', {
      totalPaid,
      projectTotal,
      paymentProgress: `${paymentProgress.toFixed(1)}%`,
      newPaymentAmount: parseFloat(amount)
    });

    // Determine if this payment will trigger production start (50% threshold)
    const newTotalPaid = totalPaid + parseFloat(amount);
    const newPaymentProgress = projectTotal > 0 ? (newTotalPaid / projectTotal) * 100 : 0;
    const willStartProduction = paymentProgress < 50 && newPaymentProgress >= 50;

    console.log('🏭 Production status check:', {
      currentProgress: `${paymentProgress.toFixed(1)}%`,
      newProgress: `${newPaymentProgress.toFixed(1)}%`,
      willStartProduction,
      productionThreshold: '50%'
    });

    // Option to use draft orders for better invoice control
    const useDraftOrders = true; // Professional invoices with write_draft_orders permission
    
    // Get Shopify configuration
    let shopifyOrder = null;
    let shopifyOrderNumber = null;
    let shopifyOrderUrl = null;

    console.log('🔄 Starting Shopify integration attempt...');

    try {
      console.log('📡 Getting Shopify configuration...');
      const shopifyConfig = await getShopifyConfig();
      console.log('✅ Shopify config retrieved:', {
        enabled: shopifyConfig.enabled,
        storeUrl: shopifyConfig.storeUrl,
        hasAccessToken: !!shopifyConfig.accessToken,
        apiVersion: shopifyConfig.apiVersion
      });
      
      if (shopifyConfig.enabled) {
        console.log('🏪 Shopify is enabled, creating order...');
        
        // First, try to find existing customer by email
        let existingCustomer = null;
        let customerShippingAddress = null;
        let customerBillingAddress = null;
        
        try {
          console.log('👤 Looking up existing customer by email:', customerEmail);
          const customerSearchUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/customers/search.json?query=email:${encodeURIComponent(customerEmail)}`;
          
          const customerResponse = await fetch(customerSearchUrl, {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': shopifyConfig.accessToken,
              'Content-Type': 'application/json',
            },
          });

          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            if (customerData.customers && customerData.customers.length > 0) {
              existingCustomer = customerData.customers[0];
              customerShippingAddress = existingCustomer.default_address;
              customerBillingAddress = existingCustomer.default_address;
              
              console.log('✅ Found existing customer:', {
                id: existingCustomer.id,
                email: existingCustomer.email,
                name: `${existingCustomer.first_name} ${existingCustomer.last_name}`,
                hasAddress: !!customerShippingAddress
              });
            } else {
              console.log('ℹ️ No existing customer found with email:', customerEmail);
            }
          } else {
            console.log('⚠️ Customer search failed:', customerResponse.status);
          }
        } catch (customerError) {
          console.error('⚠️ Error searching for customer:', customerError.message);
        }

        // Fallback address if customer doesn't exist or has no address
        const fallbackAddress = {
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

        // Prepare tags based on jewelry type
        const baseTags = [`custom-design`, type, ticketId];
        
        // Add jewelry type tag if available
        const jewelryType = ticket.requestDetails?.jewelryType;
        if (jewelryType) {
          // Convert jewelry type to tag format (lowercase, spaces to hyphens)
          const jewelryTag = jewelryType.toLowerCase().replace(/\s+/g, '-');
          baseTags.push(jewelryTag);
          
          // Special case: if jewelry type is "Engagement Ring", also add "engagement-ring" tag
          if (jewelryType.toLowerCase() === 'engagement ring') {
            baseTags.push('engagement-ring');
          }
          
          console.log('🏷️ Adding jewelry type tags:', {
            originalType: jewelryType,
            jewelryTag: jewelryTag,
            isEngagementRing: jewelryType.toLowerCase() === 'engagement ring'
          });
        }

        const orderTags = baseTags.join(',');
        console.log('🏷️ Final order tags:', orderTags);

        // Create Shopify order
        const orderData = {
          email: customerEmail,
          financial_status: 'pending',
          fulfillment_status: null,
          send_receipt: true,  // Send order confirmation email
          send_fulfillment_receipt: false,
          send_invoice: true,  // Send invoice email to customer
          note: `Custom Design ${type} invoice for ticket ${ticketId}`,
          tags: orderTags,
          line_items: [
            {
              title: description 
                ? `${ticket.title} - ${description}`
                : `${ticket.title} - ${type.charAt(0).toUpperCase() + type.slice(1)} Payment`,
              quantity: 1,
              price: amount.toString(),
              requires_shipping: false,
              taxable: true,
              tax_lines: [], // Let Shopify calculate taxes automatically
              sku: `CUSTOM-${type.toUpperCase()}-${ticketId}`,
              vendor: 'Engel Fine Design',
              product_id: null, // Custom line item
              variant_id: null  // Custom line item
            }
          ],
          tax_lines: [], // Let Shopify calculate taxes based on address
          taxes_included: false, // Taxes are additional to the price
          total_tax: null, // Let Shopify calculate
          customer: existingCustomer ? {
            id: existingCustomer.id // Link to existing customer
          } : {
            email: customerEmail,
            first_name: ticket.customerName?.split(' ')[0] || ticket.clientInfo?.name?.split(' ')[0] || 'Customer',
            last_name: ticket.customerName?.split(' ').slice(1).join(' ') || ticket.clientInfo?.name?.split(' ').slice(1).join(' ') || '',
            phone: ticket.customerPhone || ticket.clientInfo?.phone || null
          },
          // Use customer's existing address or fallback
          shipping_address: customerShippingAddress || fallbackAddress,
          billing_address: customerBillingAddress || fallbackAddress,
          metafields: [
            {
              namespace: 'efd',
              key: 'ticket_id',
              value: ticketId,
              type: 'single_line_text_field'
            },
            {
              namespace: 'efd',
              key: 'invoice_type',
              value: type,
              type: 'single_line_text_field'
            }
          ]
        };

        console.log('📦 Order data prepared:', {
          customerEmail: orderData.email,
          amount: orderData.line_items[0].price,
          customer: orderData.customer,
          sendInvoice: orderData.send_invoice,
          sendReceipt: orderData.send_receipt
        });

        const shopifyApiUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/orders.json`;
        console.log('🌐 Making request to:', shopifyApiUrl);

        let shopifyResponse;
        
        if (useDraftOrders) {
          // Create draft order first, then send invoice
          console.log('📝 Creating draft order for professional invoice...');
          const draftOrderUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/draft_orders.json`;
          
          // Remove properties not supported by draft orders
          const draftOrderData = {
            ...orderData,
            // Draft orders don't support these properties
            send_receipt: undefined,
            send_invoice: undefined,
            send_fulfillment_receipt: undefined
          };
          
          shopifyResponse = await fetch(draftOrderUrl, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': shopifyConfig.accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ draft_order: draftOrderData }),
          });
          
          console.log('📡 Draft order response status:', shopifyResponse.status);
          
          if (shopifyResponse.ok) {
            const draftResult = await shopifyResponse.json();
            const draftOrder = draftResult.draft_order;
            
            console.log('📝 Draft order created:', {
              id: draftOrder.id,
              name: draftOrder.name,
              total_price: draftOrder.total_price
            });
            
            // Send invoice for the draft order
            console.log('📧 Sending professional invoice...');
            const invoiceUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/draft_orders/${draftOrder.id}/send_invoice.json`;
            
            console.log('🔍 Invoice URL:', invoiceUrl);
            console.log('🔍 Customer email:', customerEmail);
            
            const customMessage = `Thank you for choosing Engel Fine Design for your custom ${jewelryType || 'jewelry'} project.

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

            // Try the correct Shopify API format for sending draft order invoices
            const invoicePayload = {
              draft_order_invoice: {
                to: customerEmail,
                from: null, // Let Shopify use default
                subject: `Invoice: Custom ${jewelryType || 'Design'} ${type.charAt(0).toUpperCase() + type.slice(1)} - ${ticketId}`,
                custom_message: customMessage,
                bcc: null
              }
            };
            
            console.log('📤 Invoice payload:', JSON.stringify(invoicePayload, null, 2));

            // Function to send invoice with retry for calculation delay
            const sendInvoiceWithRetry = async (url, payload, retries = 3, delay = 2000) => {
              for (let attempt = 1; attempt <= retries; attempt++) {
                console.log(`📧 Invoice attempt ${attempt}/${retries}...`);
                
                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'X-Shopify-Access-Token': shopifyConfig.accessToken,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload),
                });
                
                console.log(`📡 Invoice attempt ${attempt} response status:`, response.status);
                
                if (response.ok) {
                  const result = await response.json();
                  console.log(`✅ Invoice sent successfully on attempt ${attempt}:`, result);
                  return { success: true, result };
                }
                
                const errorText = await response.text();
                console.log(`❌ Invoice attempt ${attempt} failed:`, {
                  status: response.status,
                  error: errorText
                });
                
                // Check if it's the "still calculating" error
                if (response.status === 422 && errorText.includes('not finished calculating')) {
                  console.log(`⏳ Order still calculating, waiting ${delay}ms before retry ${attempt + 1}...`);
                  if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                  }
                }
                
                return { success: false, status: response.status, error: errorText };
              }
            };

            const invoiceResult = await sendInvoiceWithRetry(invoiceUrl, invoicePayload);
            
            if (invoiceResult.success) {
              console.log('✅ Professional invoice sent successfully:', {
                to: customerEmail,
                result: invoiceResult.result
              });
            } else {
              console.error('❌ All invoice attempts failed:', {
                status: invoiceResult.status,
                error: invoiceResult.error,
                url: invoiceUrl
              });
              
              // Try a minimal invoice payload as last resort
              console.log('🔄 Trying minimal invoice payload as last resort...');
              const minimalPayload = {
                draft_order_invoice: {
                  to: customerEmail
                }
              };
              
              const simpleResult = await sendInvoiceWithRetry(invoiceUrl, minimalPayload, 2, 1000);
              
              if (simpleResult.success) {
                console.log('✅ Simple invoice sent successfully:', simpleResult.result);
              } else {
                console.error('❌ Simple invoice also failed after retries:', {
                  status: simpleResult.status,
                  error: simpleResult.error
                });
                
                // Final fallback: Complete the draft order to create a regular order
                console.log('🔄 Final fallback: completing draft order to create order with automatic notification...');
                const completeUrl = `https://${shopifyConfig.storeUrl}/admin/api/${shopifyConfig.apiVersion}/draft_orders/${draftOrder.id}/complete.json`;
                
                const completeResponse = await fetch(completeUrl, {
                  method: 'PUT',
                  headers: {
                    'X-Shopify-Access-Token': shopifyConfig.accessToken,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    payment_pending: true  // This creates an order that requires payment
                  }),
                });
                
                console.log('📡 Complete draft order response:', completeResponse.status);
                
                if (completeResponse.ok) {
                  const completeResult = await completeResponse.json();
                  console.log('✅ Draft order completed to pending payment order:', {
                    orderId: completeResult.draft_order.order_id,
                    status: completeResult.draft_order.status
                  });
                  
                  // Update our tracking to point to the new order
                  if (completeResult.draft_order.order_id) {
                    shopifyOrderUrl = `https://${shopifyConfig.storeUrl}/admin/orders/${completeResult.draft_order.order_id}`;
                    console.log('📋 Updated order URL to regular order:', shopifyOrderUrl);
                  }
                } else {
                  const completeError = await completeResponse.text();
                  console.error('❌ Failed to complete draft order:', completeError);
                }
              }
            }
            
            // Set the order details for response
            shopifyOrder = draftOrder;
            shopifyOrderNumber = draftOrder.name;
            shopifyOrderUrl = `https://${shopifyConfig.storeUrl}/admin/draft_orders/${draftOrder.id}`;
            
            console.log('✅ Draft order process completed');
          } else {
            const errorData = await shopifyResponse.json();
            console.error('❌ Draft order creation failed:', errorData);
            throw new Error(`Draft order creation failed: ${JSON.stringify(errorData)}`);
          }
        } else {
          throw new Error('Draft orders are disabled - this should not happen');
        }

        console.log('📡 Final Shopify response status:', shopifyResponse?.status || 'draft_order_processed');

        if (shopifyOrder) {
          console.log('✅ Draft order and invoice processed successfully:', {
            draftOrderId: shopifyOrder.id,
            draftOrderName: shopifyOrderNumber,
            amount: amount,
            url: shopifyOrderUrl,
            professionalInvoiceSent: true
          });
        } else {
          const errorData = shopifyResponse?.ok === false ? await shopifyResponse.json() : null;
          console.error('❌ Draft order creation failed:', {
            status: shopifyResponse?.status,
            statusText: shopifyResponse?.statusText,
            error: errorData
          });
          throw new Error('Failed to create draft order and send invoice');
        }
      } else {
        console.log('ℹ️ Shopify integration is disabled');
      }
    } catch (shopifyError) {
      console.error('⚠️ Shopify integration error:', {
        message: shopifyError.message,
        stack: shopifyError.stack
      });
      // Continue without Shopify order - we'll still create the local invoice
    }

    // Create invoice record with payment progress tracking
    const invoice = {
      ticketId,
      type,
      amount: parseFloat(amount),
      description,
      customerEmail,
      createdAt: new Date(),
      status: shopifyOrder ? 'pending_payment' : 'created',
      shopifyOrderId: shopifyOrder?.id?.toString() || null,
      shopifyOrderNumber: shopifyOrderNumber,
      shopifyOrderUrl: shopifyOrderUrl,
      shopifyOrderStatus: shopifyOrder?.financial_status || null,
      shopifyFulfillmentStatus: shopifyOrder?.fulfillment_status || null,
      isDraftOrder: useDraftOrders && !!shopifyOrder,
      invoiceMethod: useDraftOrders ? 'draft_order_invoice' : 'order_with_invoice',
      // Payment progress tracking
      paymentProgress: {
        projectTotal: projectTotal,
        previousPaid: totalPaid,
        thisPayment: parseFloat(amount),
        newTotalPaid: newTotalPaid,
        progressPercentage: newPaymentProgress,
        willTriggerProduction: willStartProduction
      },
      isPartialPayment
    };

    const result = await db._instance.collection('invoices').insertOne(invoice);

    if (!result.acknowledged || !result.insertedId) {
      return NextResponse.json({ error: 'Failed to create invoice record' }, { status: 500 });
    }

    // Add the invoice ID to the ticket's invoices array
    const invoiceId = result.insertedId;
    const ticketUpdateResult = await db._instance.collection('customTickets').updateOne(
      { ticketID: ticketId },
      { 
        $push: { 
          invoices: {
            _id: invoiceId,
            type: type,
            amount: parseFloat(amount),
            description: description,
            createdAt: new Date(),
            status: invoice.status,
            shopifyOrderNumber: shopifyOrderNumber,
            shopifyOrderUrl: shopifyOrderUrl,
            shopifyOrderId: shopifyOrder?.id?.toString() || null
          }
        }
      }
    );

    if (!ticketUpdateResult.acknowledged) {
      console.warn('⚠️ Failed to update ticket with invoice reference');
    }

    // Log the invoice creation
    console.log('✅ Invoice created:', {
      ticketId: ticketId,
      invoiceId: invoiceId,
      invoiceType: type,
      amount: amount,
      shopifyOrderNumber: shopifyOrderNumber,
      hasShopifyOrder: !!shopifyOrder,
      ticketUpdated: ticketUpdateResult.acknowledged
    });

    const successMessage = shopifyOrder 
      ? `Invoice created with Shopify order #${shopifyOrderNumber}`
      : 'Invoice created locally (Shopify integration not configured or failed)';

    return NextResponse.json({
      success: true,
      invoice: invoice,
      shopifyOrderNumber: shopifyOrderNumber,
      shopifyOrderUrl: shopifyOrderUrl,
      message: successMessage
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/custom-tickets/invoices?ticketId=xxx
 * Get invoices for a specific ticket
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId parameter is required' }, { status: 400 });
    }

    await db.connect();

    // Get the ticket with invoices
    const ticket = await db._instance
      .collection('customTickets')
      .findOne(
        { ticketID: ticketId },
        { projection: { invoices: 1, ticketID: 1 } }
      );

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoices: ticket.invoices || []
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}