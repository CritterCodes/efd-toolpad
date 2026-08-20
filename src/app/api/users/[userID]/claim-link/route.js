import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { shopBase } from '@/lib/appUrls';

/**
 * POST /api/users/[userID]/claim-link — mint a shop account-claim link for a client
 * and hand it BACK to staff instead of emailing it.
 *
 * For clients whose email on file is a placeholder (test@test.com): the email invite
 * can't reach them, but their phone number is real — staff texts the link by hand.
 * The shop mints a userID-bound token (s2s, shared pricing key), so a shared
 * placeholder address can never claim the wrong account, and the claim page collects
 * their real email as part of setup. Manual texting by a human keeps this out of
 * TCPA territory — never automate SMS sends off this endpoint.
 */
export async function POST(request, { params }) {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { userID } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = body.reason === 'quote' ? 'quote' : 'account';

  const usersCol = await db.dbUsers();
  const user = await usersCol.findOne(
    { userID },
    { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, phoneNumber: 1, phone: 1, email: 1 } },
  );
  if (!user) return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });

  const key = process.env.EFD_PRICING_KEY;
  if (!key) return NextResponse.json({ success: false, error: 'EFD_PRICING_KEY is not configured.' }, { status: 503 });

  let data;
  try {
    const res = await fetch(`${shopBase()}/api/auth/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-efd-internal-key': key },
      body: JSON.stringify({ userID, reason, delivery: 'link' }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error || 'The shop could not mint a claim link.' }, { status: 502 });
    }
  } catch (e) {
    console.error('[claim-link] shop invite call failed:', e?.message || e);
    return NextResponse.json({ success: false, error: 'Could not reach the shop.' }, { status: 502 });
  }

  if (data.alreadyClaimed) {
    return NextResponse.json({ success: true, alreadyClaimed: true, url: null });
  }

  return NextResponse.json({
    success: true,
    url: data.url,
    needsEmail: !!data.needsEmail,
    expiresInDays: 7,
    clientName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    phone: user.phoneNumber || user.phone || null,
  });
}
