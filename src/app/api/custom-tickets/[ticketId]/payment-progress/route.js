import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from '../../../../../../auth';

/**
 * GET /api/custom-tickets/[ticketId]/payment-progress
 * Get payment progress for a specific ticket
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = params;

    await db.connect();

    // Get the ticket
    const ticket = await db._instance
      .collection('customTickets')
      .findOne({ ticketID: ticketId });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get all invoices for this ticket
    const invoices = await db._instance
      .collection('invoices')
      .find({ ticketId: ticketId })
      .sort({ createdAt: 1 })
      .toArray();

    // Calculate payment progress
    const paidInvoices = invoices.filter(inv => inv.paidAt || inv.shopifyOrderStatus === 'paid');
    const pendingInvoices = invoices.filter(inv => !inv.paidAt && inv.shopifyOrderStatus !== 'paid');
    
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalInvoiced = totalPaid + totalPending;

    // Get project total from various sources
    const projectTotal = ticket.quote?.quoteTotal || ticket.quote?.totalAmount || ticket.estimatedPrice || 0;
    const paymentProgress = projectTotal > 0 ? (totalPaid / projectTotal) * 100 : 0;

    // Determine status
    const hasReached50Percent = paymentProgress >= 50;
    const isFullyPaid = paymentProgress >= 100;
    const remainingAmount = Math.max(0, projectTotal - totalPaid);
    const amountFor50Percent = Math.max(0, (projectTotal * 0.5) - totalPaid);

    return NextResponse.json({
      ticketId,
      projectTotal,
      totalPaid,
      totalPending,
      totalInvoiced,
      remainingAmount,
      paymentProgress: Number(paymentProgress.toFixed(1)),
      status: {
        isFullyPaid,
        hasReached50Percent,
        canStartProduction: hasReached50Percent && !isFullyPaid,
        amountFor50Percent: Number(amountFor50Percent.toFixed(2))
      },
      invoices: invoices.map(inv => ({
        _id: inv._id,
        type: inv.type,
        amount: inv.amount,
        status: inv.status,
        createdAt: inv.createdAt,
        paidAt: inv.paidAt,
        description: inv.description,
        shopifyOrderNumber: inv.shopifyOrderNumber,
        shopifyOrderUrl: inv.shopifyOrderUrl,
        shopifyOrderStatus: inv.shopifyOrderStatus,
        isPaid: !!(inv.paidAt || inv.shopifyOrderStatus === 'paid')
      }))
    });

  } catch (error) {
    console.error('Error getting payment progress:', error);
    return NextResponse.json(
      { error: 'Failed to get payment progress', message: error.message },
      { status: 500 }
    );
  }
}