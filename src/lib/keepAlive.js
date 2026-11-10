import { after } from 'next/server';

/**
 * Work that should not hold up the answer, but must still FINISH.
 *
 * On Vercel a function is frozen the moment its response is sent. A promise started and not awaited
 * ("fire-and-forget") is frozen with it, mid-flight: the email it was sending neither arrives nor fails. It may
 * finish minutes later, when the next request happens to thaw the same instance, or never.
 *
 * Found 2026-11-10 in the notifications collection: of 43 "we received your repair request" emails since
 * 2026-10-01, 28 have neither a sent flag nor an error, and the slowest one that did go out left 22 minutes after
 * it was written. Every one was started this way.
 *
 * `keepAlive(promise)` hands the promise to Next's `after()`, which keeps the function alive until it settles.
 * The caller still does not wait. Outside a request (a script, a cron helper, a test) `after()` refuses, and the
 * work simply runs as it always did.
 */
export function keepAlive(work, label = 'background work') {
  const settled = Promise.resolve(work).catch((error) => {
    console.error(`${label} failed (non-fatal):`, error?.message);
  });
  try {
    after(() => settled);
  } catch {
    // Not inside a request: nothing to keep alive.
  }
  return settled;
}
