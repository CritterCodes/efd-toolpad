'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Tells the server a dashboard page was opened (services/usage/pageOpens.js) — the evidence for retiring pages nobody
 * uses. Fire-and-forget: sendBeacon survives navigation and never blocks or fails the page.
 */
export default function PageOpenBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ path: pathname });
    try {
      if (navigator.sendBeacon?.('/api/usage/page-open', new Blob([body], { type: 'application/json' }))) return;
    } catch { /* fall through */ }
    fetch('/api/usage/page-open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
