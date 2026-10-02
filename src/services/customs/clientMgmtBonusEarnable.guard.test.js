import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: a payout the system offers must be one somebody can actually earn.
 *
 * The client-management bonus pays the assigned CAD designer a percentage of profit **if they managed the
 * client themselves** — concretely, if they authored an outbound message on the **client** thread
 * (`services/customs/production/billing.js`). It is a real setting, `clientMgmtBonusPct`, and it was
 * verified live when it shipped.
 *
 * It could never pay. `POST .../communications` was `requireRole(['admin', 'dev'])`, so an artisan could
 * not author a message of any kind — `managedClient` was always false, the bonus was always 0, and on
 * completion the order was stamped `clientMgmtBonusAwarded: true`, idempotently, so it could not even be
 * corrected afterwards. The workflow doc meanwhile states the intent plainly: *"the assigned designer is
 * expected to manage the client via comms. If they do, they earn a bonus; if they push the communicating
 * onto admin, no bonus."* The system pushed the communicating onto admin and then declined to pay for it.
 *
 * Owner, 2026-10-02: **"Cad designers can use communications."**
 *
 * The two halves live in different files and can drift apart silently — re-locking the route would not
 * break a single test of the bonus, because the bonus's own logic would still be correct. So this guard
 * holds them together: the condition the bonus pays on must be reachable by the person it pays.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const COMMS_ROUTE = 'app/api/custom-orders/[customID]/communications/route.js';
const BILLING = 'services/customs/production/billing.js';

/** The body of the route's POST, which is the half that must stay open. */
function commsPost() {
  const source = read(COMMS_ROUTE);
  const at = source.indexOf('export const POST');
  expect(at, 'the communications route still has a POST').toBeGreaterThan(-1);
  return source.slice(at);
}

describe('the client-management bonus', () => {
  it('still pays only the designer who managed the client', () => {
    // If this stops being the rule, the guard below is guarding nothing.
    const billing = read(BILLING);
    expect(billing).toMatch(/thread \|\| 'client'\) === 'client'/);
    expect(billing).toMatch(/direction === 'outbound'/);
    expect(billing).toMatch(/authorUserID === cad\.userID/);
  });

  it('is earnable: the CAD designer can author the message it pays on', () => {
    expect(
      commsPost(),
      'POST .../communications must admit this order’s CAD designer, or the bonus cannot be earned',
    ).toMatch(/requireCustomsCadWrite\(/);
  });

  it('is not open to everyone — only staff and the order’s CAD designer', () => {
    // The fix is a narrower gate, not an absent one. A bench jeweller or stone cutter on the same order
    // reads the threads and writes neither.
    const post = commsPost();
    expect(post).not.toMatch(/requireAuth\(\)/);
    expect(post).not.toMatch(/requireCustomsRead\(/);
  });

  it('stamps the author, which is the only thing that makes the payout checkable', () => {
    expect(commsPost()).toMatch(/authorUserID:/);
  });

  it('writes outbound messages only — inbound comes from the shop', () => {
    // `direction` is half the bonus condition. A POST that wrote 'inbound' would both mis-credit the
    // designer and notify the client about their own message.
    expect(commsPost()).toMatch(/direction: 'outbound'/);
  });
});
