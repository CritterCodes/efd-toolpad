const fs = require('fs');
const content = fs.readFileSync('src/lib/notificationService.js', 'utf8');

if (!content.includes('getNotifications')) {
  const newContent = content.replace(
    'async sendAppNotification(to, type, data) {',
    `async getNotifications(userId, options = {}) {
        console.log(\`Fetching notifications for user \${userId}\`, options);
        return {
            notifications: [],
            total: 0,
            unreadCount: 0,
            page: 1,
            totalPages: 0
        };
    }

    async sendAppNotification(to, type, data) {`
  );
  fs.writeFileSync('src/lib/notificationService.js', newContent);
  console.log('Added getNotifications stub');
} else {
  console.log('Already exists');
}
