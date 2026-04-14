import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/database';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';

export async function POST(req, { params }) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { productId } = params;
    const { notes, approvedBy } = await req.json();

    const { db } = await connectDB();

    const product = await db.collection('products').findOneAndUpdate(
      { _id: productId },
      {
        $set: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: approvedBy || session.user.userID,
          approvalNotes: notes || '',
          isActive: true // Make product active/visible on website
        }
      },
      { returnDocument: 'after' }
    );

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log('✅ Product approved:', productId);

    // Send approval notification to artisan
    try {
      await NotificationService.createNotification({
        userId: product.artisanId,
        type: NOTIFICATION_TYPES.PRODUCT_APPROVED,
        title: 'Product Approved',
        message: `Your product "${product.title}" has been approved!`,
        channels: ['inApp', 'email'],
        templateName: 'product-approved',
        recipientEmail: product.artisanEmail,
        data: {
          productTitle: product.title,
          productId: productId,
          userRole: 'artisan',
          relatedType: 'product',
        },
      });
    } catch (notifError) {
      console.error('⚠️ Failed to send approval notification:', notifError.message);
    }

    return Response.json({
      success: true,
      message: 'Product approved and is now live on the website',
      product
    });

  } catch (error) {
    console.error('❌ Approval error:', error);
    return Response.json(
      { error: error.message || 'Failed to approve product' },
      { status: 500 }
    );
  }
}
