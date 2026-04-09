
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS, CHANNELS } from './notifications/emailConfigs';
import { getEmailTemplate, formatNotificationMessage } from './notifications/templates';

export class NotificationService {
    static instance = new NotificationService();

    static async sendNotification(options) {
        return NotificationService.instance.sendNotification(options);
    }

    static async sendEmail(to, type, data) {
        return NotificationService.instance.sendEmail(to, type, data);
    }

    static async sendSMS(to, type, data) {
        return NotificationService.instance.sendSMS(to, type, data);
    }

    static async getNotifications(userId, options = {}) {
        return NotificationService.instance.getNotifications(userId, options);
    }

    static async createNotification(notificationData) {
        return NotificationService.instance.createNotification(notificationData);
    }

    static async markAsRead(notificationId) {
        return NotificationService.instance.markAsRead(notificationId);
    }

    static async archiveNotification(notificationId) {
        return NotificationService.instance.archiveNotification(notificationId);
    }

    static async sendEmailNotification(to, type, data) {
        return NotificationService.instance.sendEmailNotification(to, type, data);
    }

    static async sendAppNotification(to, type, data) {
        return NotificationService.instance.sendAppNotification(to, type, data);
    }

    async sendNotification(options) {
        const { type, channel, to, data } = options;
        
        switch(channel) {
            case CHANNELS.EMAIL:
                return this.sendEmail(to, type, data);
            case CHANNELS.SMS:
                return this.sendSMS(to, type, data);
            default:
                return this.sendAppNotification(to, type, data);
        }
    }

    async sendEmail(to, type, data) {
        const html = getEmailTemplate(type, data);
        console.log(`Sending email to ${to} of type ${type}`, { html });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }

    async sendSMS(to, type, data) {
        const message = formatNotificationMessage(type, data);
        console.log(`Sending SMS to ${to}`, { message });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }

    async getNotifications(userId, options = {}) {
        console.log(`Fetching notifications for user ${userId}`, options);
        return {
            notifications: [],
            total: 0,
            unreadCount: 0,
            page: 1,
            totalPages: 0
        };
    }

    async createNotification(notificationData) {
        const { userId, userID, recipientUserId, type, title, message, channel, data } = notificationData || {};
        const targetUserId = userId || userID || recipientUserId || 'unknown-user';

        console.log(`Creating notification for user ${targetUserId}`, {
            type,
            title,
            message,
            channel,
            data
        });

        return {
            success: true,
            id: `${Date.now()}`,
            status: NOTIFICATION_STATUS.SENT
        };
    }

    async markAsRead(notificationId) {
        console.log(`Marking notification ${notificationId} as read`);
        return true;
    }

    async archiveNotification(notificationId) {
        console.log(`Archiving notification ${notificationId}`);
        return true;
    }

    async sendEmailNotification(to, type, data) {
        return this.sendEmail(to, type, data);
    }

    async sendAppNotification(to, type, data) {
        console.log(`Saving app notification for user ${to}`, { type, data });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }
}

export { NOTIFICATION_TYPES, NOTIFICATION_STATUS, CHANNELS };
export default NotificationService.instance;
