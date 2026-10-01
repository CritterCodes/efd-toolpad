/**
 * The image URL for a QR code of `value`, served by our own /api/qr (EFD-DEFECTS C7: prints used to fetch every
 * QR from api.qrserver.com). Same-origin, so it works offline from the internet and leaks nothing.
 */
export function qrSrc(value, { size = 120, margin = 1 } = {}) {
  const params = new URLSearchParams({ data: String(value ?? ''), size: String(size), margin: String(margin) });
  return `/api/qr?${params.toString()}`;
}
