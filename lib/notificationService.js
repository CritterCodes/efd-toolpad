import { ObjectId } from 'mongodb';
import { sendNotificationEmail } from './email.js';
import { connectToDatabase } from './mongodb.js';

/**
 * Notification Service
 * Handles multi-channel notifications (email, in-app, push)
 */

/**
 * Create and send notification
 */
export async function createNotification({
  userId,
  userEmail,
  userRole,
  type,
  title,
  message,
  relatedId,
  relatedType,
  relatedData = {},
  actionUrl,
  actionLabel,
  channels = ['email', 'inApp'],
  priority = 'normal',
  tags = []
}) {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();

    // Create notification document
    const notification = {
      userId,
      userEmail,
      userRole,
      type,
      title,
      message,
      relatedId,
      relatedType,
      relatedData,
      actionUrl,
      actionLabel,
      priority,
      channels,
      tags,
      email: {
        sent: false,
        sentAt: null,
        error: null,
        opened: false,
        openedAt: null,
        openCount: 0,
        clicked: false,
        clickedAt: null
      },
      inApp: {
        sent: false,
        sentAt: null,
        read: false,
        readAt: null,
        dismissed: false,
        dismissedAt: null
      },
      pushNotification: {
        sent: false,
        sentAt: null,
        clicked: false,
        clickedAt: null,
        error: null
      },
      isArchived: false,
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now
    };

    // Insert notification document
    const result = await db.collection('notifications').insertOne(notification);
    notification._id = result.insertedId;

    // Send via configured channels
    if (channels.includes('email')) {
      await sendNotificationEmailChannel(db, notification);
    }

    if (channels.includes('inApp')) {
      await markInAppSent(db, notification._id);
    }

    if (channels.includes('push')) {
      // TODO: Send push notification
      // await sendPushNotification(notification)
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * Send notification via email channel
 */
async function sendNotificationEmailChannel(db, notification) {
  try {
    await sendNotificationEmail({
      recipientEmail: notification.userEmail,
      notificationType: notification.type,
      data: {
        recipientName: notification.userEmail.split('@')[0],
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        ...notification.relatedData
      }
    });

    // Update notification to mark email as sent
    await db.collection('notifications').updateOne(
      { _id: notification._id },
      {
        $set: {
          'email.sent': true,
          'email.sentAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Email notification sent to ${notification.userEmail}`);
  } catch (error) {
    console.error(`❌ Error sending email notification to ${notification.userEmail}:`, error);

    // Update notification with error
    await db.collection('notifications').updateOne(
      { _id: notification._id },
      {
        $set: {
          'email.error': error.message,
          'email.sent': false,
          updatedAt: new Date()
        },
        $inc: {
          retryCount: 1
        }
      }
    );
  }
}

/**
 * Mark in-app notification as sent
 */
async function markInAppSent(db, notificationId) {
  try {
    await db.collection('notifications').updateOne(
      { _id: notificationId },
      {
        $set: {
          'inApp.sent': true,
          'inApp.sentAt': new Date(),
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('❌ Error marking in-app notification as sent:', error);
  }
}

/**
 * Mark in-app notification as read
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection('notifications').findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        userId
      },
      {
        $set: {
          'inApp.read': true,
          'inApp.readAt': new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(userId, { limit = 20, page = 1, unreadOnly = false } = {}) {
  try {
    const { db } = await connectToDatabase();

    const query = { userId };
    if (unreadOnly) {
      query['inApp.read'] = false;
    }

    const skip = (page - 1) * limit;

    const notifications = await db
      .collection('notifications')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('notifications').countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('❌ Error fetching user notifications:', error);
    throw error;
  }
}

/**
 * Specific notification creators
 */

export async function notifyProductApproval(productId, artisanId, artisanEmail, productTitle) {
  return createNotification({
    userId: artisanId,
    userEmail: artisanEmail,
    userRole: 'artisan',
    type: 'product-approved',
    title: 'Product Approved! 🎉',
    message: `Your product "${productTitle}" has been approved and will be published soon.`,
    relatedId: productId,
    relatedType: 'product',
    relatedData: {
      title: productTitle
    },
    actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/products/${productId}`,
    actionLabel: 'View Product',
    channels: ['email', 'inApp', 'push'],
    priority: 'high',
    tags: ['product', 'approval']
  });
}

export async function notifyProductRejection(productId, artisanId, artisanEmail, productTitle, reason) {
  return createNotification({
    userId: artisanId,
    userEmail: artisanEmail,
    userRole: 'artisan',
    type: 'product-rejected',
    title: 'Product Review - Not Approved',
    message: `Your product "${productTitle}" needs revision. Please review the feedback.`,
    relatedId: productId,
    relatedType: 'product',
    relatedData: {
      title: productTitle,
      reason
    },
    actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/products/${productId}`,
    actionLabel: 'View Feedback',
    channels: ['email', 'inApp'],
    priority: 'high',
    tags: ['product', 'rejection']
  });
}

export async function notifyProductRevisionRequest(productId, artisanId, artisanEmail, productTitle, notes) {
  return createNotification({
    userId: artisanId,
    userEmail: artisanEmail,
    userRole: 'artisan',
    type: 'product-revision-requested',
    title: 'Product Revision Requested',
    message: `Please review the feedback for your product "${productTitle}" and make corrections.`,
    relatedId: productId,
    relatedType: 'product',
    relatedData: {
      title: productTitle,
      notes
    },
    actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/products/${productId}`,
    actionLabel: 'Edit Product',
    channels: ['email', 'inApp', 'push'],
    priority: 'high',
    tags: ['product', 'revision']
  });
}

export async function notifyProductPublished(productId, artisanId, artisanEmail, productTitle) {
  return createNotification({
    userId: artisanId,
    userEmail: artisanEmail,
    userRole: 'artisan',
    type: 'product-published',
    title: 'Product Live! 🚀',
    message: `Your product "${productTitle}" is now available in the shop.`,
    relatedId: productId,
    relatedType: 'product',
    relatedData: {
      title: productTitle
    },
    actionUrl: `${process.env.NEXT_PUBLIC_SHOP_URL}/products/${productId}`,
    actionLabel: 'View in Shop',
    channels: ['email', 'inApp', 'push'],
    priority: 'high',
    tags: ['product', 'published']
  });
}

/**
 * Notify all admins of pending product approval
 */
export async function notifyAdminsProductPending(productId, artisanEmail, productTitle) {
  try {
    const { db } = await connectToDatabase();

    // Find all admins
    const admins = await db.collection('users').find({
      role: { $in: ['admin', 'superadmin'] }
    }).toArray();

    // Send notification to each admin
    for (const admin of admins) {
      await createNotification({
        userId: admin._id.toString(),
        userEmail: admin.email,
        userRole: admin.role,
        type: 'product-submitted-for-review',
        title: 'New Product Awaiting Approval',
        message: `${artisanEmail} submitted "${productTitle}" for approval.`,
        relatedId: productId,
        relatedType: 'product',
        relatedData: {
          title: productTitle,
          artisanEmail
        },
        actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/products/pending`,
        actionLabel: 'Review Now',
        channels: ['email', 'inApp'],
        priority: 'normal',
        tags: ['product', 'pending-review']
      });
    }
  } catch (error) {
    console.error('❌ Error notifying admins:', error);
  }
}

/**
 * Notify all artisans about a new drop opportunity
 */
export async function notifyArtisansAboutDrop(dropRequestId, dropTheme, dropDescription) {
  try {
    const { db } = await connectToDatabase();

    // Find all artisans
    const artisans = await db.collection('users').find({
      role: 'artisan'
    }).toArray();

    // Send notification to each artisan
    for (const artisan of artisans) {
      await createNotification({
        userId: artisan._id.toString(),
        userEmail: artisan.email,
        userRole: 'artisan',
        type: 'drop-request-new',
        title: `New Drop Opportunity: ${dropTheme}`,
        message: `You're invited to participate in a curated drop collection. View the details and submit your products.`,
        relatedId: dropRequestId,
        relatedType: 'drop-request',
        relatedData: {
          theme: dropTheme,
          description: dropDescription
        },
        actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/drops/${dropRequestId}`,
        actionLabel: 'View Opportunity',
        channels: ['email', 'inApp', 'push'],
        priority: 'high',
        tags: ['drop', 'opportunity']
      });
    }
    console.log(`✅ Drop opportunity notifications sent to ${artisans.length} artisans`);
  } catch (error) {
    console.error('❌ Error notifying artisans about drop:', error);
  }
}

/**
 * Notify artisan they were selected for a drop
 */
export async function notifyArtisanSelectedForDrop(dropRequestId, artisanId, artisanEmail, artisanName, dropTheme) {
  return createNotification({
    userId: artisanId,
    userEmail: artisanEmail,
    userRole: 'artisan',
    type: 'artisan-selected-for-drop',
    title: `🎉 You've Been Selected for "${dropTheme}"!`,
    message: `Congratulations! Your products have been selected for our upcoming drop collection.`,
    relatedId: dropRequestId,
    relatedType: 'drop-request',
    relatedData: {
      theme: dropTheme,
      artisanName
    },
    actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/drops/${dropRequestId}/selected`,
    actionLabel: 'View Your Selection',
    channels: ['email', 'inApp', 'push'],
    priority: 'high',
    tags: ['drop', 'selected', 'congratulations']
  });
}

/**
 * Notify artisan they were not selected for a drop
 */
export async function notifyArtisanNotSelectedForDrop(dropRequestId, artisanId, artisanEmail, artisanName, dropTheme) {
  return createNotification({
    userId: artisanId,
    userEmail: artisanEmail,
    userRole: 'artisan',
    type: 'artisan-not-selected',
    title: `Thank You for Submitting to "${dropTheme}"`,
    message: `We received your submission and appreciate your interest. We'd love to see your work in future drops!`,
    relatedId: dropRequestId,
    relatedType: 'drop-request',
    relatedData: {
      theme: dropTheme,
      artisanName
    },
    actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/drops`,
    actionLabel: 'View Other Opportunities',
    channels: ['email', 'inApp'],
    priority: 'normal',
    tags: ['drop', 'not-selected']
  });
}
