/**
 * The public end of a feedback request — authorized by the emailed token, exactly as
 * `auth/reset-password` is. There is no session here on purpose: the accounts whose opinion is worth
 * having do not use the app. Marlen Jewelers, the best account on the books, has never created a repair
 * in it; a page behind a login would be a page they never see.
 *
 * What the token buys is narrow. It reads and answers ONE request, through `publicView`, which never
 * returns the token itself, who asked for it, or the address it went to. A leaked link exposes one
 * account's own feedback and nothing else, and cannot be walked to a second one.
 */
import { findByToken, recordResponse, publicView } from '@/services/feedback/testimonialRequest';

export async function GET(_request, { params }) {
  const { token } = await params;
  const found = await findByToken(token);
  if (!found) {
    return Response.json({ success: false, error: 'This feedback link is not valid.' }, { status: 404 });
  }
  return Response.json({ success: true, data: publicView(found) });
}

export async function POST(request, { params }) {
  const { token } = await params;
  try {
    const body = await request.json();
    const saved = await recordResponse(token, {
      rating: body.rating,
      comment: body.comment,
      // Passed straight through. The service is the one place that decides what counts as consent, and
      // it takes a literal `true` only — see testimonialRequest.test.js.
      mayQuote: body.mayQuote,
      attribution: body.attribution,
      attributionName: body.attributionName,
    });
    return Response.json({ success: true, data: publicView(saved) });
  } catch (error) {
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'BAD_RATING' ? 400 : 500;
    if (status === 500) console.error('[feedback] response failed:', error.message);
    return Response.json({ success: false, error: error.message }, { status });
  }
}
