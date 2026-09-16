import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';
import { toEditorShape, applyEditorPatch } from '@/services/production/gemListingEditor';
import { loadGemListing } from '@/services/production/listingLookup';

/**
 * The gemstone listing editor — now reading and writing the Design + its Piece.
 *
 * It used to read and write a `products` document. efd-shop stopped reading that collection,
 * so an edit here displayed back correctly in admin and reached the storefront never: a save
 * that looked like it worked and changed nothing a customer could see.
 *
 * The response keeps the flat shape the editor form already consumes, so the UI is unchanged.
 * See `services/production/gemListingEditor` for which field belongs to the offering (design)
 * and which to the physical stone (piece).
 */

const STAFF_ROLES = new Set(['admin', 'superadmin', 'dev', 'staff']);

/** Staff, or the artisan who owns the design. */
function canAccess(session, design) {
  if (STAFF_ROLES.has(session.user.role)) return true;
  const ids = [session.user.userID, session.user.email].filter(Boolean);
  return ids.includes(design.primaryArtisanId) || ids.includes(design.createdBy);
}

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = await mongo.connect();
    const { id } = await params;
    const { design, piece } = await loadGemListing(db, id);

    if (!design) return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
    if (!canAccess(session, design)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    return NextResponse.json({ success: true, gemstone: toEditorShape({ design, piece }) });
  } catch (error) {
    console.error('GET /api/products/gemstones/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch gemstone' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = await mongo.connect();
    const { id } = await params;
    const data = await request.json();
    const { design, piece } = await loadGemListing(db, id);

    if (!design) return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
    if (!canAccess(session, design)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const actor = session.user.userID || session.user.email || null;
    const { designSet, pieceSet, warnings } = applyEditorPatch({ design, piece, data, actor });

    // Dotted paths only — a whole-subdocument write would delete every key the form did not
    // send. The variant paths need an arrayFilter for the variant being edited.
    if (Object.keys(designSet).length) {
      const editsVariant = Object.keys(designSet).some((k) => k.startsWith('variants.$[v]'));
      const variantId = design.defaultVariantId
        || (design.variants || []).find((v) => v.active)?.variantId
        || (design.variants || [])[0]?.variantId;
      await db.collection('designs').updateOne(
        { designID: design.designID },
        { $set: { ...designSet, updatedAt: new Date() } },
        editsVariant ? { arrayFilters: [{ 'v.variantId': variantId }] } : {},
      );
    }
    if (piece && Object.keys(pieceSet).length) {
      await db.collection('pieces').updateOne(
        { pieceID: piece.pieceID },
        { $set: { ...pieceSet, updatedAt: new Date() } },
      );
    }

    const fresh = await loadGemListing(db, id);
    return NextResponse.json({
      success: true,
      gemstone: toEditorShape(fresh),
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (error) {
    console.error('PUT /api/products/gemstones/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update gemstone', details: error.message }, { status: 500 });
  }
}

/**
 * DELETE — unlist. The design and its piece are deliberately kept: a stone that came off the
 * site still exists in the drawer, and its provenance is the record of that.
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = await mongo.connect();
    const { id } = await params;
    const { design } = await loadGemListing(db, id);

    if (!design) return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
    if (!canAccess(session, design)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await db.collection('designs').updateOne(
      { designID: design.designID },
      { $set: { 'listing.published': false, 'listing.visible': false, updatedAt: new Date() } },
    );
    return NextResponse.json({ success: true, message: 'Gemstone unlisted (design and piece kept).' });
  } catch (error) {
    console.error('DELETE /api/products/gemstones/[id] error:', error);
    return NextResponse.json({ error: 'Failed to unlist gemstone' }, { status: 500 });
  }
}
