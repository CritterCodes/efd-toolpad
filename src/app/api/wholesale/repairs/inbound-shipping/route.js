import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isOnsiteRepairOps } from '@/lib/apiAuth';
import { inboundReadiness, quoteInboundShipping, createInboundLabelOrder, inboundOrderStatus } from '@/services/shipping/inboundShipping';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400, FORBIDDEN: 403, BAD_GATEWAY: 502 };

/**
 * Inbound labels for wholesale stores, on EFD's EasyPost account, PAID UP FRONT.
 *
 *   GET  ?wholesalerId=            readiness + parcel presets
 *   GET  ?invoiceID=rinv-…         order status (paid? label ready?) — polled after checkout
 *   POST { action:'rates', parcelKey, saturdayDelivery }
 *   POST { action:'order', repairIDs, quote, rateId }   → { invoiceID } to pay via /api/wholesale/invoices/[id]/pay
 *
 * The label itself is bought by the Stripe webhook once the order invoice is paid
 * (services/shipping/inboundShipping.js fulfillPaidInboundLabel).
 * A wholesaler acts for their own store; admin / onsite repair ops may pass wholesalerId.
 */
async function resolveActor(req) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const role = session.user.role;
  const staff = ['admin', 'dev'].includes(role) || isOnsiteRepairOps(session);
  if (role !== 'wholesaler' && !staff) return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) };
  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const wholesalerUserID = role === 'wholesaler' ? session.user.userID : String(body.wholesalerId || url.searchParams.get('wholesalerId') || '').trim();
  return { session, body, url, wholesalerUserID };
}

function fail(error) {
  const status = CODE_STATUS[error.code] || (error.name === 'EasyPostError' ? 502 : 500);
  if (status === 500) console.error('inbound-shipping error:', error.message);
  return NextResponse.json({ error: error.message }, { status });
}

export const GET = async (req) => {
  const actor = await resolveActor(req);
  if (actor.error) return actor.error;
  try {
    const invoiceID = actor.url.searchParams.get('invoiceID');
    if (invoiceID) return NextResponse.json({ success: true, ...(await inboundOrderStatus({ invoiceID, session: actor.session })) });
    if (!actor.wholesalerUserID) return NextResponse.json({ error: 'wholesalerId is required.' }, { status: 400 });
    return NextResponse.json({ success: true, ...(await inboundReadiness({ wholesalerUserID: actor.wholesalerUserID })) });
  } catch (error) {
    return fail(error);
  }
};

export const POST = async (req) => {
  const actor = await resolveActor(req);
  if (actor.error) return actor.error;
  const { session, body, wholesalerUserID } = actor;
  if (!wholesalerUserID) return NextResponse.json({ error: 'wholesalerId is required.' }, { status: 400 });
  try {
    if (body.action === 'rates') {
      const quote = await quoteInboundShipping({ wholesalerUserID, parcelKey: body.parcelKey || '', saturdayDelivery: body.saturdayDelivery === true });
      return NextResponse.json({ success: true, ...quote });
    }
    if (body.action === 'order') {
      const order = await createInboundLabelOrder({ session, wholesalerUserID, repairIDs: Array.isArray(body.repairIDs) ? body.repairIDs : [], quote: body.quote, rateId: body.rateId });
      return NextResponse.json({ success: true, ...order });
    }
    return NextResponse.json({ error: 'action must be "rates" or "order".' }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
};
