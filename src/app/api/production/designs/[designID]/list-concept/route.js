import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { canManageDesign } from '@/lib/designPermissions';
import { db } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import { estimateDesignCost, gemstoneFromPrice, aggregateGemstoneSpec } from '@/services/production/designCost';
import { loadGemPricingInputs } from '@/services/production/gemPricing';
import { buildProductFromDesign, suggestedRetailFromCOGS, validateProductContract } from '@/services/products/productContract';

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

/** Staff, or the design's owning artisan in-category (for gemstone: the owning gem cutter). */
async function requireDesignAccess(designID) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return { errorResponse };
  const design = await DesignsModel.findById(designID);
  if (!design) return { errorResponse: NextResponse.json({ error: 'Design not found.' }, { status: 404 }) };
  if (!canManageDesign(session, design)) {
    return { errorResponse: NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 }) };
  }
  return { session, design };
}

/** The listing's seller identity — the design's primary artisan, so the cutter can publish it. */
async function sellerForDesign(dbInstance, design, artisanProfile = null) {
  const artisanId = design.primaryArtisanId || null;
  if (!artisanId) return null;
  const profile = artisanProfile
    || (await dbInstance.collection('users').findOne(
      { $or: [{ userID: artisanId }, { email: artisanId }] },
      { projection: { userID: 1, name: 1, artisanApplication: 1 } },
    ));
  return {
    userId: profile?.userID || artisanId,
    displayName: profile?.artisanApplication?.businessName || profile?.name || null,
    artisanType: profile?.artisanApplication?.artisanType || null,
  };
}

/**
 * POST /api/production/designs/[designID]/list-concept
 * List a Design (no finished Piece) as a draft product. Jewelry designs price off LIVE metal
 * rates (`pricing.costBasis` = estimated design cost); gemstone designs carry a computed
 * "from $X" floor (editor math: cost + shared costs, × markup) and the public gem spec.
 * Gated staff-or-owning-artisan (canManageDesign) — the gem cutter lists their own design.
 * Publish stays a separate, audited transition.
 */
export const POST = async (req, { params }) => {
  const { designID } = await params;
  const { session, design, errorResponse } = await requireDesignAccess(designID);
  if (errorResponse) return errorResponse;
  if (design.productID) {
    return NextResponse.json({ error: `Design is already listed as product ${design.productID}.` }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const { estCost, estimate } = await computeConceptEstCost(design, body);

  const dbInstance = await db.connect();
  const isGem = design.category === 'gemstone';
  const gemInputs = isGem ? await loadGemPricingInputs(dbInstance, design) : null;
  const seller = body.seller ?? (await sellerForDesign(dbInstance, design, gemInputs?.artisanProfile));

  const productDoc = buildProductFromDesign({
    design,
    estCost,
    opts: {
      ...body,
      seller,
      ...(isGem ? { gemPricing: { defaultMarkup: gemInputs.defaultMarkup, sharedCosts: gemInputs.sharedCosts } } : {}),
      createdBy: session.user.userID || session.user.email || '',
    },
  });

  // The draft is invisible to the shop until the audited publish transition, which enforces
  // the full contract — so contract gaps here (no images yet, unpriceable) are WARNINGS the
  // UI can surface, not a refusal to create the draft.
  const check = validateProductContract(productDoc);

  const now = new Date();
  const inserted = await dbInstance.collection('products').insertOne({ ...productDoc, createdAt: now, updatedAt: now });
  const updatedDesign = await DesignsModel.updateById(designID, { productID: productDoc.productId });

  return NextResponse.json(
    {
      product: { ...productDoc, _id: inserted.insertedId },
      design: updatedDesign,
      estimate,
      ...(check.valid ? {} : { contractWarnings: check.errors }),
    },
    { status: 201 },
  );
};

/**
 * PUT /api/production/designs/[designID]/list-concept  — refresh-price (M1-T3c).
 * Jewelry: re-runnable recompute of a still-`concept` product's `costBasis` + `retailPrice`
 * from CURRENT metal rates; refuses once the product has ripened (costBasisSource 'actual').
 * Gemstone: recomputes the "from $X" floor off the cutter's current rates and refreshes the
 * public gem spec (gem listings never ripen — the customer's carat prices each sale).
 */
export const PUT = async (req, { params }) => {
  const { designID } = await params;
  const { design, errorResponse } = await requireDesignAccess(designID);
  if (errorResponse) return errorResponse;
  if (!design.productID) {
    return NextResponse.json({ error: 'Design is not listed as a concept yet.' }, { status: 404 });
  }

  const dbInstance = await db.connect();
  const product = await dbInstance.collection('products').findOne({ productId: design.productID });
  if (!product) {
    return NextResponse.json({ error: 'The listed product no longer exists.' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  if (product.productType === 'gemstone') {
    const { defaultMarkup, sharedCosts } = await loadGemPricingInputs(dbInstance, design);
    const from = gemstoneFromPrice(design, { defaultMarkup, sharedCosts });
    const retailPrice = body.retailPrice ?? from;
    if (!(Number(retailPrice) > 0)) {
      return NextResponse.json({ error: 'Gemstone design has no priceable variant/tier.' }, { status: 422 });
    }
    await dbInstance.collection('products').updateOne(
      { productId: product.productId },
      {
        $set: {
          'pricing.retailPrice': retailPrice,
          'pricing.priceIsFrom': from != null && body.retailPrice == null,
          gemstone: aggregateGemstoneSpec(design),
          updatedAt: new Date(),
        },
      },
    );
    const updated = await dbInstance.collection('products').findOne({ productId: product.productId }, { projection: { _id: 0 } });
    return NextResponse.json({ product: updated, estimate: null }, { status: 200 });
  }

  if (product.productType !== 'jewelry' || product?.pricing?.costBasisSource === 'actual') {
    return NextResponse.json({ error: 'Product has been produced — its cost is actual and not refreshable.' }, { status: 409 });
  }

  const { estCost, estimate } = await computeConceptEstCost(design, body);
  const retailPrice = body.retailPrice ?? design.suggestedRetail ?? suggestedRetailFromCOGS(estCost);

  await dbInstance.collection('products').updateOne(
    { productId: product.productId },
    { $set: { 'pricing.costBasis': estCost, 'pricing.costBasisSource': 'estimated', 'pricing.retailPrice': retailPrice, updatedAt: new Date() } },
  );
  const updated = await dbInstance.collection('products').findOne({ productId: product.productId }, { projection: { _id: 0 } });

  return NextResponse.json({ product: updated, estimate }, { status: 200 });
};
