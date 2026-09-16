import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as mongo } from '@/lib/database';
import { getUserArtisanTypes, canManageGemstones } from '@/lib/productPermissions';
import { toEditorShape, editorPiece } from '@/services/production/gemListingEditor';
import { randomUUID } from 'crypto';

/** The editor's single-line list fields are comma text; the documents hold arrays. */
const toList = (v) => (Array.isArray(v)
  ? v
  : (String(v ?? '').trim() ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []));

/**
 * List gemstone listings — resolved from DESIGNS, which is where they live now.
 *
 * This used to list `products` documents. efd-shop stopped reading that collection, so the
 * list showed a catalog the storefront could not see.
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
        category: 'gemstone',
        designID: { $exists: true },
        ...(isAdmin ? {} : { $or: [{ primaryArtisanId: { $in: ids } }, { createdBy: { $in: ids } }] }),
      })
      .sort({ createdAt: -1 })
      .toArray();

    // One query for every piece, then grouped — a find per design would be N+1 on a page that
    // only ever renders a list.
    const pieces = designs.length
      ? await db.collection('pieces').find({ designID: { $in: designs.map((d) => d.designID) } }).toArray()
      : [];
    const byDesign = new Map();
    for (const p of pieces) {
      if (!byDesign.has(p.designID)) byDesign.set(p.designID, []);
      byDesign.get(p.designID).push(p);
    }

    const gemstones = designs.map((design) => toEditorShape({
      design,
      piece: editorPiece(byDesign.get(design.designID) || []),
    }));

    return NextResponse.json({ success: true, gemstones });
  } catch (error) {
    console.error('GET /api/products/gemstones error:', error);
    return NextResponse.json({ error: 'Failed to fetch gemstones' }, { status: 500 });
  }
}

/**
 * Create a gemstone listing — a one-of-one DESIGN plus the physical PIECE.
 *
 * This used to insert a `products` document. A stone is a design (the cut, the species it is
 * offered in) and a piece (the actual stone, with its carat and its price); creating both here
 * is what makes it appear in the shop and in the cutter's My Designs.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.title || !data.species) {
      return NextResponse.json({ error: 'Title and species are required' }, { status: 400 });
    }

    const db = await mongo.connect();

    // Permission check fails CLOSED: only gem-cutters (and staff) may create gemstone
    // listings, and a profile we cannot read is a request we cannot authorize.
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
      if (!canManageGemstones(session.user.role, [])) {
        return NextResponse.json({ error: 'Could not verify permissions' }, { status: 503 });
      }
    }
    if (!canManageGemstones(session.user.role, getUserArtisanTypes(userProfile))) {
      return NextResponse.json(
        { error: 'Only gem-cutters and admins can create gemstone listings' },
        { status: 403 },
      );
    }

    const actor = session.user.userID || session.user.email;
    const artisanId = data.primaryArtisanId || actor;
    const now = new Date();
    const designID = randomUUID();
    const variantId = randomUUID();
    const pieceID = randomUUID();
    const handle = `gem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    // The cut is the design; the species is what that cut is offered in.
    await db.collection('designs').insertOne({
      designID,
      name: String(data.title).trim(),
      description: data.description || '',
      category: 'gemstone',
      status: 'ready',
      productionMethod: 'handmade',
      primaryArtisanId: artisanId,
      collaborators: [],
      gemstone: { cut: toList(data.cut), cutStyle: toList(data.cutStyle) },
      gemLinks: [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      metadata: {},
      internalNotes: data.internalNotes || data.notes || '',
      // A stone that exists is one stone: the edition is spent on it.
      edition: { type: 'one_of_one', allocated: 1, committed: 0, nextNumber: 2, freedNumbers: [] },
      defaultVariantId: variantId,
      variants: [{
        variantId,
        sku: data.sku || handle.toUpperCase(),
        label: String(data.title).trim(),
        active: true,
        gemstone: {
          species: String(data.species).trim(),
          subspecies: data.subspecies || '',
          naturalSynthetic: data.naturalSynthetic || 'natural',
          // A stone already cut is not offered to be cut again — it ships as it is.
          availability: 'special_request',
          caratMin: null, caratMax: null, colors: [],
        },
      }],
      // Unlisted until someone publishes it; the storefront reads this flag.
      listing: { published: false, visible: false, handle },
      media: { images: Array.isArray(data.images) ? data.images : [] },
      referenceImages: [],
      sketches: [],
      bom: { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
      routing: [],
      primaryProductId: handle,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    });

    // The physical stone: as-built facts and the price it sells for.
    await db.collection('pieces').insertOne({
      pieceID,
      designID,
      variantId,
      resolvedConfiguration: { species: String(data.species).trim(), naturalSynthetic: data.naturalSynthetic || 'natural' },
      editionNumber: 1,
      status: 'available',
      gemstone: {
        species: String(data.species).trim(),
        subspecies: data.subspecies || '',
        naturalSynthetic: data.naturalSynthetic || 'natural',
        carat: Number(data.carat) || null,
        dimensions: data.dimensions ?? null,
        color: toList(data.color),
        clarity: data.clarity || '',
        treatment: toList(data.treatment),
        locale: data.locale || '',
        certification: data.certification || null,
        // Admin-only provenance — the storefront's resolver strips this block.
        acquisitionPrice: Number(data.acquisitionPrice) || null,
        acquisitionDate: data.acquisitionDate || null,
        supplier: data.supplier || '',
      },
      pricing: {
        retailPrice: Number(data.retailPrice ?? data.price) || null,
        compareAtPrice: Number(data.compareAtPrice) || null,
      },
      stones: [],
      actualMaterials: [],
      workOrderIDs: [],
      accruedMaterialCost: 0,
      accruedLaborCost: 0,
      totalCOGS: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    });

    const design = await db.collection('designs').findOne({ designID });
    const piece = await db.collection('pieces').findOne({ pieceID });
    return NextResponse.json({
      success: true,
      gemstone: toEditorShape({ design, piece }),
      productId: handle,
      designID,
      pieceID,
    });
  } catch (error) {
    console.error('POST /api/products/gemstones error:', error);
    return NextResponse.json({ error: 'Failed to create gemstone', details: error.message }, { status: 500 });
  }
}
