
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS, CHANNELS } from './notifications/emailConfigs';
import { getEmailTemplate, formatNotificationMessage } from './notifications/templates';

class NotificationService {
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

    async sendAppNotification(to, type, data) {
        console.log(`Saving app notification for user ${to}`, { type, data });
        return { success: true, status: NOTIFICATION_STATUS.SENT };
    }
}

export { NOTIFICATION_TYPES, NOTIFICATION_STATUS, CHANNELS };
export default new NotificationService();
