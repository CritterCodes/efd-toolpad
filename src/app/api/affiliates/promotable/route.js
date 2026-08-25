import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';

/**
 * GET /api/affiliates/promotable?q= — what an affiliate can point a campaign at.
 *
 * The gap this closes: a campaign's destination was a free-text URL field, so promoting
 * a specific ring meant knowing and hand-typing `/products/<id>`. In practice every
 * campaign pointed at the custom-request form because that was the default, and the
 * rest of the catalogue was effectively unpromotable.
 *
 * Returns SHOP-PUBLIC data only — the same published filter the storefront itself uses
 * (`status: 'published'` or `isPublic: true`), and only the fields needed to render a
 * picker row. Cost basis and internal notes are never projected: an affiliate is an
 * outside partner, and this endpoint is reachable by anyone with an affiliate profile.
 */

const STATIC_DESTINATIONS = [
  { id: 'custom-work', label: 'Custom work request', sublabel: 'The bespoke design intake form', path: '/custom-work/request', kind: 'page' },
  { id: 'repair', label: 'Jewelry repair', sublabel: 'Repair intake', path: '/repair', kind: 'page' },
  { id: 'products', label: 'All products', sublabel: 'The full shop', path: '/products', kind: 'page' },
  { id: 'collections', label: 'Collections', sublabel: 'Browse by collection', path: '/collections', kind: 'page' },
  { id: 'drops', label: 'Drops', sublabel: 'Current and upcoming drops', path: '/drops', kind: 'page' },
];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  // Affiliates and staff only — not every logged-in customer.
  const isStaff = ['admin', 'dev'].includes(session.user.role);
  if (!isStaff) {
    const affiliatesCol = await db.dbAffiliates();
    const affiliate = await affiliatesCol.findOne({ userId: session.user.userID });
    if (!affiliate) return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const rx = q ? { $regex: escapeRegex(q), $options: 'i' } : null;

  const dbi = await db.connect();
  const published = { $or: [{ status: 'published' }, { isPublic: true }] };
  const filter = rx
    ? { $and: [published, { $or: [{ title: rx }, { name: rx }, { productId: rx }] }] }
    : published;

  let products = [];
  try {
    products = await dbi.collection('products')
      .find(filter, {
        projection: {
          _id: 0, productId: 1, title: 1, name: 1, productType: 1,
          'pricing.retailPrice': 1, price: 1, images: 1,
        },
      })
      .sort({ 'publishing.publishedAt': -1, createdAt: -1 })
      .limit(40)
      .toArray();
  } catch (e) {
    console.error('[affiliates] promotable products lookup failed:', e.message);
  }

  const productRows = products
    .filter((p) => p.productId)
    .map((p) => ({
      id: p.productId,
      label: p.title || p.name || p.productId,
      sublabel: p.productType || 'Product',
      path: `/products/${p.productId}`,
      kind: 'product',
      price: p.pricing?.retailPrice ?? p.price ?? null,
      image: (Array.isArray(p.images) && p.images[0]) || null,
    }));

  const statics = q
    ? STATIC_DESTINATIONS.filter((d) => d.label.toLowerCase().includes(q.toLowerCase()))
    : STATIC_DESTINATIONS;

  return NextResponse.json({ success: true, data: { destinations: [...statics, ...productRows] } });
}
