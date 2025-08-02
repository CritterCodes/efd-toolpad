import { NextResponse } from 'next/server';
import { CustomTicketService } from '@/services/customTicket.service';

export async function GET(request, { params }) {
  try {
    const ticketId = params.ticketId;
    const ticket = await CustomTicketService.fetchById(ticketId);
    
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Ticket not found' ? 404 : 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const ticketId = params.ticketId;
    const body = await request.json();
    
    const updatedTicket = await CustomTicketService.updateFinancials(ticketId, body);
    
    return NextResponse.json({ success: true, data: updatedTicket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.message === 'Ticket not found' ? 404 : 500 }
    );
  }
}
