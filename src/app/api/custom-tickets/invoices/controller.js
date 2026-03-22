import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import CustomTicketInvoicesService from './service.js';

export default class CustomTicketInvoicesController {
  static async createInvoice(request) {
    try {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const invoiceData = await request.json();

      // Validate required fields
      if (!invoiceData.ticketId || !invoiceData.type || !invoiceData.amount || !invoiceData.customerEmail) {
        return NextResponse.json({
          error: 'Missing required fields: ticketId, type, amount, customerEmail'
        }, { status: 400 });
      }

      const validTypes = ['deposit', 'progress', 'final', 'partial'];
      if (!validTypes.includes(invoiceData.type)) {
        return NextResponse.json({
          error: `Invalid payment type. Must be one of: ${validTypes.join(', ')}`
        }, { status: 400 });
      }

      const result = await CustomTicketInvoicesService.createInvoice(invoiceData);
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Create invoice error:', error);
      const status = error.status || 500;
      return NextResponse.json({
        error: error.message || 'Internal server error',
        details: error.message
      }, { status });
    }
  }

  static async getInvoices(request) {
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

      const result = await CustomTicketInvoicesService.getInvoices(ticketId);
      
      return NextResponse.json({
        success: true,
        invoices: result.invoices
      });
    } catch (error) {
      console.error('Get invoices error:', error);
      const status = error.status || 500;
      return NextResponse.json({
        error: error.message || 'Internal server error',
        details: error.message
      }, { status });
    }
  }
}
