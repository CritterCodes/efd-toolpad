import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserArtisanTypes, canManageJewelry } from '@/lib/productPermissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role);

    let jewelry;
    if (isAdmin) {
      jewelry = await db.collection('products').find({ productType: 'jewelry' }).toArray();
    } else {
      const userIdentifier = session.user.userID || session.user.email;
      jewelry = await db.collection('products').find({
        productType: 'jewelry',
        $or: [
          { userId: userIdentifier },
          { userId: session.user.email },
          { userId: session.user.userID },
        ],
      }).toArray();
    }

    // Migrate jewelry that don't have productId yet
    for (const item of jewelry) {
      if (!item.productId) {
        const productId = `jwl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        await db.collection('products').updateOne(
          { _id: item._id },
          { $set: { productId } }
        );
        item.productId = productId;
      }
    }

    return NextResponse.json({ success: true, jewelry: jewelry || [] });
  } catch (error) {
    console.error('GET /api/products/jewelry error:', error);
    return NextResponse.json({ error: 'Failed to fetch jewelry' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();

    const {
      title,
      description,
      notes,
      type,
      material,
      metalColor,
      purity,
      weight,
      size,
      price,
      compareAtPrice,
      costBasis,
      status,
      availability,
      classification,
      images,
      customMounting,
      vendor,
      madeToOrder,
      metals,
      gemstoneLineItems,
      castingRequired,
      estimatedLeadTimeDays,
      productionNotes,
      // Ring Specifics
      ringSize,
      canBeSized,
      sizingRangeUp,
      sizingRangeDown,
      // Pendant Specifics
      chainIncluded,
      chainMaterial,
      chainLength,
      chainStyle,
      // Bracelet Specifics
      length,
      claspType,
      // General
      dimensions,
      tags,
      ...otherData
    } = data;

    const { db } = await connectToDatabase();

    const actualUserId = session.user.userID || session.user.email;
    let actualVendor = vendor || session.user.businessName || session.user.name || '';
    let artisanType = null;

    // Fetch user profile for artisanType + businessName
    if (session.user.email) {
      try {
        const userProfile = await db.collection('users').findOne({ email: session.user.email });
        if (userProfile?.artisanApplication?.businessName && !actualVendor) {
          actualVendor = userProfile.artisanApplication.businessName;
        }
        artisanType = userProfile?.artisanApplication?.artisanType || null;

        const artisanTypes = getUserArtisanTypes(userProfile);
        if (!canManageJewelry(session.user.role, artisanTypes)) {
          return NextResponse.json(
            { error: 'Only jewelers and admins can create jewelry listings' },
            { status: 403 }
          );
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    }

    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const productId = `jwl_${timestamp}_${randomStr}`;
    const now = new Date();
    const canonicalRetailPrice = parseFloat(price) || 0;
    const isMadeToOrder = madeToOrder || availability === 'made-to-order' || false;

    // Build metals array — V2 canonical; fall back to flat fields for single metal
    const metalsArray = Array.isArray(metals) && metals.length > 0
      ? metals
      : [{ type: material || '', color: metalColor || '', purity: purity || '', weight: weight || 0 }];

    // Extract gemstoneIds from line items for V2 references
    const referencedGemstoneIds = Array.isArray(gemstoneLineItems)
      ? gemstoneLineItems.map((g) => g.gemstoneId).filter(Boolean)
      : [];

    const newJewelry = {
      productId,
      productType: 'jewelry',
      listingType: isMadeToOrder ? 'made-to-order' : 'finished',

      title: title || 'Untitled Jewelry',
      description: description || '',
      notes: notes || '',

      // V2 seller
      seller: {
        userId: actualUserId,
        displayName: actualVendor,
        artisanType,
      },

      // V2 pricing
      pricing: {
        retailPrice: canonicalRetailPrice,
        compareAtPrice: parseFloat(compareAtPrice) || null,
        costBasis: parseFloat(costBasis) || null,
        currency: 'USD',
      },

      // V2 publishing
      publishing: {
        visible: false,
        featured: false,
        publishedAt: null,
      },

      // V2 references
      references: {
        gemstoneIds: referencedGemstoneIds,
        designId: null,
        cadRequestId: null,
      },

      // Stripe (set when synced)
      stripeProductId: null,
      stripePriceId: null,

      // Legacy fields (kept for backward compat with existing admin UI)
      status: status || 'draft',
      availability: availability || (isMadeToOrder ? 'made-to-order' : 'ready-to-ship'),
      classification: classification || 'signature',
      userId: actualUserId,
      vendor: actualVendor,
      createdAt: now,
      updatedAt: now,
      images: images || [],
      tags: Array.isArray(tags) ? tags : [],
      price: canonicalRetailPrice,

      jewelry: {
        type: type || '',
        category: type || '',
        madeToOrder: isMadeToOrder,
        material: material || '',
        purity: purity || '',
        weight: weight || '',
        size: size || '',
        customMounting: customMounting || false,

        // V2 metals array
        metals: metalsArray,

        // V2 gemstone line items
        gemstoneLineItems: Array.isArray(gemstoneLineItems) ? gemstoneLineItems : [],

        // V2 production
        production: {
          castingRequired: castingRequired || false,
          estimatedLeadTimeDays: estimatedLeadTimeDays || null,
          notes: productionNotes || '',
        },

        // Ring Specifics
        ringSize: ringSize || '',
        canBeSized: canBeSized || false,
        sizingRangeUp: sizingRangeUp || '',
        sizingRangeDown: sizingRangeDown || '',
        // Pendant Specifics
        chainIncluded: chainIncluded || false,
        chainMaterial: chainMaterial || '',
        chainLength: chainLength || '',
        chainStyle: chainStyle || '',
        // Bracelet Specifics
        length: length || '',
        claspType: claspType || '',
        // General
        dimensions: dimensions || '',
        ...otherData,
      },

      cadRequests: [],
      designs: [],
    };

    const result = await db.collection('products').insertOne(newJewelry);

    return NextResponse.json({
      success: true,
      productId,
      id: result.insertedId,
    });
  } catch (error) {
    console.error('POST /api/products/jewelry error:', error);
    return NextResponse.json({ error: 'Failed to create jewelry' }, { status: 500 });
  }
}
