/**
 * /api/drop-requests/[id]/submit/route.js
 * Artisans submit products for drop consideration
 */

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongodb.js';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/drop-requests/:id/submit
 * Submit products for drop consideration
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only artisans can submit
    if (session.user.role !== 'artisan') {
      return NextResponse.json(
        { success: false, error: 'Only artisans can submit to drops' },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drop request ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { productIds, statement } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one product ID is required' },
        { status: 400 }
      );
    }

    // Validate all IDs are valid ObjectIds
    for (const id of productIds) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID format' },
          { status: 400 }
        );
      }
    }

    const { db } = await connectToDatabase();

    // Check drop request exists and is open
    const dropRequest = await db.collection('drop-requests').findOne({
      _id: new ObjectId(id)
    });

    if (!dropRequest) {
      return NextResponse.json(
        { success: false, error: 'Drop request not found' },
        { status: 404 }
      );
    }

    if (dropRequest.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Drop request is not currently accepting submissions' },
        { status: 400 }
      );
    }

    // Check submission window
    const now = new Date();
    if (now < dropRequest.opensAt || now > dropRequest.closesAt) {
      return NextResponse.json(
        { success: false, error: 'Submission window is closed' },
        { status: 400 }
      );
    }

    // Check artisan hasn't already submitted
    const existingSubmission = dropRequest.submissions?.find(
      s => s.artisanId === session.user.id
    );

    if (existingSubmission) {
      return NextResponse.json(
        { success: false, error: 'You have already submitted to this drop' },
        { status: 409 }
      );
    }

    // Verify all products belong to this artisan and are published
    const products = await db.collection('products')
      .find({
        _id: { $in: productIds.map(id => new ObjectId(id)) }
      })
      .toArray();

    for (const product of products) {
      if (product.artisanId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only submit your own products' },
          { status: 403 }
        );
      }

      if (product.status !== 'published') {
        return NextResponse.json(
          { success: false, error: 'All products must be published before submission' },
          { status: 400 }
        );
      }
    }

    // Create submission
    const submission = {
      artisanId: session.user.id,
      artisanName: session.user.businessName || session.user.name,
      artisanEmail: session.user.email,
      productIds: productIds,
      products: products.map(p => ({
        productId: p._id.toString(),
        title: p.title,
        image: p.images?.[0]?.url
      })),
      statement: statement || '',
      submittedAt: new Date(),
      status: 'pending',
      selectedAt: null,
      notes: ''
    };

    // Add submission to drop request
    const result = await db.collection('drop-requests').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $push: {
          submissions: submission
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    // TODO: Notify admins of new submission
    console.log('📧 TODO: Notify admins of new drop submission');

    return NextResponse.json(
      {
        success: true,
        message: 'Products submitted for drop consideration',
        data: {
          dropRequestId: id,
          submissionId: id, // In real scenario, track submission ID
          submittedProducts: productIds.length,
          status: 'pending'
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error submitting to drop:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
