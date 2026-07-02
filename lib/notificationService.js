import { ObjectId } from 'mongodb';
import { sendNotificationEmail } from './email.js';
import { sendPushToUser } from './webPush.js';
import { db as mongo } from '../src/lib/database.js';

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
  channels: requestedChannels = ['email', 'inApp'],
  priority = 'normal',
  tags = []
}) {
  try {
    const db = await mongo.connect();
    const now = new Date();

    // Every in-app notification is also delivered as a Web Push (opt-in by subscription),
    // mirroring efd-shop — makes "all notifications push" the default without touching callers.
    const channels = requestedChannels.includes('inApp') && !requestedChannels.includes('push')
      ? [...requestedChannels, 'push']
      : requestedChannels;

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
      await sendPushNotificationChannel(db, notification);
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
 * Send notification via Web Push channel (to all of the user's registered subscriptions).
 * Best-effort: records status on the notification doc; never throws.
 */
async function sendPushNotificationChannel(db, notification) {
  try {
    const result = await sendPushToUser(notification.userId, {
      title: notification.title,
      body: notification.message,
      url: notification.actionUrl || notification.relatedData?.actionUrl || '/',
      tag: notification.type,
      data: {
        notificationId: notification._id?.toString(),
        type: notification.type,
        url: notification.actionUrl || notification.relatedData?.actionUrl || '/',
      },
    });
    await db.collection('notifications').updateOne(
      { _id: notification._id },
      {
        $set: {
          'pushNotification.sent': !!result.success,
          'pushNotification.sentAt': new Date(),
          ...(result.reason ? { 'pushNotification.error': result.reason } : {}),
          updatedAt: new Date(),
        },
      },
    );
  } catch (error) {
    console.error('[push] channel send failed:', error.message);
    await db.collection('notifications').updateOne(
      { _id: notification._id },
      { $set: { 'pushNotification.error': error.message, updatedAt: new Date() } },
    ).catch(() => {});
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
    const db = await mongo.connect();

    // Allow marking either the user's own notification OR an 'admin' broadcast (shared
    // read-state across admins is acceptable — INF-3).
    const result = await db.collection('notifications').findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        userId: { $in: [userId, 'admin'] }
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
 * Archive a notification
 */
export async function archiveNotification(notificationId) {
  try {
    const db = await mongo.connect();

    const result = await db.collection('notifications').findOneAndUpdate(
      { _id: new ObjectId(notificationId) },
      {
        $set: {
          isArchived: true,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value;
  } catch (error) {
    console.error('❌ Error archiving notification:', error);
    throw error;
  }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(userId, { limit = 20, page = 1, unreadOnly = false, includeAdminBroadcast = false } = {}) {
  try {
    const db = await mongo.connect();

    // Admins also see broadcast alerts addressed to the literal userId 'admin' — these are
    // the shop→admin alerts (client message, quote accepted, etc.) the efd-shop writes with
    // userId:'admin'. Gated to admin roles by the caller (INF-3).
    const query = includeAdminBroadcast ? { userId: { $in: [userId, 'admin'] } } : { userId };
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
 * Fan a notification out to every admin/superadmin (in-app + email, auto-push).
 * Generic helper for admin-facing alerts (new leads, submissions, inbound client actions).
 * Best-effort per admin; never throws.
 *
 * @param {object} opts { type, title, message, relatedId?, relatedType?, relatedData?,
 *                        actionUrl?, actionLabel?, priority?, tags?, channels? }
 */
export async function notifyAllAdmins({
  type,
  title,
  message,
  relatedId = '',
  relatedType = '',
  relatedData = {},
  actionUrl = '',
  actionLabel = 'View Details',
  priority = 'normal',
  tags = [],
  channels = ['inApp', 'email'],
}) {
  try {
    const db = await mongo.connect();
    const admins = await db.collection('users').find({
      role: { $in: ['admin', 'superadmin', 'dev'] },
    }).toArray();

    for (const admin of admins) {
      const adminUserID = admin.userID || admin._id?.toString();
      try {
        await createNotification({
          userId: adminUserID,
          userEmail: admin.email,
          userRole: admin.role,
          type,
          title,
          message,
          relatedId,
          relatedType,
          relatedData,
          actionUrl,
          actionLabel,
          channels,
          priority,
          tags,
        });
      } catch (err) {
        console.error(`❌ notifyAllAdmins: failed for ${adminUserID}:`, err.message);
      }
    }
    return { success: true, count: admins.length };
  } catch (error) {
    console.error('❌ notifyAllAdmins error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify all admins of pending product approval
 */
export async function notifyAdminsProductPending(productId, artisanEmail, productTitle) {
  try {
    const db = await mongo.connect();

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
    const db = await mongo.connect();

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
