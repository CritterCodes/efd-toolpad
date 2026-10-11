/**
 * Ask an account what they thought — STAFF ONLY.
 *
 * POST mints a request, emails the account a public link, and returns the link so it can also be sent by
 * hand. GET lists what we have asked and what came back.
 *
 * `middleware.js` deliberately skips `/api/*`, so this route checks the session itself. It has to: the
 * list carries customers' names, addresses and their opinions of us, and minting a request sends mail in
 * Engel Fine Design's name. Neither is something a signed-in artisan or store should be able to do.
 */
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';
import { createTestimonialRequest, listRequests, markSent } from '@/services/feedback/testimonialRequest';
import { adminBase } from '@/lib/appUrls';
import { sendEmail } from '../../../../../lib/email.js';
import { renderEmailShell, emailButton, esc } from '../../../../../lib/emailTheme.js';

export const feedbackLink = (token) => `${adminBase().replace(/\/$/, '')}/feedback/${token}`;

export async function GET() {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    return Response.json({ success: true, data: await listRequests({ limit: 200 }) });
  } catch (error) {
    console.error('[feedback] list failed:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { errorResponse, session } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const created = await createTestimonialRequest({
      accountID: body.accountID || null,
      accountName: body.accountName || '',
      recipientEmail: body.recipientEmail || '',
      context: body.context || {},
      createdBy: session?.user?.userID || null,
    });

    const url = feedbackLink(created.token);
    const who = created.accountName || 'there';
    const about = created.context.label
      ? ` about ${esc(created.context.label)}`
      : ' about the work we have done for you';

    // Best-effort: a failed send must not lose the request. The link comes back either way, so it can
    // be pasted into a message by hand.
    let emailed = false;
    try {
      await sendEmail({
        to: created.recipientEmail,
        subject: 'How did we do?',
        template: 'generic',
        data: {
          __html: renderEmailShell({
            title: 'How did we do?',
            preheader: 'Two questions, and whether we may quote you.',
            bodyHtml: `
              <p>Hi ${esc(who)},</p>
              <p>We would like to know what you thought${about} — honestly, including if something
                 was not right.</p>
              <p>It is two questions and takes under a minute. The last one asks whether we may quote
                 you; it is entirely up to you, and saying no changes nothing.</p>
              ${emailButton(url, 'Tell us how we did')}
              <p style="font-size:13px;color:#666">Or paste this into your browser:<br />${esc(url)}</p>
            `,
            footerNote: 'You are getting this because you have had work done with us.',
          }),
        },
      });
      emailed = true;
      await markSent(created.token);
    } catch (mailError) {
      console.error('[feedback] invitation email failed:', mailError.message);
    }

    return Response.json({
      success: true,
      data: { requestID: created.requestID, url, emailed, recipientEmail: created.recipientEmail },
    }, { status: 201 });
  } catch (error) {
    const status = error.code === 'NO_RECIPIENT' ? 400 : 500;
    console.error('[feedback] create failed:', error.message);
    return Response.json({ success: false, error: error.message }, { status });
  }
}
