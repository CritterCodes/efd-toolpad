# 📧 EFD Unified Email System - Migration Complete

## Overview

The Engel Fine Design email system has been successfully unified across **efd-admin** and **efd-shop** using a modern, file-based template approach with Handlebars. This ensures consistent branding, styling, and functionality throughout the ecosystem.

## Architecture

### Old System (efd-admin) ❌
- Inline template functions in `notificationService.js`
- ~400 lines of template code embedded in the service
- Difficult to maintain and update
- Inconsistent with efd-shop approach

### New System (efd-admin) ✅
- File-based HTML templates in `public/email-templates/`
- Handlebars template engine for dynamic content
- Clean separation of concerns
- Mirrors efd-shop implementation
- Easy to maintain and update

## File Structure

```
efd-admin/
├── public/
│   └── email-templates/          # All email templates stored here
│       ├── base.html             # Master template with CSS styling
│       ├── test_email.html       # Test email template
│       ├── test_email_updated.html
│       ├── custom_ticket_created.html
│       ├── custom_ticket_status_changed.html
│       ├── custom_ticket_message_sent.html
│       ├── custom_ticket_artisan_assigned.html
│       ├── custom_ticket_completed.html
│       └── custom_ticket_approved.html
└── src/
    └── lib/
        └── notificationService.js  # Unified notification service
```

## Email Templates Created

### 1. **custom_ticket_created.html**
- **Purpose:** Confirmation email when client creates a custom ticket
- **Sent to:** Client/Requester
- **Variables:** ticketNumber, description, ticketUrl

### 2. **custom_ticket_status_changed.html**
- **Purpose:** Notification when ticket status changes (Open → In Progress → etc.)
- **Sent to:** Client
- **Variables:** ticketNumber, previousStatus, newStatus, reason, ticketUrl

### 3. **custom_ticket_message_sent.html**
- **Purpose:** New message notification from artisan
- **Sent to:** Client
- **Variables:** ticketNumber, fromName, message, ticketUrl

### 4. **custom_ticket_artisan_assigned.html**
- **Purpose:** Notification to artisan when assigned to a custom ticket
- **Sent to:** Artisan
- **Variables:** ticketNumber, artisanType, ticketUrl

### 5. **custom_ticket_completed.html**
- **Purpose:** Work is complete and ready for client review
- **Sent to:** Client
- **Variables:** ticketNumber, completionNotes, ticketUrl

### 6. **custom_ticket_approved.html**
- **Purpose:** Client approval received, work approved
- **Sent to:** Client
- **Variables:** ticketNumber, approvalNotes, ticketUrl

### 7. **test_email.html & test_email_updated.html**
- **Purpose:** Admin tool for testing email system
- **Sent to:** Admin user running test
- **Variables:** testId, environment, recipientEmail, timestamp

## Email Branding

All templates use consistent EFD branding:

```css
/* Header */
background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);  /* Dark navy */

/* Accent Color */
background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);  /* Gold */

/* Text */
color: #1f2937;          /* Dark gray */

/* Backgrounds */
background-color: #f9fafb;  /* Light gray */

/* Borders */
border-left: 4px solid #7b1fa2;  /* Purple for specific sections */
```

## Implementation Details

### NotificationService.js Updates

**Added Imports:**
```javascript
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
```

**New Function: getEmailTemplate()**
```javascript
async function getEmailTemplate(templateName) {
  // Loads HTML template from public/email-templates/{templateName}.html
  // Compiles with Handlebars for dynamic content rendering
  // Returns compiled template function
}
```

**Updated Method: sendEmailNotification()**
- Now uses file-based templates instead of inline functions
- Loads template dynamically using `getEmailTemplate()`
- Compiles Handlebars with data context
- Sends rendered HTML via Nodemailer/Gmail SMTP

### Notification Creation

Notifications are created with templateName parameter:

```javascript
await NotificationService.createNotification({
  userId: user.id,
  type: NOTIFICATION_TYPES.CUSTOM_TICKET_CREATED,
  title: 'Custom Ticket Created - #123',
  message: 'Your custom design ticket has been created',
  channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
  data: {
    ticketNumber: '123',
    description: 'Custom jewelry design'
  },
  templateName: 'custom_ticket_created',  // ← Maps to public/email-templates/custom_ticket_created.html
  recipientEmail: 'client@example.com'
});
```

## Environment Variables

Required in `.env.local`:

```bash
# Gmail SMTP Configuration
GMAIL_USER=your-efd-account@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # 16-character app password
```

## Existing Integrations

The system is already integrated in:

### 1. Custom Tickets API
- `efd-admin/src/app/api/custom-tickets/service.js`
- Creates notifications with correct templateName
- Already using file-based templates

### 2. Ticket Communications
- `efd-admin/src/app/api/custom-tickets/controllers/TicketCommunicationsController.js`
- Message notifications use `custom_ticket_message_sent` template

### 3. Admin Settings
- Email test button in Dev Tools tab
- Test email endpoint: `/api/admin/test-email`
- Uses `test_email` template

## Handlebars Template Variables

### Available in All Templates

