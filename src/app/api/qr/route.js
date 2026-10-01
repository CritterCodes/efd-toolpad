import QRCode from 'qrcode';
import { requireAuth } from '@/lib/apiAuth';

/**
 * GET /api/qr?data=<text>&size=<px>&margin=<modules> — a QR code as SVG, generated here (EFD-DEFECTS C7).
 *
 * Every printed ticket, receipt, invoice and intake slip used to fetch its QR from api.qrserver.com: a
 * third-party call per print, prints that broke when it was down, and every ticket's repair ID / invoice ID sent
 * to it. Signed-in only (print pages send their session cookie); the text is capped so this can't be used to
 * render arbitrary payloads at scale. Use the `qrSrc` helper (src/lib/qr.js) rather than building the URL by hand.
 */
const MAX_DATA = 512;

export async function GET(request) {
  const { errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data') || '';
  if (!data || data.length > MAX_DATA) {
    return new Response(JSON.stringify({ error: `data is required (up to ${MAX_DATA} characters)` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const size = Math.min(1024, Math.max(32, parseInt(searchParams.get('size'), 10) || 120));
  const margin = Math.min(8, Math.max(0, parseInt(searchParams.get('margin') ?? '1', 10) || 0));

  const svg = await QRCode.toString(data, { type: 'svg', width: size, margin, errorCorrectionLevel: 'M' });
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      // The same text always makes the same image; private because it's behind a session.
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
