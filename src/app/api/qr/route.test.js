import { describe, it, expect, vi } from 'vitest';
import { qrSrc } from '@/lib/qr';

/** EFD-DEFECTS C7: QR codes are made here, not fetched from api.qrserver.com. */
let signedIn = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAuth: async () => (signedIn
    ? { session: { user: { userID: 'u1' } }, errorResponse: null }
    : { session: null, errorResponse: new Response('{}', { status: 401 }) }),
}));

const { GET } = await import('./route');
const get = (qs) => GET(new Request(`http://admin.test/api/qr?${qs}`));

describe('/api/qr', () => {
  it('returns an SVG QR code for the signed-in', async () => {
    signedIn = true;
    const res = await get('data=repair-1a2b3c4d&size=96&margin=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    expect(await res.text()).toMatch(/^<svg/);
  });

  it('refuses a stranger, empty data, and oversized data', async () => {
    signedIn = false;
    expect((await get('data=x')).status).toBe(401);
    signedIn = true;
    expect((await get('data=')).status).toBe(400);
    expect((await get(`data=${'x'.repeat(600)}`)).status).toBe(400);
  });

  it('the helper points at our own route, never a third party', () => {
    expect(qrSrc('invoice:rinv-1', { size: 140, margin: 0 })).toBe('/api/qr?data=invoice%3Arinv-1&size=140&margin=0');
  });
});
