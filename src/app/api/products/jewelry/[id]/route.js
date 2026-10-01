import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';
import { canAccessListing, listingEditorRefusal } from '@/services/production/jewelryListingAccess';
import { toEditorShape, applyEditorPatch } from '@/services/production/jewelryListingEditor';
import { loadJewelryListing } from '@/services/production/listingLookup';

/**
 * The jewelry listing editor — now reading and writing the Design + its Piece.
 *
 * It used to read and write a `products` document. efd-shop stopped reading that collection, so
 * an edit here displayed back correctly in admin and reached the storefront never.
 *
 * The response keeps the nested shape the editor hook already consumes, so the UI is unchanged.
 * See `services/production/jewelryListingEditor` for which field belongs to the offering and
 * which to the physical piece.
 */

/** Staff, or the artisan who owns the design (shared with the upload routes). */
const canAccess = canAccessListing;

/** Non-staff editors must actually be jewelers. */
async function jewelerCheck(db, session) {
  const refusal = await listingEditorRefusal(db, session);
  return refusal ? NextResponse.json({ error: refusal }, { status: 403 }) : null;
}

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = await mongo.connect();
    const { id } = await params;
    const { design, piece } = await loadJewelryListing(db, id);

    if (!design) return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
    if (!canAccess(session, design)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    return NextResponse.json({ success: true, jewelry: toEditorShape({ design, piece }) });
  } catch (error) {
    console.error('GET /api/products/jewelry/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch jewelry' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = await mongo.connect();
    const { id } = await params;
    const data = await request.json();
    const { design, piece } = await loadJewelryListing(db, id);

    if (!design) return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
    if (!canAccess(session, design)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const denied = await jewelerCheck(db, session);
    if (denied) return denied;

    const actor = session.user.userID || session.user.email || null;
    const { designSet, pieceSet, warnings } = applyEditorPatch({ design, piece, data, actor });

    // Dotted paths only — a whole-subdocument write would delete every key the form did not send.
    if (Object.keys(designSet).length) {
      await db.collection('designs').updateOne(
        { designID: design.designID },
        { $set: { ...designSet, updatedAt: new Date() } },
      );
    }
    if (piece && Object.keys(pieceSet).length) {
      await db.collection('pieces').updateOne(
        { pieceID: piece.pieceID },
        { $set: { ...pieceSet, updatedAt: new Date() } },
      );
    }

    const fresh = await loadJewelryListing(db, id);
    return NextResponse.json({
      success: true,
      productId: fresh.design?.listing?.handle || design.primaryProductId || design.designID,
      jewelry: toEditorShape(fresh),
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (error) {
    console.error('PUT /api/products/jewelry/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update jewelry', details: error.message }, { status: 500 });
  }
}

/**
 * DELETE — unlist. The design and its piece are kept: a piece that came off the site is still in
 * the case, and its work orders, COGS and provenance hang off those records.
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const db = await mongo.connect();
    const { id } = await params;
    const { design } = await loadJewelryListing(db, id);

    if (!design) return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
    if (!canAccess(session, design)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const denied = await jewelerCheck(db, session);
    if (denied) return denied;

    await db.collection('designs').updateOne(
      { designID: design.designID },
      { $set: { 'listing.published': false, 'listing.visible': false, updatedAt: new Date() } },
    );
    return NextResponse.json({ success: true, message: 'Listing unlisted (design and piece kept).' });
  } catch (error) {
    console.error('DELETE /api/products/jewelry/[id] error:', error);
    return NextResponse.json({ error: 'Failed to unlist jewelry' }, { status: 500 });
  }
}
