
export const getEmailTemplate = (type, data) => {
    switch(type) {
        case 'welcome':
            return `<h1>Welcome ${data.name}!</h1><p>Thanks for joining.</p>`;
        case 'reset_password':
            return `<h1>Reset Password</h1><p>Click <a href="${data.link}">here</a>.</p>`;
        case 'repair_update':
            return `<h1>Repair Update</h1><p>Your repair ${data.repairId} is now ${data.status}.</p>`;
        default:
            return `<p>${data.message || 'Notification'}</p>`;
    }
};

export const formatNotificationMessage = (type, data) => {
    // Basic fallback formatter
    return `[${type.toUpperCase()}] ${data.message}`;
};
