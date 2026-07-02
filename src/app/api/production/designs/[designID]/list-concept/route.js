import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import { estimateDesignCost } from '@/services/production/designCost';
import { buildConceptFromDesign, suggestedRetailFromCOGS } from '@/services/products/productContract';

/** Read the live per-gram metal prices (24k gold / .999 silver basis). */
async function getMetalPrices() {
  const dbInstance = await db.connect();
  const doc = await dbInstance.collection('metalPrices').findOne({});
  return {
    gold: Number(doc?.gold) || 0,
    silver: Number(doc?.silver) || 0,
    platinum: Number(doc?.platinum) || 0,
    palladium: Number(doc?.palladium) || 0,
  };
}

/**
 * Estimated design cost from LIVE metal rates when we have a volume + a metal, else
 * the design's stored `estCost` (still an estimate → costBasisSource stays 'estimated').
 */
async function computeConceptEstCost(design, body = {}) {
  const metalKey = body.metalKey || design.metalOptions?.[0] || null;
  if (design.stlVolumeCm3 && metalKey) {
    const metalPrices = await getMetalPrices();
    try {
      const estimate = estimateDesignCost({
        stlVolumeCm3: design.stlVolumeCm3,
        metalKey,
        metalPrices,
        bom: design.bom || {},
        estLaborHours: body.estLaborHours ?? 0,
        laborRate: body.laborRate ?? 0,
      });
      return { estCost: estimate.estCost, estimate };
    } catch {
      // unknown metalKey etc. → fall through to the stored estCost
    }
  }
  return { estCost: Number(design.estCost) || 0, estimate: null };
}

/**
 * POST /api/production/designs/[designID]/list-concept
 * List a Design (no finished Piece) as a `concept` product priced off LIVE metal
 * rates. `pricing.costBasis` = the estimated design cost (`costBasisSource:'estimated'`);
 * it ripens to a `jewelry` product with actual COGS when a Piece is produced + linked
 * (handled in pieces `list-product`). Parallels pieces `list-product`; admin/dev gated.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (design.productID) {
    return NextResponse.json({ error: `Design is already listed as product ${design.productID}.` }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const { estCost, estimate } = await computeConceptEstCost(design, body);

  const productDoc = buildConceptFromDesign({
    design,
    estCost,
    opts: { ...body, createdBy: session.user.userID || session.user.email || '' },
  });

  const now = new Date();
  const dbInstance = await db.connect();
  await dbInstance.collection('products').insertOne({ ...productDoc, createdAt: now, updatedAt: now });
  const updatedDesign = await DesignsModel.updateById(designID, { productID: productDoc.productId });

  return NextResponse.json({ product: productDoc, design: updatedDesign, estimate }, { status: 201 });
};

/**
 * PUT /api/production/designs/[designID]/list-concept  — refresh-price (M1-T3c).
 * Re-runnable recompute of a still-`concept` product's `costBasis` + `retailPrice`
 * from CURRENT metal rates. Refuses once the product has ripened (costBasisSource
 * 'actual') — an actual-COGS listing is never overwritten by an estimate.
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!design.productID) {
    return NextResponse.json({ error: 'Design is not listed as a concept yet.' }, { status: 404 });
  }

  const dbInstance = await db.connect();
  const product = await dbInstance.collection('products').findOne({ productId: design.productID });
  if (!product || product.productType !== 'concept' || product?.pricing?.costBasisSource === 'actual') {
    return NextResponse.json({ error: 'Product has been produced — its cost is actual and not refreshable.' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const { estCost, estimate } = await computeConceptEstCost(design, body);
  const retailPrice = body.retailPrice ?? design.suggestedRetail ?? suggestedRetailFromCOGS(estCost);

  await dbInstance.collection('products').updateOne(
    { productId: product.productId },
    { $set: { 'pricing.costBasis': estCost, 'pricing.costBasisSource': 'estimated', 'pricing.retailPrice': retailPrice, updatedAt: new Date() } },
  );
  const updated = await dbInstance.collection('products').findOne({ productId: product.productId }, { projection: { _id: 0 } });

  return NextResponse.json({ product: updated, estimate }, { status: 200 });
};
