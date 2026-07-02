/**
 * /api/collections/[id]/publish/route.js
 * Publish collection to make it live
 */

import { NextResponse } from 'next/server';
import { db as mongo } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NotificationService, notifyAllAdmins } from '@/lib/notificationService';

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

    const db = await mongo.connect();
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

    // PR2 — notify each artisan whose product is in the published collection.
    // Best-effort: never fail the publish if notifications error.
    try {
      const collectionName = collection.name || collection.title || collection.drop?.theme || 'a collection';
      const actionUrl = `${process.env.NEXT_PUBLIC_ADMIN_URL || ''}/dashboard/collections/${id}`;

      // Resolve the owning artisans of the products in this collection.
      const productObjectIds = (collection.products || [])
        .map((p) => {
          try { return new ObjectId(p.productId); } catch { return null; }
        })
        .filter(Boolean);

      let notifiedCount = 0;
      if (productObjectIds.length > 0) {
        const products = await db.collection('products')
          .find({ _id: { $in: productObjectIds } })
          .project({ _id: 1, title: 1, userId: 1 })
          .toArray();

        // Unique owning artisan userIDs (product.userId is the artisan userID string).
        const artisanUserIDs = [...new Set(products.map((p) => p.userId).filter(Boolean))];

        if (artisanUserIDs.length > 0) {
          const artisans = await db.collection('users')
            .find({ userID: { $in: artisanUserIDs } })
            .project({ _id: 0, userID: 1, email: 1 })
            .toArray();
          const emailByUserID = new Map(artisans.map((u) => [u.userID, u.email]));

          for (const artisanUserID of artisanUserIDs) {
            try {
              await NotificationService.createNotification({
                userId: artisanUserID,
                type: 'collection-published',
                title: 'Collection Published',
                message: `A collection featuring your work, "${collectionName}", is now live.`,
                channels: ['inApp', 'email'],
                recipientEmail: emailByUserID.get(artisanUserID) || '',
                priority: 'normal',
                data: {
                  actionUrl,
                  relatedType: 'collection',
                  collectionId: id,
                  collectionName,
                },
              });
              notifiedCount += 1;
            } catch (perArtisanError) {
              console.error(`⚠️ PR2 collection-published notify failed for ${artisanUserID}:`, perArtisanError.message);
            }
          }
        }
      }

      if (notifiedCount > 0) {
        console.log(`✅ Sent collection-published notifications to ${notifiedCount} artisan(s)`);
      } else {
        // No resolvable product-owning artisans — surface to admins so the publish isn't silent.
        console.warn('⚠️ PR2: no artisans resolved from collection products; notifying admins only');
        await notifyAllAdmins({
          type: 'collection-published',
          title: 'Collection Published',
          message: `Collection "${collectionName}" was published (no artisan recipients resolved).`,
          actionUrl,
          priority: 'low',
          relatedData: { collectionId: id, collectionName },
        });
      }
    } catch (notifError) {
      console.error('⚠️ PR2 collection-published notification failed:', notifError.message);
      // Don't fail the request if notification fails
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
