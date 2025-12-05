# 📧 Email Templates Quick Reference

## File-Based Template System

All email templates are now stored as HTML files in:
```
efd-admin/public/email-templates/
```

## Available Templates

### Custom Ticket Notifications

| Template Name | File | Recipient | Purpose |
|---------------|------|-----------|---------|
| `custom_ticket_created` | `custom_ticket_created.html` | Client | Ticket confirmation |
| `custom_ticket_status_changed` | `custom_ticket_status_changed.html` | Client | Status update |
| `custom_ticket_message_sent` | `custom_ticket_message_sent.html` | Client | New artisan message |
| `custom_ticket_artisan_assigned` | `custom_ticket_artisan_assigned.html` | Artisan | Assignment notification |
| `custom_ticket_completed` | `custom_ticket_completed.html` | Client | Work complete |
| `custom_ticket_approved` | `custom_ticket_approved.html` | Client | Approval confirmation |

### Admin Tools

| Template Name | File | Purpose |
|---------------|------|---------|
| `test_email` | `test_email.html` | Email system testing |
| `test_email_updated` | `test_email_updated.html` | Updated test template |

## How to Use a Template

### In Notification Creation Code

```javascript
// Example: Creating a custom ticket notification
await NotificationService.createNotification({
  userId: user.id,
  type: NOTIFICATION_TYPES.CUSTOM_TICKET_CREATED,
  title: `Custom Ticket Created - #${ticketNumber}`,
  message: 'Your custom design ticket has been created',
  channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
  data: {
    ticketNumber: '123',
    description: 'Custom jewelry design'
  },
  templateName: 'custom_ticket_created',  // ← Template file name (without .html)
  recipientEmail: 'client@example.com'
});
```

## Template Variables Reference

### Global Variables (Available in All Templates)

```javascript
recipientName       // User's full name
recipientEmail      // User's email address
currentYear         // Current year (for copyright)
companyName         // "Engel Fine Design"
```

### custom_ticket_created.html
```javascript
ticketNumber        // "123"
description         // "Custom jewelry design"
ticketUrl          // Link to ticket details
```

### custom_ticket_status_changed.html
```javascript
ticketNumber       // "123"
previousStatus     // "Open"
newStatus          // "In Progress"
reason             // "Work started on your ticket"
ticketUrl          // Link to ticket details
```

### custom_ticket_message_sent.html
```javascript
ticketNumber       // "123"
fromName           // "Sarah Johnson"
message            // "Your custom design message"
ticketUrl          // Link to ticket details
```

### custom_ticket_artisan_assigned.html
```javascript
ticketNumber       // "123"
artisanType        // "Jewelry Designer"
ticketUrl          // Link to ticket details
```

### custom_ticket_completed.html
```javascript
ticketNumber       // "123"
completionNotes    // "Design is ready for your review"
ticketUrl          // Link to ticket details
```

### custom_ticket_approved.html
```javascript
ticketNumber       // "123"
approvalNotes      // "Perfect! Moving to production"
ticketUrl          // Link to ticket details
```

### test_email.html / test_email_updated.html
```javascript
testId             // Unique test identifier
environment        // "production" or "development"
recipientEmail     // Email receiving the test
timestamp          // When test was sent
```

## Handlebars Syntax

### Basic Variable Insertion
```html
<p>Hello {{recipientName}}</p>
```

### Conditional Display
```html
{{#if reason}}
  <p>Reason: {{reason}}</p>
{{/if}}

{{#if completionNotes}}
  <div class="notes">{{completionNotes}}</div>
{{/if}}
```

### Comparing Values
```html
{{#if reason}}
  <!-- This section shows only if reason variable exists and is not empty -->
{{/if}}
```

## Creating a New Template

### Step 1: Create HTML File
```html
<!-- public/email-templates/my_notification.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Notification</title>
    <style>
        /* Your CSS here */
    </style>
</head>
<body>
    <!-- Your HTML content here with {{variables}} -->
</body>
</html>
```

### Step 2: Use in Notification Code
```javascript
await NotificationService.createNotification({
  userId: user.id,
  type: NOTIFICATION_TYPES.MY_NOTIFICATION,
  title: 'My Notification Title',
  message: 'My notification message',
  channels: [CHANNELS.EMAIL],
  data: {
    myVariable: 'my value'
  },
  templateName: 'my_notification',  // File name (without .html)
  recipientEmail: 'user@example.com'
});
```

## Email Branding Colors

```css
/* Primary - Dark Navy Header */
#0f172a

/* Secondary - Gold Accents */
#fbbf24
#f59e0b

/* Text */
#1f2937  /* Dark gray for body text */
#0f172a  /* Darkest for headers */

/* Backgrounds */
#f9fafb  /* Light gray page background */
#ffffff  /* White content area */

/* Borders */
#e5e7eb  /* Light dividers */

/* Status Colors */
#dcfce7  /* Light green for success */
#388e3c  /* Green text for success */
#ffebee  /* Light red for errors */
#991b1b  /* Red text for errors */
```

## Common CSS Patterns

### Header Box
```html
<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white; padding: 32px 24px; text-align: center;">
    <h1>Your Header</h1>
</div>
```

### Info Box
```html
<div style="background-color: #f0f9ff; border-left: 4px solid #2196F3;
            padding: 16px; border-radius: 4px; margin: 24px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1565c0;">Info Title</h3>
    <p>Your content here</p>
</div>
```

### CTA Button
```html
<a href="{{linkUrl}}" style="display: inline-block;
   background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
   color: #0f172a; padding: 12px 32px; border-radius: 6px;
   text-decoration: none; font-weight: 700; font-size: 14px;">
   Click Here
</a>
```

### Status Badge
```html
<span style="display: inline-block; background-color: #dcfce7;
      color: #166534; padding: 4px 12px; border-radius: 12px;
      font-size: 12px; font-weight: 600;">
   Approved
</span>
```

## Testing Templates

### Send Test Email
```bash
POST /api/admin/test-email
```

### Check Template Rendering
1. Send test email
2. Open email in client
3. Verify:
   - ✅ All variables rendered correctly
   - ✅ Colors display as intended
   - ✅ Mobile formatting works
   - ✅ Links are functional
   - ✅ Images display properly

## Email Client Compatibility

### Best Practices
- Keep CSS simple and inline
- Test in multiple email clients
- Use semantic HTML
- Avoid external scripts
- Keep images optimized
- Test on mobile devices

### Supported Email Clients
- Gmail (web and mobile)
- Outlook (web and desktop)
- Apple Mail
- Thunderbird
- Yahoo Mail
- Mobile clients (iOS Mail, Gmail app)

## Troubleshooting

### Template Not Loading
**Error:** `Error loading email template my_notification`

**Check:**
1. File name matches templateName (without .html extension)
2. File exists in `public/email-templates/`
3. File is valid HTML
4. No typos in file name

### Variables Not Rendering
**Problem:** `{{variableName}}` appears in email

**Check:**
1. Variable passed in `data` object
2. Correct spelling (case-sensitive)
3. Variable has a value (not null/undefined)
4. Handlebars syntax is correct

### Styling Issues
**Problem:** Colors or layout looks wrong

**Check:**
1. Email client supports inline CSS
2. Use `style` attribute instead of `<style>` tags
3. Test in target email client
4. Use web-safe colors
5. Keep CSS simple and straightforward

## Performance Tips

1. **Minimize CSS** - Inline only what's necessary
2. **Optimize Images** - Compress before embedding
3. **Template Caching** - System caches compiled templates
4. **Async Sending** - Emails sent asynchronously
5. **Batch Operations** - Send multiple emails efficiently

## Security Notes

- All HTML is rendered fresh for each email
- User data is escaped in templates
- Email addresses validated before sending
- Gmail SMTP authentication required
- App passwords used instead of account password

---

**Last Updated:** 2024  
**System Version:** Unified EFD Email v1.0  
**Template Engine:** Handlebars
