import { NextResponse } from 'next/server';
import { CustomTicketService } from '@/services/customTicket.service';

export async function POST(request, { params }) {
  try {
    const ticketId = params.ticketId;
    const { orderType, orderId } = await request.json();
    
    if (!orderType || !orderId) {
      return NextResponse.json(
        { success: false, error: 'orderType and orderId are required' },
        { status: 400 }
      );
    }

    if (!['deposit', 'final'].includes(orderType)) {
      return NextResponse.json(
        { success: false, error: 'orderType must be either "deposit" or "final"' },
        { status: 400 }
      );
    }
    
    const updatedTicket = await CustomTicketService.linkShopifyOrder(ticketId, orderType, orderId);
    
    return NextResponse.json({ success: true, data: updatedTicket });
  } catch (error) {
    console.error('Error linking Shopify order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Ticket not found' ? 404 : 500 }
    );
  }
}
