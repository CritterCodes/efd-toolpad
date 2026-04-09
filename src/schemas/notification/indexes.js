/**
 * Indexes for notifications
 */
export const notificationIndexes = [
  { userId: 1, createdAt: -1 },           // Get user's notifications
  { userId: 1, 'inApp.read': 1 },         // Unread notifications
  { userId: 1, isArchived: 1 },           // Active notifications
  { userEmail: 1, 'email.sent': 1 },      // Email delivery tracking
  { relatedId: 1, relatedType: 1 },       // Find notifications by entity
  { type: 1, createdAt: -1 }              // Get notifications by type
];
