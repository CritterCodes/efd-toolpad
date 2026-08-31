import { NextResponse } from 'next/server';
import { requireRepairsAccess, canTouchRepair } from '@/lib/apiAuth';
import { markQuoteSent, saveQuote } from '@/services/repairs/leadQuote';
import { sendQuoteEmail } from '@/services/repairs/notifyQuote';
import { db as database } from '@/lib/database';

export const dynamic = 'force-dynamic';

/** GET — the quote currently on this repair, if any. */
export async function GET(request, { params }) {
  const { session, errorResponse } = await requireRepairsAccess();
  if (errorResponse) return errorResponse;

  const { repairID } = await params;
  try {
    const db = await database.connect();
    const repair = await db
      .collection('repairs')
      // userID/createdBy fetched solely for the ownership check below.
      .findOne({ repairID }, { projection: { quote: 1, clientName: 1, clientEmail: 1, description: 1, userID: 1, createdBy: 1 } });
    if (!repair || !canTouchRepair(session, repair)) return NextResponse.json({ success: false, error: 'Repair not found.' }, { status: 404 });
    return NextResponse.json({ success: true, quote: repair.quote || null, repair });
  } catch (error) {
    console.error('quote fetch failed:', error);
    return NextResponse.json({ success: false, error: 'Could not load the quote.' }, { status: 500 });
  }
}

/**
 * POST — save a draft, or send it.
 * body: { action: 'save' | 'send', items, note }
 *
 * Send saves first so the customer can never be emailed a figure that differs
 * from what the jeweler had on screen.
 */
export async function POST(request, { params }) {
  const { session, errorResponse } = await requireRepairsAccess();
  if (errorResponse) return errorResponse;

  const { repairID } = await params;
  // Quotes are money: without this, any wholesaler login could draft or SEND a
  // quote on another business's repair. Ownership before the write.
  {
    const db = await database.connect();
    const owned = await db.collection('repairs').findOne({ repairID }, { projection: { userID: 1, createdBy: 1 } });
    if (!owned || !canTouchRepair(session, owned)) {
      return NextResponse.json({ success: false, error: 'Repair not found.' }, { status: 404 });
    }
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const action = String(body?.action || 'save');

  try {
    const quote = await saveQuote(repairID, {
      items: body?.items,
      submission: body?.submission,
      note: body?.note,
      createdBy: session?.user?.email || session?.user?.name || null,
    });

    if (action !== 'send') {
      return NextResponse.json({ success: true, quote });
    }

    const sent = await markQuoteSent(repairID);
    // Email is best-effort for the same reason appointment mail is: the quote is
    // saved and the link is live either way, and staff would rather be told to
    // phone than have the whole action fail.
    const notified = await sendQuoteEmail(repairID, sent);
    return NextResponse.json({ success: true, quote: sent, notified });
  } catch (error) {
    console.error(`quote ${action} failed:`, error?.message);
    return NextResponse.json({ success: false, error: error?.message || 'Failed.' }, { status: 400 });
  }
}
