/**
 * POST /api/push/subscribe   — register a browser PushSubscription for the authed admin user.
 * DELETE /api/push/subscribe — remove a subscription by endpoint.
 *
 * Auth: NextAuth session (admins + artisans who log into admin). Owner = session.user.userID
 * (the canonical id that lib/webPush.sendPushToUser and the notifications collection key on).
 * Subscriptions live in the SHARED `pushSubscriptions` collection (same pool as efd-shop).
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database.js';

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.userID) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sub = body.subscription || body;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
  }

  try {
    const db = await mongo.connect();
    const now = new Date();
    await db.collection('pushSubscriptions').updateOne(
      { endpoint: sub.endpoint },
      {
        $set: {
          userID: session.user.userID,
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          expirationTime: sub.expirationTime ?? null,
          userAgent: request.headers.get('user-agent') || null,
          origin: 'efd-admin',
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push] subscribe error:', error.message);
    return NextResponse.json({ error: 'Failed to save subscription.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.userID) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const endpoint = body.endpoint || body.subscription?.endpoint;
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 });

  try {
    const db = await mongo.connect();
    await db.collection('pushSubscriptions').deleteOne({ endpoint, userID: session.user.userID });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push] unsubscribe error:', error.message);
    return NextResponse.json({ error: 'Failed to remove subscription.' }, { status: 500 });
  }
}
