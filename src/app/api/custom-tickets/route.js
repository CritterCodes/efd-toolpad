import { NextResponse } from 'next/server';
import { CustomTicketService } from '@/services/customTicket.service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {};
    if (searchParams.get('type')) filters.type = searchParams.get('type');
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('paymentReceived')) filters.paymentReceived = searchParams.get('paymentReceived') === 'true';
    if (searchParams.get('cardPaymentStatus')) filters.cardPaymentStatus = searchParams.get('cardPaymentStatus');
    if (searchParams.get('hasShopifyOrders')) filters.hasShopifyOrders = searchParams.get('hasShopifyOrders') === 'true';

    const tickets = await CustomTicketService.fetchAll(filters);
    
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error fetching custom tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
