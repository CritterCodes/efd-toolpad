import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import crypto from 'crypto';

/**
 * Shopify Order Webhook Handler
 * Handles order updates (payments, fulfillments, etc.)
 */
export async function POST(request) {
  console.log('🔔 Shopify order webhook received');

  try {
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');

    console.log('📋 Webhook details:', {
      topic,
      shop,
      hasHmac: !!hmacHeader,
      bodyLength: body.length
    });

    // TODO: Verify webhook signature for security
    // const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    // if (webhookSecret && hmacHeader) {
    //   const generatedHash = crypto
    //     .createHmac('sha256', webhookSecret)
    //     .update(body, 'utf8')
    //     .digest('base64');
    //   
    //   if (generatedHash !== hmacHeader) {
    //     console.error('❌ Invalid webhook signature');
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    //   }
    // }

    const orderData = JSON.parse(body);
    console.log('📦 Order data:', {
      id: orderData.id,
      name: orderData.name,
      email: orderData.email,
      financial_status: orderData.financial_status,
      fulfillment_status: orderData.fulfillment_status,
      tags: orderData.tags
    });

    // Check if this is a custom design order by looking for our ticket ID in tags
    const tags = orderData.tags ? orderData.tags.split(',').map(tag => tag.trim()) : [];
    const ticketTag = tags.find(tag => tag.startsWith('ticket-'));
    
    if (!ticketTag) {
      console.log('ℹ️ Not a custom design order, ignoring');
      return NextResponse.json({ status: 'ignored' });
    }

    const ticketId = ticketTag;
    console.log('🎫 Found ticket ID in tags:', ticketId);

    // Connect to database and update the ticket
    await db.connect();

    // Find the invoice record
    const invoice = await db._instance
      .collection('invoices')
      .findOne({ 
        ticketId: ticketId,
        shopifyOrderId: orderData.id.toString()
      });

    if (!invoice) {
      console.log('⚠️ Invoice not found for ticket:', ticketId);
      return NextResponse.json({ status: 'invoice_not_found' });
    }

    console.log('💰 Found invoice:', {
      invoiceId: invoice._id,
      type: invoice.type,
      amount: invoice.amount
    });

    // Update invoice with payment status
    const updateData = {
      shopifyOrderStatus: orderData.financial_status,
      shopifyFulfillmentStatus: orderData.fulfillment_status,
      paidAt: orderData.financial_status === 'paid' ? new Date() : null,
      updatedAt: new Date(),
      shopifyOrderData: {
        total_price: orderData.total_price,
        subtotal_price: orderData.subtotal_price,
        total_tax: orderData.total_tax,
        currency: orderData.currency,
        processed_at: orderData.processed_at
      }
    };

    await db._instance
      .collection('invoices')
      .updateOne(
        { _id: invoice._id },
        { $set: updateData }
      );

    console.log('✅ Invoice updated with payment status');

    // If order is paid, also update the ticket status
    if (orderData.financial_status === 'paid') {
      console.log('💳 Order is paid, updating ticket status...');

      // Update ticket payment status
      const ticketUpdate = {
        [`invoices.${invoice.type}.paidAt`]: new Date(),
        [`invoices.${invoice.type}.status`]: 'paid',
        updatedAt: new Date()
      };

      // If this is a deposit payment, mark the ticket as "in_progress"
      if (invoice.type === 'deposit') {
        ticketUpdate.status = 'in_progress';
        ticketUpdate.paymentStatus = 'deposit_paid';
      } else if (invoice.type === 'final') {
        ticketUpdate.paymentStatus = 'fully_paid';
      }

      await db._instance
        .collection('customTickets')
        .updateOne(
          { ticketId: ticketId },
          { $set: ticketUpdate }
        );

      console.log('✅ Ticket updated with payment status:', {
        ticketId,
        invoiceType: invoice.type,
        newStatus: ticketUpdate.status || 'unchanged',
        paymentStatus: ticketUpdate.paymentStatus
      });
    }

    return NextResponse.json({ 
      status: 'processed',
      ticketId,
      invoiceType: invoice.type,
      orderStatus: orderData.financial_status
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ 
    status: 'Shopify order webhook endpoint',
    timestamp: new Date().toISOString()
  });
}