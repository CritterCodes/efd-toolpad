import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

        const { db } = await connectToDatabase();
        
        // Check if user is admin or staff - they can see ALL gemstones
        const isAdmin = session.user.role === 'admin' || session.user.role === 'staff';
        
        let gemstones;
        if (isAdmin) {
          // Admins see all gemstones
          console.log(`GET /api/products/gemstones - Admin user ${session.user.email} requesting all gemstones`);
          gemstones = await db.collection('products').find({ 
              productType: 'gemstone'
          }).toArray();
        } else {
          // Regular users only see their own gemstones
          const userIdentifier = session.user.userID || session.user.email;
          gemstones = await db.collection('products').find({ 
              productType: 'gemstone',
              $or: [
                  { userId: userIdentifier },
                  { userId: session.user.email },
                  { userId: session.user.userID }
              ]
          }).toArray();
        }
        
        // Migrate gemstones that don't have productId yet
        for (let gemstone of gemstones) {
            if (!gemstone.productId) {
                const productId = `gem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
                await db.collection('products').updateOne(
                    { _id: gemstone._id },
                    { $set: { productId: productId } }
                );
                gemstone.productId = productId;
                console.log(`Migrated gemstone ${gemstone._id} to productId: ${productId}`);
            }
        }
        
        if (isAdmin) {
          console.log(`GET /api/products/gemstones - Admin user ${session.user.email} viewing all gemstones`);
        } else {
          const userIdentifier = session.user.userID || session.user.email;
          console.log(`GET /api/products/gemstones - Searching for user: ${userIdentifier} (email: ${session.user.email}, userID: ${session.user.userID})`);
        }
        console.log(`GET /api/products/gemstones - Found ${gemstones.length} gemstones`);

        return NextResponse.json({ 
            success: true, 
            gemstones: gemstones || []
        });
    } catch (error) {
        console.error('GET /api/products/gemstones error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gemstones' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    console.log('POST /api/products/gemstones - Received data:', data);

    // Generate unique productId
    const generateProductId = () => {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `gem_${timestamp}_${randomStr}`;
    };

    // Extract form fields and restructure for new schema
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
        price, // Legacy field name
        retailPrice,
        acquisitionPrice,
        acquisitionDate,
        supplier,
        certification,
        tags,
        customMounting, // Legacy field, will be ignored
        userId, 
        vendor, 
        notes  // Legacy field, will move to internalNotes
    } = data;

    // Validate required fields
    if (!title || !species) {
        return NextResponse.json(
            { error: 'Title and species are required' },
            { status: 400 }
        );
    }

    const { db } = await connectToDatabase();
    
    // Get user data for proper userId and vendor assignment
    const actualUserId = userId || session.user.userID || session.user.email;
    let actualVendor = vendor || session.user.businessName || session.user.name;
    
    // If we don't have businessName in session, try to get it from user profile
    if (!session.user.businessName && session.user.email) {
        try {
            const userProfile = await db.collection('users').findOne({ 
                email: session.user.email 
            });
            if (userProfile?.artisanApplication?.businessName) {
                actualVendor = userProfile.artisanApplication.businessName;
            }
        } catch (error) {
            console.error('Error fetching user profile for business name:', error);
        }
    }
    
    console.log(`Creating gemstone for user: ${actualUserId}, vendor: ${actualVendor}`);
    
    // Generate unique productId for this gemstone
    const productId = generateProductId();
    
    // Create new hierarchical product document
    const gemstone = {
        // === UNIVERSAL PRODUCT FIELDS ===
        productId: productId, // Our custom product ID
        productType: 'gemstone',
        
        // General Product Info
        title: title || '',
        description: description || '',
        internalNotes: internalNotes || notes || '', // Use internalNotes or fallback to legacy notes
        
        // Ownership & Business
        userId: actualUserId,
        vendor: actualVendor,
        
        // Status & Visibility
        status: 'draft', // New gemstones start as draft
        isPublic: false,
        featured: false,
        
        // Universal Media & Tags
        images: [],
        tags: Array.isArray(tags) ? tags : [],
        
        // === GEMSTONE-SPECIFIC DATA ===
        gemstone: {
            // Physical Properties
            species: species || '',
            subspecies: subspecies || '',
            carat: Number(carat) || 0,
            dimensions: {
                length: Number(dimensions?.length) || 0,
                width: Number(dimensions?.width) || 0,
                height: Number(dimensions?.height) || 0
            },
            
            // Cutting & Treatment
            cut: Array.isArray(cut) ? cut : [],
            cutStyle: Array.isArray(cutStyle) ? cutStyle : [],
            treatment: Array.isArray(treatment) ? treatment : [],
            
            // Quality & Characteristics
            color: Array.isArray(color) ? color : [],
            clarity: clarity || '',
            locale: locale || '',
            naturalSynthetic: naturalSynthetic || 'natural',
            
            // Certification
            certification: {
                lab: certification?.lab || '',
                number: certification?.number || '',
                url: certification?.url || '',
                verified: certification?.verified || false
            },
            
            // 3D Model for CAD Designers
            obj3DFile: {
                url: '',
                filename: '',
                fileSize: 0,
                uploadedAt: null,
                downloadCount: 0
            },
            
            // Business Data
            acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
            acquisitionPrice: Number(acquisitionPrice) || null,
            supplier: supplier || '',
            retailPrice: Number(retailPrice || price) || 0, // Use retailPrice or fallback to legacy price
            
            // Work Pipeline Status
            designCoverage: {
                hasBasicBasket: false,
                hasBasicRing: false,
                customDesignCount: 0,
                lastDesignAdded: null,
                priorityLevel: 'critical' // New stones need designs
            }
        },
        
        // === RELATIONSHIPS ===
        availableDesigns: [],
        relatedProducts: [],
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date()
    };

    console.log('POST /api/products/gemstones - Saving gemstone:', gemstone);

    const result = await db.collection('products').insertOne(gemstone);
    
    return NextResponse.json({ 
        success: true, 
        gemstone: { ...gemstone, _id: result.insertedId },
        productId: productId // Return the custom productId for easy reference
    });
  } catch (error) {
    console.error('POST /api/products/gemstones error:', error);
    return NextResponse.json(
        { error: 'Failed to create gemstone', details: error.message },
        { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    console.log('PUT /api/products/gemstones - Received data:', data);

    // Handle both flat (legacy) and hierarchical (new) data structures
    let title, description, tags, images, isPublic, status, gemstoneData, _id;
    
    if (data.gemstone) {
      // New hierarchical structure
      ({ _id, title, description, tags = [], images = [], isPublic = true, status = 'active' } = data);
      gemstoneData = data.gemstone;
    } else {
      // Legacy flat structure - map to new structure
      _id = data._id;
      title = data.title;
      description = data.description || '';
      tags = data.tags || [];
      images = data.images || [];
      isPublic = data.isPublic !== undefined ? data.isPublic : true;
      status = data.status || 'active';
      
      // Map legacy fields to gemstone object
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
        designCoverage: data.designCoverage || 'full'
      };
    }

    // Validate required fields
    if (!_id || !title || !gemstoneData.species) {
        return NextResponse.json(
            { error: 'ID, title and species are required' },
            { status: 400 }
        );
    }

    const { db } = await connectToDatabase();
    
    // Create hierarchical update document
    const updateData = {
      // Universal product fields
      productType: 'gemstone',
      title,
      description: description || '',
      userId: data.userId || session.user.id,
      status,
      isPublic,
      images,
      tags,
      
      // Gemstone-specific data in nested object
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
        retailPrice: Number(gemstoneData.retailPrice) || 0,
        customMounting: Boolean(gemstoneData.customMounting),
        vendor: gemstoneData.vendor || session.user.businessName || session.user.slug || session.user.name,
        internalNotes: gemstoneData.internalNotes || '',
        certification: gemstoneData.certification || {},
        designCoverage: gemstoneData.designCoverage || 'full'
      },
      
      // Relationship arrays (preserve existing if not provided)
      ...(data.availableDesigns !== undefined && { availableDesigns: data.availableDesigns }),
      ...(data.relatedProducts !== undefined && { relatedProducts: data.relatedProducts }),
      
      updatedAt: new Date()
    };

    console.log('PUT /api/products/gemstones - Updating gemstone:', _id, updateData);

    const result = await db.collection('products').updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json(
            { error: 'Gemstone not found' },
            { status: 404 }
        );
    }
    
    return NextResponse.json({ 
        success: true, 
        gemstone: { ...updateData, _id }
    });
  } catch (error) {
    console.error('PUT /api/products/gemstones error:', error);
    return NextResponse.json(
        { error: 'Failed to update gemstone', details: error.message },
        { status: 500 }
    );
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
        return NextResponse.json(
            { error: 'Gemstone ID is required' },
            { status: 400 }
        );
    }

    const { db } = await connectToDatabase();
    
    console.log('DELETE /api/products/gemstones - Deleting gemstone:', id);

    const result = await db.collection('products').deleteOne(
        { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
        return NextResponse.json(
            { error: 'Gemstone not found' },
            { status: 404 }
        );
    }
    
    return NextResponse.json({ 
        success: true, 
        message: 'Gemstone deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/products/gemstones error:', error);
    return NextResponse.json(
        { error: 'Failed to delete gemstone', details: error.message },
        { status: 500 }
    );
  }
}