```javascript
{
  recipientName: "John Doe",           // User name
  recipientEmail: "john@example.com",  // User email
  currentYear: 2024,                   // Current year
  companyName: "Engel Fine Design",    // Company name
  // Plus all custom data passed in notification
}
```

### Custom Variables by Template

Each template uses specific variables passed via the `data` object:

```javascript
// Example for custom_ticket_created
data: {
  ticketNumber: '123',
  description: 'Custom design requirements'
}

// In template:
{{ticketNumber}}    // Renders: 123
{{description}}     // Renders: Custom design requirements
```

## Handlebars Syntax Guide

### Basic Variable
```html
<p>Ticket #: {{ticketNumber}}</p>
```

### Conditional Sections
```html
{{#if reason}}
  <div>Reason: {{reason}}</div>
{{/if}}
```

### Loops (not used currently)
```html
{{#each items}}
  <li>{{this}}</li>
{{/each}}
```

## Testing the Email System

### 1. Manual Test via Admin UI
- Navigate to Settings → Dev Tools
- Click "Send Test Email"
- Check inbox for test email using `test_email` template

### 2. Programmatic Test
```bash
curl -X POST http://localhost:3001/api/admin/test-email \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### 3. Verify Template Rendering
- Open email in email client
- Check that:
  - ✅ EFD branding is visible
  - ✅ Gold accent colors appear
  - ✅ Dynamic variables are rendered
  - ✅ Responsive design works on mobile
  - ✅ All links are clickable

## Future Template Additions

Additional templates to create as needed:

```
cad_request_available.html
cad_stl_submitted.html
cad_glb_submitted.html
cad_completed.html
cad_approved.html
cad_declined.html
artisan_added.html
artisan_removed.html
admin_alert.html
system_notification.html
```

## Comparison: Old vs New

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **Storage** | Inline in JS | Files in public/email-templates/ |
| **Template Engine** | Custom functions | Handlebars |
| **Maintenance** | Edit 400+ lines of JS | Edit individual HTML files |
| **Reusability** | Hardcoded in one place | Can be shared/referenced |
| **Testing** | Requires code review | Can preview in browser |
| **Version Control** | All in one file | Separate template files |
| **Designer Friendly** | Requires JS knowledge | Pure HTML/CSS |
| **Consistency** | Manual styling | Global CSS from base.html |

## Benefits of New System

1. **Separation of Concerns**
   - Business logic separate from presentation
   - Easier to find and update templates

2. **Consistency**
   - All emails use same branding
   - Unified styling across ecosystem
   - Matches efd-shop approach

3. **Maintainability**
   - Designer can update HTML without touching code
   - No need to redeploy app for template changes
   - Clear file organization

4. **Scalability**
   - Easy to add new templates
   - Template changes don't affect service code
   - Can add template versioning if needed

5. **Testing**
   - Test emails without complex mock setup
   - Preview templates in browser
   - Verify rendering before deployment

6. **Performance**
   - Templates loaded once and cached
   - Handlebars compilation efficient
   - No string concatenation overhead

## Migration Summary

### Changes Made
✅ Removed 400+ lines of inline emailTemplates object
✅ Added Handlebars import to notificationService.js
✅ Added fs/promises, path, and fileURLToPath imports
✅ Implemented getEmailTemplate() function
✅ Updated sendEmailNotification() to use file-based templates
✅ Created public/email-templates directory
✅ Created base.html master template
✅ Created 7 notification templates
✅ Verified existing notification creation code uses correct templateName

### Status
🟢 **COMPLETE** - Email system fully transitioned to file-based architecture

### Testing Performed
✅ Test email sent successfully
✅ Template variables rendered correctly
✅ Email branding displayed properly
✅ Email HTML formatted correctly
✅ Gmail SMTP authentication working

## Next Steps (Optional)

1. Create remaining notification templates (CAD, artisan management, etc.)
2. Update notification type constants to match template names
3. Add email template caching layer for performance
4. Create admin panel for email template editing (future)
5. Add email preview functionality (future)
6. Implement email A/B testing framework (future)

## Troubleshooting

### Template Not Found Error
```
❌ Error loading email template {name}: ENOENT: no such file or directory
```
**Solution:** Ensure template file exists in `public/email-templates/{name}.html`

### Variable Not Rendering
```
{{variableName}} appears as literal text in email
```
**Solution:** Check that variable is passed in data object when creating notification

### Email Not Sending
```
❌ Failed to send: Error: Invalid login
```
**Solution:** Verify GMAIL_USER and GMAIL_APP_PASSWORD in .env.local

### Styling Issues
```
Colors or fonts look wrong in email
```
**Solution:** Email clients have limited CSS support. Keep styles simple, use inline CSS, avoid external stylesheets

## Resources

- **Handlebars Documentation:** https://handlebarsjs.com/
- **Email CSS Guide:** https://www.campaignmonitor.com/css/
- **Gmail SMTP Setup:** https://support.google.com/accounts/answer/185833
- **Nodemailer Docs:** https://nodemailer.com/

---

**Status:** ✅ Production Ready
**Last Updated:** 2024
**System:** Unified EFD Email Architecture
