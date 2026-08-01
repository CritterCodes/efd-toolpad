import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { canAccessLeads } from '@/lib/repairAccess';
import { shopBase } from '@/lib/appUrls';

export const dynamic = 'force-dynamic';

/**
 * GET /api/funnel?days=7[&variant=wait][&includeTest=1]
 *
 * Proxies efd-shop's funnel report.
 *
 * A proxy rather than calling shop from the browser, for two reasons: the
 * shared secret must never reach a client bundle, and the session check belongs
 * on our side — shop has no idea who is logged into admin.
 */
export async function GET(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  if (!canAccessLeads(session)) {
    return NextResponse.json({ success: false, error: 'Not authorised.' }, { status: 403 });
  }

  const key = process.env.EFD_ADMIN_API_KEY;
  if (!key) {
    return NextResponse.json({ success: false, error: 'EFD_ADMIN_API_KEY is not set.' }, { status: 503 });
  }

  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams({ days: incoming.get('days') || '7' });
  if (incoming.get('variant')) params.set('variant', incoming.get('variant'));
  if (incoming.get('includeTest') === '1') params.set('includeTest', '1');

  try {
    const res = await fetch(`${shopBase().replace(/\/$/, '')}/api/funnel/report?${params}`, {
      headers: { 'x-efd-admin-key': key },
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return NextResponse.json(
        { success: false, error: json?.error || `Shop returned ${res.status}.` },
        { status: 502 }
      );
    }
    return NextResponse.json(json);
  } catch (error) {
    console.error('funnel proxy failed:', error?.message);
    return NextResponse.json({ success: false, error: 'Could not reach the shop.' }, { status: 502 });
  }
}
