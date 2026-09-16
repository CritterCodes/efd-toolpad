import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';
import { getUserArtisanTypes, canManageJewelry } from '@/lib/productPermissions';
import { toEditorShape, editorPiece, applyEditorPatch } from '@/services/production/jewelryListingEditor';
import { CATALOG_JEWELRY } from '@/services/production/listingLookup';

/**
 * Jewelry listings — resolved from DESIGNS + PIECES, which is where they live now.
 *
 * This used to list and insert `products` documents. efd-shop stopped reading that collection,
 * so the list showed a catalog the storefront could not see and "create" made a doc nobody read.
 *
 * A catalog listing is a design owned by an artisan. Custom-order designs (which carry a
 * designerUserID and no primaryArtisanId) are a different thing and are deliberately excluded.
 */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = await mongo.connect();
    const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role);
    const ids = [session.user.userID, session.user.email].filter(Boolean);

    const designs = await db.collection('designs')
      .find({
        ...CATALOG_JEWELRY,
        ...(isAdmin ? {} : { $or: [{ primaryArtisanId: { $in: ids } }, { createdBy: { $in: ids } }] }),
      })
      .sort({ createdAt: -1 })
      .toArray();

    // One query for every piece, then grouped — a find per design would be N+1 on a list page.
    const pieces = designs.length
      ? await db.collection('pieces').find({ designID: { $in: designs.map((d) => d.designID) } }).toArray()
      : [];
    const byDesign = new Map();
    for (const p of pieces) {
      if (!byDesign.has(p.designID)) byDesign.set(p.designID, []);
      byDesign.get(p.designID).push(p);
    }

    const jewelry = designs.map((design) => toEditorShape({
      design,
      piece: editorPiece(byDesign.get(design.designID) || []),
    }));

    return NextResponse.json({ success: true, jewelry });
  } catch (error) {
    console.error('GET /api/products/jewelry error:', error);
    return NextResponse.json({ error: 'Failed to fetch jewelry' }, { status: 500 });
  }
}

/**
 * Create a jewelry listing — a DESIGN plus the PIECE that is the thing in the case.
 *
 * A made-to-order listing still gets a piece row: it is the first of the edition, and it is where
 * the metal, size and price of the first one made are recorded.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    const db = await mongo.connect();

    // Fails CLOSED: only jewelers (and staff) may create jewelry listings, and a profile we
    // cannot read is a request we cannot authorize.
    const isStaff = ['admin', 'superadmin', 'staff', 'dev'].includes(session.user.role);
    let userProfile = null;
    try {
      userProfile = await db.collection('users').findOne({
        $or: [
          ...(session.user.userID ? [{ userID: session.user.userID }] : []),
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
      if (!isStaff) {
        return NextResponse.json({ error: 'Could not verify permissions' }, { status: 503 });
      }
    }
    if (!canManageJewelry(session.user.role, getUserArtisanTypes(userProfile))) {
      return NextResponse.json(
        { error: 'Only jewelers and admins can create jewelry listings' },
        { status: 403 },
      );
    }

    const actor = session.user.userID || session.user.email;
    const artisanId = data.userId || data.primaryArtisanId || actor;
    const vendor = data.vendor
      || userProfile?.artisanApplication?.businessName
      || session.user.businessName
      || session.user.name
      || '';
    const now = new Date();
    const designID = randomUUID();
    const variantId = randomUUID();
    const pieceID = randomUUID();
    const handle = `jwl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const mto = data.madeToOrder === true || data.availability === 'made-to-order';

    const design = {
      designID,
      name: String(data.title || 'Untitled Jewelry').trim(),
      description: data.description || '',
      internalNotes: data.notes || '',
      category: data.type || null,
      status: 'ready',
      productionMethod: 'handmade',
      primaryArtisanId: artisanId,
      vendor,
      collaborators: [],
      attributes: {},
      tags: Array.isArray(data.tags) ? data.tags : [],
      metadata: {},
      gemLinks: [],
      // A one-off is a spent edition; a made-to-order listing can still be made.
      edition: mto
        ? { type: 'unlimited', allocated: 0, committed: 0, nextNumber: 1, freedNumbers: [] }
        : { type: 'one_of_one', allocated: 1, committed: 0, nextNumber: 2, freedNumbers: [] },
      defaultVariantId: variantId,
      variants: [{
        variantId,
        sku: data.sku || handle.toUpperCase(),
        label: String(data.title || 'Untitled Jewelry').trim(),
        active: true,
        options: {},
      }],
      // Unlisted until someone publishes it; the storefront reads this flag.
      listing: { published: false, visible: false, handle },
      media: { images: Array.isArray(data.images) ? data.images : [] },
      referenceImages: [],
      sketches: [],
      bom: { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
      routing: [],
      production: {},
      primaryProductId: handle,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    };

    const piece = {
      pieceID,
      designID,
      variantId,
      resolvedConfiguration: {},
      editionNumber: 1,
      sku: `${design.variants[0].sku}-01`,
      serialNumber: null,
      metalType: null,
      karat: null,
      finish: null,
      ringSize: null,
      dimensions: null,
      weight: null,
      stones: [],
      actualMaterials: [],
      workOrderIDs: [],
      status: 'available',
      accruedMaterialCost: 0,
      accruedLaborCost: 0,
      totalCOGS: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    };

    // The rest of the form is the same patch an edit would apply, so one mapping covers both and
    // the two paths cannot drift apart.
    const { designSet, pieceSet } = applyEditorPatch({ design, piece, data, actor });
    await db.collection('designs').insertOne(design);
    await db.collection('pieces').insertOne(piece);
    if (Object.keys(designSet).length) {
      await db.collection('designs').updateOne({ designID }, { $set: designSet });
    }
    if (Object.keys(pieceSet).length) {
      await db.collection('pieces').updateOne({ pieceID }, { $set: pieceSet });
    }

    const saved = await db.collection('designs').findOne({ designID });
    const savedPiece = await db.collection('pieces').findOne({ pieceID });
    return NextResponse.json({
      success: true,
      productId: handle,
      designID,
      pieceID,
      jewelry: toEditorShape({ design: saved, piece: savedPiece }),
    });
  } catch (error) {
    console.error('POST /api/products/jewelry error:', error);
    return NextResponse.json({ error: 'Failed to create jewelry', details: error.message }, { status: 500 });
  }
}
