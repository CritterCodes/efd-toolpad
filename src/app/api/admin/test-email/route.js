/**
 * POST /api/admin/test-email — prove the mail path works, end to end, and say exactly why if it doesn't.
 * Body: { recipientEmail?: string }   (defaults to the caller's own address)
 *
 * DELIBERATELY BYPASSES NotificationService. That layer is fire-and-forget by design — it catches send
 * failures so a dead mail server can never roll back a payment — which makes it useless as a diagnostic:
 * it reports success either way. This route calls the transport directly and returns the real error.
 *
 * It also reports WHICH credential key names were found. That is the whole reason email was dead from
 * 2026-03-22: a line-count refactor moved the transport to a module reading EMAIL_USER/EMAIL_PASSWORD
 * while production had GMAIL_USER/GMAIL_APP_PASSWORD, and nothing surfaced the mismatch for months.
 * Key NAMES only — never values.
 */

import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/lib/unifiedUserService';
import { sendEmail, resolveMailCredentials } from '../../../../../lib/email.js';

const CREDENTIAL_KEYS = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_PASS', 'EMAIL_FROM'];

/** Which credential names are set, so a mismatch is visible without exposing any secret. */
function credentialReport() {
    return CREDENTIAL_KEYS.reduce((acc, key) => {
        acc[key] = Boolean(process.env[key]);
        return acc;
    }, {});
}

export async function POST(request) {
    const session = await auth();
    if (!session) return Response.json({ error: 'Unauthorized - Please log in' }, { status: 401 });

    const role = session.user?.role;
    if (role !== USER_ROLES.DEV && role !== USER_ROLES.ADMIN) {
        return Response.json({ error: 'Forbidden - Dev tools access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const recipientEmail = body.recipientEmail || session.user?.email;
    if (!recipientEmail) return Response.json({ error: 'No recipient email provided' }, { status: 400 });

    const credentials = credentialReport();

    // Report the resolution BEFORE attempting a send, so a naming problem is distinguishable from an
    // authentication problem. These are the two failures that look identical from the outside.
    let resolvedUser = null;
    try {
        resolvedUser = resolveMailCredentials().user;
    } catch (error) {
        return Response.json({
            ok: false,
            stage: 'credentials',
            error: error.message,
            credentials,
            hint: 'No usable credential pair. Set GMAIL_USER + GMAIL_APP_PASSWORD (what production uses).',
        }, { status: 500 });
    }

    try {
        // Pre-rendered html, so this does not also depend on a .hbs template resolving inside the
        // lambda — one failure at a time.
        const result = await sendEmail({
            to: recipientEmail,
            subject: `EFD mail test — ${new Date().toISOString()}`,
            template: 'generic-notification',
            data: {
                __html: '<div style="font-family:Arial,sans-serif"><h2>Mail is working</h2>'
                    + `<p>Sent to ${recipientEmail} from the admin dev tools.</p>`
                    + `<p style="color:#6B7280">If you are reading this, the transport authenticated and delivered.</p></div>`,
            },
        });
        return Response.json({
            ok: true,
            sentTo: recipientEmail,
            sentFrom: resolvedUser,
            messageId: result.messageId,
            credentials,
        });
    } catch (error) {
        // The real SMTP error, not a swallowed one.
        return Response.json({
            ok: false,
            stage: 'send',
            error: error.message,
            credentials,
            sentFrom: resolvedUser,
            hint: /5\d\d|invalid login|username and password/i.test(String(error.message))
                ? 'Credentials resolved but Gmail rejected them — the app password is likely revoked or stale. Generate a new one and update GMAIL_APP_PASSWORD.'
                : 'Transport error. See the message above.',
        }, { status: 500 });
    }
}

export async function GET() {
    return Response.json({ error: 'Method not allowed', message: 'Use POST to send a test email' }, { status: 405 });
}
