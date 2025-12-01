/**
 * /api/collections/[id]/publish/route.js
 * Publish collection to make it live
 */

import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { notifyArtisanSelectedForDrop } from '@/lib/notificationService';

/**
 * POST /api/collections/:id/publish
 * Publish collection (only admins for admin/drop collections)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = await db.collection('collections').findOne({
      _id: new ObjectId(id)
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Authorization check
    if (session.user.role === 'artisan') {
      // Artisans can publish own artisan collections
      if (collection.type !== 'artisan' || collection.ownerId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only publish your own artisan collections' },
          { status: 403 }
        );
      }
    } else if (!['admin', 'superadmin'].includes(session.user.role)) {
      // Only admins and artisans can publish
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Can't publish archived collections
    if (collection.status === 'archived') {
      return NextResponse.json(
        { success: false, error: 'Cannot publish archived collections' },
        { status: 400 }
      );
    }

    // Validate has products
    if (!collection.products || collection.products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Collection must have at least one product' },
        { status: 400 }
      );
    }

    // Validate all products are published (for non-artisan collections)
    if (collection.type !== 'artisan') {
      const publishedCount = await db.collection('products').countDocuments({
        _id: { $in: collection.products.map(p => new ObjectId(p.productId)) },
        status: 'published'
      });

      if (publishedCount !== collection.products.length) {
        return NextResponse.json(
          { success: false, error: 'All products must be published before publishing collection' },
          { status: 400 }
        );
      }
    }

    // Publish collection
    const result = await db.collection('collections').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'active',
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: session.user.id,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    // For drop collections, trigger notifications to selected artisans
    if (collection.type === 'drop' && collection.drop?.requestId) {
      // Get original drop request to find selected artisans
      const dropRequest = await db.collection('drop-requests').findOne({
        _id: new ObjectId(collection.drop.requestId)
      });

      if (dropRequest && dropRequest.selectedArtisans && dropRequest.selectedArtisans.length > 0) {
        // Send "artisan-selected-for-drop" notifications
        try {
          for (const selectedArtisan of dropRequest.selectedArtisans) {
            await notifyArtisanSelectedForDrop(
              dropRequest._id.toString(),
              selectedArtisan.artisanId,
              selectedArtisan.email,
              selectedArtisan.name,
              collection.drop.theme
            );
          }
          console.log(`✅ Sent selection notifications to ${dropRequest.selectedArtisans.length} artisans`);
        } catch (notifError) {
          console.error('⚠️ Warning: Failed to send selection notifications:', notifError);
          // Don't fail the request if notification fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Collection published successfully',
      data: result.value
    });

  } catch (error) {
    console.error('Error publishing collection:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
