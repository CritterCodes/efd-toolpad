import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

        const { db } = await connectToDatabase();
        
        // Check if user is admin or staff - they can see ALL jewelry
        const isAdmin = session.user.role === 'admin' || session.user.role === 'staff';
        
        let jewelry;
        if (isAdmin) {
          // Admins see all jewelry
          jewelry = await db.collection('products').find({ 
              productType: 'jewelry'
          }).toArray();
        } else {
          // Regular users only see their own jewelry
          const userIdentifier = session.user.userID || session.user.email;
          jewelry = await db.collection('products').find({ 
              productType: 'jewelry',
              $or: [
                  { userId: userIdentifier },
                  { userId: session.user.email },
                  { userId: session.user.userID }
              ]
          }).toArray();
        }
        
        // Migrate jewelry that don't have productId yet
        for (let item of jewelry) {
            if (!item.productId) {
                const productId = `jwl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
                await db.collection('products').updateOne(
                    { _id: item._id },
                    { $set: { productId: productId } }
                );
                item.productId = productId;
            }
        }

        return NextResponse.json({ 
            success: true, 
            jewelry: jewelry || []
        });
    } catch (error) {
        console.error('GET /api/products/jewelry error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch jewelry' },
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
    console.log('POST /api/products/jewelry - Received data:', data);

    // Generate unique productId
    const generateProductId = () => {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `jwl_${timestamp}_${randomStr}`;
    };

    const { 
        title, 
        description,
        notes,
        type,
        material,
        purity,
        weight,
        size,
        price,
        status,
        availability,
        classification, // New field
        images,
        customMounting,
        vendor,
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
        ...otherData
    } = data;

    const productId = generateProductId();
    const userIdentifier = session.user.userID || session.user.email;

    const newJewelry = {
        productId,
        productType: 'jewelry',
        title: title || 'Untitled Jewelry',
        description: description || '',
        notes: notes || '',
        status: status || 'draft',
        availability: availability || 'ready-to-ship',
        classification: classification || 'signature', // Default to signature
        userId: userIdentifier,
        vendor: vendor || session.user.businessName || session.user.name || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        images: images || [],
        
        // Jewelry Specific Data
        jewelry: {
            type: type || '',
            material: material || '',
            purity: purity || '',
            weight: weight || '',
            size: size || '',
            customMounting: customMounting || false,
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
            ...otherData
        },
        
        price: parseFloat(price) || 0,
        
        // Arrays for CAD/Designs
        cadRequests: [],
        designs: []
    };

    const { db } = await connectToDatabase();
    const result = await db.collection('products').insertOne(newJewelry);

    return NextResponse.json({ 
        success: true, 
        productId,
        id: result.insertedId 
    });

  } catch (error) {
    console.error('POST /api/products/jewelry error:', error);
    return NextResponse.json(
      { error: 'Failed to create jewelry' }, 
      { status: 500 }
    );
  }
}
