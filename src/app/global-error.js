'use client';

import { useEffect } from 'react';

/**
 * The last resort: an error thrown in the ROOT layout, where no layout is left to render into. Next
 * replaces the whole document, so this file has to supply its own `<html>` and `<body>` and cannot use
 * the kit — a CSS Module import would be part of the tree that just failed.
 *
 * Hence the inline styles, which are deliberate here and nowhere else. The tokens are copied from
 * DESIGN.md rather than imported for the same reason.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[root] unhandled error:', error?.message, error?.digest);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#08090B', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 640, padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            The app did not start
          </h1>
          <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.66)' }}>
            This one is on our side. Reloading usually clears it; if it does not, tell the shop what you were
            doing and quote the reference below.
          </p>
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44, padding: '9px 18px', borderRadius: 999, border: 'none',
                background: '#FBBF24', color: '#08090B', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
          {error?.digest && (
            <div style={{ marginTop: 6, fontSize: '0.71rem', color: 'rgba(255,255,255,0.34)' }}>
              Reference {error.digest}
            </div>
          )}
        </main>
      </body>
    </html>
  );
}
