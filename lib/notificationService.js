import { ObjectId } from 'mongodb';
import { sendNotificationEmail } from './email.js';
import { sendPushToUser } from './webPush.js';
import { db as mongo } from '../src/lib/database.js';
import { adminBase, shopBase } from './appUrls.js';

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

    // If we know WHO this is for, we know where to send it.
    //
    // 126 notifications were written and then failed with "no recipient email on the notification";
    // 39 of them carried a `userId` whose user had an address on file the whole time. The callers are
    // not wrong to omit it — a repair record does not always copy the customer's email, and asking two
    // dozen call sites each to remember a lookup is how you get nineteen that remember and five that
    // do not. So the lookup lives at the sink, where every type passes through once.
    //
    // Only for email, only when blank, and never fatal: a notification that cannot find an address is
    // still worth writing, because the in-app copy is real.
    let resolvedEmail = userEmail;
    if (!resolvedEmail && userId && channels.includes('email')) {
      try {
        const owner = await db.collection('users').findOne(
          { userID: userId },
          { projection: { _id: 0, email: 1 } },
        );
        if (owner?.email) resolvedEmail = owner.email;
      } catch (lookupError) {
        console.error('notification recipient lookup failed:', lookupError.message);
      }
    }

    // Create notification document
    const notification = {
      userId,
      // The resolved address, so the stored document says who it actually went to.
      userEmail: resolvedEmail,
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
/**
 * THE `email.sent` FLAG USED TO BE FICTION.
 *
 * `sendNotificationEmail` CATCHES its own failure and returns `{ success: false, reason }` instead of
 * throwing, so this function's try/catch never fired and it wrote `email.sent: true` for every
 * notification whether or not anything was delivered — then logged "✅ Email notification sent".
 *
 * That is exactly how it went unnoticed: EMAIL_USER/EMAIL_PASSWORD were never set in production, so
 * every email in the app's history failed three retries and was recorded as sent. Production logs show
 * the two lines back to back:
 *
 *   ❌ Failed to send payment-received email to <customer>: EMAIL_USER and EMAIL_PASSWORD ... required
 *   ✅ Email notification sent to <customer>
 *
 * A customer paid $5,500 in cash, the record said the receipt had been emailed, and nothing had been.
 * The flag has to be able to say "no", or nobody finds out until a customer asks.
 */
async function sendNotificationEmailChannel(db, notification) {
  try {
    // A blank recipient can never be delivered. It used to be recorded as a success, which is how a
    // notification addressed to `''` (an unset admin env var) looked identical to a delivered one.
    if (!notification.userEmail) {
      throw new Error('no recipient email on the notification');
    }

    const result = await sendNotificationEmail({
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

    // `sendNotificationEmail` reports failure by RETURN VALUE, not by throwing. Without this check the
    // catch below is unreachable and every send is recorded as delivered.
    if (result && result.success === false) {
      throw new Error(result.reason || 'email send failed');
    }

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
/**
 * Whose notifications a caller may change: their own, plus the shared 'admin' broadcasts when they are an
 * admin (shared read-state across admins is acceptable — INF-3). A non-admin never touches a broadcast.
 */
export function notificationOwnerFilter(userId, { isAdmin = false } = {}) {
  return { userId: { $in: isAdmin ? [userId, 'admin'] : [userId] } };
}

export async function markNotificationAsRead(notificationId, userId, { isAdmin = true } = {}) {
  try {
    const db = await mongo.connect();

    const result = await db.collection('notifications').findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        ...notificationOwnerFilter(userId, { isAdmin }),
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
/** Archive one of the caller's notifications. Unscoped, any signed-in account could archive anyone's (2026-10-01). */
export async function archiveNotification(notificationId, userId, { isAdmin = false } = {}) {
  if (!userId) throw new Error("archiveNotification needs the caller's userId");
  try {
    const db = await mongo.connect();

    const result = await db.collection('notifications').findOneAndUpdate(
      { _id: new ObjectId(notificationId), ...notificationOwnerFilter(userId, { isAdmin }) },
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
    actionUrl: `${adminBase()}/products/${productId}`,
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
    actionUrl: `${adminBase()}/products/${productId}`,
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
    actionUrl: `${adminBase()}/products/${productId}`,
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
    actionUrl: `${shopBase()}/products/${productId}`,
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
        actionUrl: `${adminBase()}/products/pending`,
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
        actionUrl: `${adminBase()}/drops/${dropRequestId}`,
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
    actionUrl: `${adminBase()}/drops/${dropRequestId}/selected`,
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
    actionUrl: `${adminBase()}/drops`,
    actionLabel: 'View Other Opportunities',
    channels: ['email', 'inApp'],
    priority: 'normal',
    tags: ['drop', 'not-selected']
  });
}
