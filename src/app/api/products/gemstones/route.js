import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserArtisanTypes, canManageGemstones } from '@/lib/productPermissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const isAdmin = ['admin', 'staff', 'dev'].includes(session.user.role);

    let gemstones;
    if (isAdmin) {
      gemstones = await db.collection('products').find({ productType: 'gemstone' }).toArray();
    } else {
      const userIdentifier = session.user.userID || session.user.email;
      gemstones = await db.collection('products').find({
        productType: 'gemstone',
        $or: [
          { userId: userIdentifier },
          { userId: session.user.email },
          { userId: session.user.userID },
        ],
      }).toArray();
    }

    // Migrate gemstones that don't have productId yet
    for (const gemstone of gemstones) {
      if (!gemstone.productId) {
        const productId = `gem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        await db.collection('products').updateOne(
          { _id: gemstone._id },
          { $set: { productId } }
        );
        gemstone.productId = productId;
      }
    }

    return NextResponse.json({ success: true, gemstones: gemstones || [] });
  } catch (error) {
    console.error('GET /api/products/gemstones error:', error);
    return NextResponse.json({ error: 'Failed to fetch gemstones' }, { status: 500 });
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
      internalNotes,
      species,
      subspecies,
      carat,
      dimensions,
      cut,
      cutStyle,
      treatment,
      color,
      clarity,
      locale,
      naturalSynthetic,
      price,
      retailPrice,
      compareAtPrice,
      acquisitionPrice,
      acquisitionDate,
      supplier,
      certification,
      tags,
      userId,
      vendor,
      notes,
    } = data;

    if (!title || !species) {
      return NextResponse.json({ error: 'Title and species are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const actualUserId = userId || session.user.userID || session.user.email;
    let actualVendor = vendor || session.user.businessName || session.user.name;
    let artisanType = null;

    // Fetch user profile for businessName and artisanType
    if (session.user.email) {
      try {
        const userProfile = await db.collection('users').findOne({ email: session.user.email });
        if (userProfile?.artisanApplication?.businessName && !actualVendor) {
          actualVendor = userProfile.artisanApplication.businessName;
        }
        artisanType = userProfile?.artisanApplication?.artisanType || null;

        // Artisan permission check — only gem-cutters (and admin/staff/dev) may create gemstone listings
        const artisanTypes = getUserArtisanTypes(userProfile);
        if (!canManageGemstones(session.user.role, artisanTypes)) {
          return NextResponse.json(
            { error: 'Only gem-cutters and admins can create gemstone listings' },
            { status: 403 }
          );
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    }

    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const productId = `gem_${timestamp}_${randomStr}`;
    const now = new Date();
    const canonicalRetailPrice = Number(retailPrice || price) || 0;

    const gemstone = {
      productId,
      productType: 'gemstone',
      listingType: 'gemstone',

      title: title || '',
      description: description || '',
      internalNotes: internalNotes || notes || '',

      // V2 seller
      seller: {
        userId: actualUserId,
        displayName: actualVendor || '',
        artisanType,
      },

      // V2 pricing
      pricing: {
        retailPrice: canonicalRetailPrice,
        compareAtPrice: Number(compareAtPrice) || null,
        costBasis: Number(acquisitionPrice) || null,
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
        gemstoneIds: [],
        designId: null,
        cadRequestId: null,
      },

      // V2 inventory
      inventory: {
        available: true,
        reserved: false,
        usedInProductId: null,
      },

      // Stripe (set when synced to Stripe)
      stripeProductId: null,
      stripePriceId: null,

      // Legacy fields (kept for backward compat with existing admin UI)
      userId: actualUserId,
      vendor: actualVendor || '',
      status: 'draft',
      isPublic: false,
      featured: false,
      images: [],
      tags: Array.isArray(tags) ? tags : [],

      gemstone: {
        species: species || '',
        subspecies: subspecies || '',
        carat: Number(carat) || 0,
        dimensions: {
          length: Number(dimensions?.length) || 0,
          width: Number(dimensions?.width) || 0,
          height: Number(dimensions?.height) || 0,
        },
        cut: Array.isArray(cut) ? cut : [],
        cutStyle: Array.isArray(cutStyle) ? cutStyle : [],
        treatment: Array.isArray(treatment) ? treatment : [],
        color: Array.isArray(color) ? color : [],
        clarity: clarity || '',
        locale: locale || '',
        naturalSynthetic: naturalSynthetic || 'natural',
        certification: {
          lab: certification?.lab || '',
          number: certification?.number || '',
          url: certification?.url || '',
          verified: certification?.verified || false,
        },
        obj3DFile: { url: '', filename: '', fileSize: 0, uploadedAt: null, downloadCount: 0 },
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionPrice: Number(acquisitionPrice) || null,
        supplier: supplier || '',
        retailPrice: canonicalRetailPrice,
        designCoverage: {
          hasBasicBasket: false,
          hasBasicRing: false,
          customDesignCount: 0,
          lastDesignAdded: null,
          priorityLevel: 'critical',
        },
      },

      availableDesigns: [],
      relatedProducts: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('products').insertOne(gemstone);

    return NextResponse.json({
      success: true,
      gemstone: { ...gemstone, _id: result.insertedId },
      productId,
    });
  } catch (error) {
    console.error('POST /api/products/gemstones error:', error);
    return NextResponse.json({ error: 'Failed to create gemstone', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();

    // Support both flat (legacy) and hierarchical (new) data structures
    let title, description, tags, images, isPublic, status, gemstoneData, productId;

    if (data.gemstone) {
      ({ productId, title, description, tags = [], images = [], isPublic = true, status = 'active' } = data);
      gemstoneData = data.gemstone;
    } else {
      productId = data.productId;
      title = data.title;
      description = data.description || '';
      tags = data.tags || [];
      images = data.images || [];
      isPublic = data.isPublic !== undefined ? data.isPublic : true;
      status = data.status || 'active';
      gemstoneData = {
        species: data.species,
        subspecies: data.subspecies || '',
        carat: Number(data.carat) || 0,
        dimensions: data.dimensions || { length: '', width: '', height: '' },
        cut: data.cut || [],
        cutStyle: data.cutStyle || [],
        treatment: data.treatment || [],
        color: data.color || [],
        locale: data.locale || '',
        naturalSynthetic: data.naturalSynthetic || 'natural',
        retailPrice: Number(data.price || data.retailPrice) || 0,
        customMounting: data.customMounting || false,
        vendor: data.vendor || session.user.businessName || session.user.slug || session.user.name,
        internalNotes: data.notes || data.internalNotes || '',
        certification: data.certification || {},
        designCoverage: data.designCoverage || 'full',
      };
    }

    if (!productId || !title || !gemstoneData.species) {
      return NextResponse.json({ error: 'ProductId, title and species are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Permission check for write ops
    if (!['admin', 'staff', 'dev'].includes(session.user.role)) {
      const userProfile = await db.collection('users').findOne({ email: session.user.email });
      const artisanTypes = getUserArtisanTypes(userProfile);
      if (!canManageGemstones(session.user.role, artisanTypes)) {
        return NextResponse.json({ error: 'Only gem-cutters and admins can edit gemstone listings' }, { status: 403 });
      }
    }

    const canonicalRetailPrice = Number(gemstoneData.retailPrice) || 0;

    const updateData = {
      productType: 'gemstone',
      title,
      description: description || '',
      userId: data.userId || session.user.userID || session.user.id,
      status,
      isPublic,
      images,
      tags,
      'pricing.retailPrice': canonicalRetailPrice,
      'pricing.currency': 'USD',
      gemstone: {
        species: gemstoneData.species,
        subspecies: gemstoneData.subspecies || '',
        carat: Number(gemstoneData.carat) || 0,
        dimensions: gemstoneData.dimensions || { length: '', width: '', height: '' },
        cut: Array.isArray(gemstoneData.cut) ? gemstoneData.cut : [],
        cutStyle: Array.isArray(gemstoneData.cutStyle) ? gemstoneData.cutStyle : [],
        treatment: Array.isArray(gemstoneData.treatment) ? gemstoneData.treatment : [],
        color: Array.isArray(gemstoneData.color) ? gemstoneData.color : [],
        locale: gemstoneData.locale || '',
        naturalSynthetic: gemstoneData.naturalSynthetic || 'natural',
        retailPrice: canonicalRetailPrice,
        customMounting: Boolean(gemstoneData.customMounting),
        vendor: gemstoneData.vendor || session.user.businessName || session.user.slug || session.user.name,
        internalNotes: gemstoneData.internalNotes || '',
        certification: gemstoneData.certification || {},
        designCoverage: gemstoneData.designCoverage || 'full',
      },
      ...(data.availableDesigns !== undefined && { availableDesigns: data.availableDesigns }),
      ...(data.relatedProducts !== undefined && { relatedProducts: data.relatedProducts }),
      updatedAt: new Date(),
    };

    const result = await db.collection('products').updateOne(
      { productId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, gemstone: { ...updateData, productId } });
  } catch (error) {
    console.error('PUT /api/products/gemstones error:', error);
    return NextResponse.json({ error: 'Failed to update gemstone', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Gemstone ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Permission check
    if (!['admin', 'staff', 'dev'].includes(session.user.role)) {
      const userProfile = await db.collection('users').findOne({ email: session.user.email });
      const artisanTypes = getUserArtisanTypes(userProfile);
      if (!canManageGemstones(session.user.role, artisanTypes)) {
        return NextResponse.json({ error: 'Only gem-cutters and admins can delete gemstone listings' }, { status: 403 });
      }
    }

    const result = await db.collection('products').deleteOne({ productId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Gemstone not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Gemstone deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/products/gemstones error:', error);
    return NextResponse.json({ error: 'Failed to delete gemstone', details: error.message }, { status: 500 });
  }
}
