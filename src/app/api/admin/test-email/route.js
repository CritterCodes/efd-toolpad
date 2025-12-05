/**
 * Test Email API Endpoint
 * Sends a test email to verify email configuration is working
 * 
 * POST /api/admin/test-email
 * Body: { recipientEmail?: string }
 */

import { auth } from '@/lib/auth';
import { notificationService } from '@/lib/notificationService';
import { USER_ROLES } from '@/lib/unifiedUserService';

export async function POST(request) {
    try {
        // Check authentication
        const session = await auth();
        
        if (!session) {
            return Response.json(
                { error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Check authorization (dev or admin only)
        const userRole = session.user?.role;
        if (userRole !== USER_ROLES.DEV && userRole !== USER_ROLES.ADMIN) {
            return Response.json(
                { error: 'Forbidden - Dev tools access required' },
                { status: 403 }
            );
        }

        // Get recipient email from request
        const body = await request.json();
        const recipientEmail = body.recipientEmail || session.user?.email;

        if (!recipientEmail) {
            return Response.json(
                { error: 'No recipient email provided' },
                { status: 400 }
            );
        }

        console.log(`[Test Email] Sending test email to ${recipientEmail}`);

        // Send test email via notification service
        const result = await notificationService.sendEmail({
            to: recipientEmail,
            subject: '🧪 EFD Admin - Test Email',
            template: 'test_email',
            data: {
                userName: session.user?.name || 'Admin User',
                timestamp: new Date().toLocaleString(),
                environment: process.env.NODE_ENV,
                testId: `test-${Date.now()}`
            }
        });

        console.log('[Test Email] Email sent successfully', {
            to: recipientEmail,
            messageId: result.messageId
        });

        return Response.json({
            success: true,
            message: `Test email sent successfully to ${recipientEmail}`,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Test Email] Error sending test email:', error);

        return Response.json({
            error: 'Failed to send test email',
            details: error.message,
            type: error.constructor.name
        }, {
            status: 500
        });
    }
}

// Export GET to prevent method not allowed errors when visiting the endpoint
export async function GET(request) {
    return Response.json({
        error: 'Method not allowed',
        message: 'Use POST to send a test email'
    }, {
        status: 405
    });
}
