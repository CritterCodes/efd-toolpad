import { NextResponse } from 'next/server';
import { CustomTicketService } from '@/services/customTicket.service';

export async function GET() {
  try {
    const summary = await CustomTicketService.getFinancialSummary({});
    
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
