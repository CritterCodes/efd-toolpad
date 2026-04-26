import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserArtisanTypes, canManageJewelry } from '@/lib/productPermissions';

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id } = await params;

    let jewelry = await db.collection('products').findOne({ productId: id, productType: 'jewelry' });

    if (!jewelry && ObjectId.isValid(id)) {
      jewelry = await db.collection('products').findOne({ _id: new ObjectId(id), productType: 'jewelry' });
      if (jewelry && !jewelry.productId) {
        const productId = `jwl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        await db.collection('products').updateOne({ _id: jewelry._id }, { $set: { productId } });
        jewelry.productId = productId;
      }
    }

    if (!jewelry) {
      return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
    }

    const userIdentifier = session.user.userID || session.user.email;
    const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role);
    const isOwner =
      jewelry.userId === userIdentifier ||
      jewelry.userId === session.user.email ||
      jewelry.userId === session.user.userID;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, jewelry });
  } catch (error) {
    console.error('GET /api/products/jewelry/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch jewelry' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id } = await params;
    const data = await request.json();

    let existingJewelry = await db.collection('products').findOne({ productId: id, productType: 'jewelry' });
    let searchCriteria = { productId: id };

    if (!existingJewelry && ObjectId.isValid(id)) {
      existingJewelry = await db.collection('products').findOne({ _id: new ObjectId(id), productType: 'jewelry' });
      searchCriteria = { _id: new ObjectId(id) };
    }

    if (!existingJewelry) {
      return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
    }

    // Ownership check
    const userIdentifier = session.user.userID || session.user.email;
    const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role);
    const isOwner =
      existingJewelry.userId === userIdentifier ||
      existingJewelry.userId === session.user.email ||
      existingJewelry.userId === session.user.userID;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Artisan type permission check for non-admins
    if (!isAdmin) {
      const userProfile = await db.collection('users').findOne({ email: session.user.email });
      const artisanTypes = getUserArtisanTypes(userProfile);
      if (!canManageJewelry(session.user.role, artisanTypes)) {
        return NextResponse.json({ error: 'Only jewelers and admins can edit jewelry listings' }, { status: 403 });
      }
    }

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
      ringSize,
      canBeSized,
      sizingRangeUp,
      sizingRangeDown,
      chainIncluded,
      chainMaterial,
      chainLength,
      chainStyle,
      length,
      claspType,
      dimensions,
      ...otherData
    } = data;

    const canonicalRetailPrice = parseFloat(price) !== undefined && price !== null
      ? parseFloat(price)
      : existingJewelry.price;
    const isMadeToOrder =
      madeToOrder !== undefined ? madeToOrder : existingJewelry.jewelry?.madeToOrder || false;

    // Build metals array for V2 — merge with existing if not provided
    let metalsArray = existingJewelry.jewelry?.metals || [];
    if (Array.isArray(metals) && metals.length > 0) {
      metalsArray = metals;
    } else if (material || purity || weight) {
      metalsArray = [{ type: material || '', color: metalColor || '', purity: purity || '', weight: weight || 0 }];
    }

    // Updated gemstone references from line items
    const referencedGemstoneIds = Array.isArray(gemstoneLineItems)
      ? gemstoneLineItems.map((g) => g.gemstoneId).filter(Boolean)
      : existingJewelry.references?.gemstoneIds || [];

    const updateData = {
      title: title || existingJewelry.title,
      description: description !== undefined ? description : existingJewelry.description,
      notes: notes !== undefined ? notes : existingJewelry.notes,
      status: status || existingJewelry.status,
      availability: availability || existingJewelry.availability || 'ready-to-ship',
      classification: classification || existingJewelry.classification || 'signature',
      vendor: vendor || existingJewelry.vendor,
      updatedAt: new Date(),
      images: images !== undefined ? images : existingJewelry.images,
      price: canonicalRetailPrice,
      'listingType': isMadeToOrder ? 'made-to-order' : 'finished',
      'pricing.retailPrice': canonicalRetailPrice,
      'pricing.compareAtPrice': parseFloat(compareAtPrice) || existingJewelry.pricing?.compareAtPrice || null,
      'pricing.currency': 'USD',
      'references.gemstoneIds': referencedGemstoneIds,

      jewelry: {
        ...existingJewelry.jewelry,
        type: type !== undefined ? type : existingJewelry.jewelry?.type,
        category: type !== undefined ? type : existingJewelry.jewelry?.category || existingJewelry.jewelry?.type,
        madeToOrder: isMadeToOrder,
        material: material !== undefined ? material : existingJewelry.jewelry?.material,
        purity: purity !== undefined ? purity : existingJewelry.jewelry?.purity,
        weight: weight !== undefined ? weight : existingJewelry.jewelry?.weight,
        size: size !== undefined ? size : existingJewelry.jewelry?.size,
        customMounting: customMounting !== undefined ? customMounting : existingJewelry.jewelry?.customMounting,
        metals: metalsArray,
        gemstoneLineItems: gemstoneLineItems !== undefined
          ? gemstoneLineItems
          : existingJewelry.jewelry?.gemstoneLineItems || [],
        production: {
          castingRequired: castingRequired !== undefined ? castingRequired : existingJewelry.jewelry?.production?.castingRequired || false,
          estimatedLeadTimeDays: estimatedLeadTimeDays !== undefined ? estimatedLeadTimeDays : existingJewelry.jewelry?.production?.estimatedLeadTimeDays || null,
          notes: productionNotes !== undefined ? productionNotes : existingJewelry.jewelry?.production?.notes || '',
        },
        ringSize: ringSize !== undefined ? ringSize : existingJewelry.jewelry?.ringSize,
        canBeSized: canBeSized !== undefined ? canBeSized : existingJewelry.jewelry?.canBeSized,
        sizingRangeUp: sizingRangeUp !== undefined ? sizingRangeUp : existingJewelry.jewelry?.sizingRangeUp,
        sizingRangeDown: sizingRangeDown !== undefined ? sizingRangeDown : existingJewelry.jewelry?.sizingRangeDown,
        chainIncluded: chainIncluded !== undefined ? chainIncluded : existingJewelry.jewelry?.chainIncluded,
        chainMaterial: chainMaterial !== undefined ? chainMaterial : existingJewelry.jewelry?.chainMaterial,
        chainLength: chainLength !== undefined ? chainLength : existingJewelry.jewelry?.chainLength,
        chainStyle: chainStyle !== undefined ? chainStyle : existingJewelry.jewelry?.chainStyle,
        length: length !== undefined ? length : existingJewelry.jewelry?.length,
        claspType: claspType !== undefined ? claspType : existingJewelry.jewelry?.claspType,
        dimensions: dimensions !== undefined ? dimensions : existingJewelry.jewelry?.dimensions,
        ...otherData,
      },
    };

    await db.collection('products').updateOne(searchCriteria, { $set: updateData });

    return NextResponse.json({ success: true, productId: existingJewelry.productId || id });
  } catch (error) {
    console.error('PUT /api/products/jewelry/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update jewelry' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id } = await params;

    let searchCriteria = { productId: id, productType: 'jewelry' };
    let jewelry = await db.collection('products').findOne(searchCriteria);

    if (!jewelry && ObjectId.isValid(id)) {
      searchCriteria = { _id: new ObjectId(id), productType: 'jewelry' };
      jewelry = await db.collection('products').findOne(searchCriteria);
    }

    if (!jewelry) {
      return NextResponse.json({ error: 'Jewelry not found' }, { status: 404 });
    }

    const userIdentifier = session.user.userID || session.user.email;
    const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role);
    const isOwner =
      jewelry.userId === userIdentifier ||
      jewelry.userId === session.user.email ||
      jewelry.userId === session.user.userID;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Artisan type permission check for non-admins
    if (!isAdmin) {
      const userProfile = await db.collection('users').findOne({ email: session.user.email });
      const artisanTypes = getUserArtisanTypes(userProfile);
      if (!canManageJewelry(session.user.role, artisanTypes)) {
        return NextResponse.json({ error: 'Only jewelers and admins can delete jewelry listings' }, { status: 403 });
      }
    }

    await db.collection('products').deleteOne(searchCriteria);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/jewelry/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete jewelry' }, { status: 500 });
  }
}
