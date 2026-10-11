import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * GUARD: PERMISSION IS A TICKED BOX, NOT AN INFERENCE.
 *
 * The bug class this exists to make impossible: publishing somebody's words because the data looked
 * willing. A checkbox arrives over the wire as `"on"`, or as the string `"false"`, or not at all; a form
 * library sends `1`; a later refactor writes `mayQuote: !!body.mayQuote` and every one of those becomes
 * consent. The cost of the mistake is not a broken page — it is quoting a customer who never agreed to be
 * quoted, in marketing material, under their own business name.
 *
 * So `mayQuote` is true only for a literal boolean `true`, `isQuotable()` is the single door to publishing,
 * and these tests enumerate the near-misses.
 *
 * Context: this exists because the one quote we have from our best account (Marlen Jewelers, 2026-10-03)
 * lives only in the owner's memory of a phone call, with no permission attached to it.
 */

const store = new Map();
const updates = [];

vi.mock('@/lib/database.js', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: () => ({
        insertOne: async (doc) => { store.set(doc.token, doc); return { insertedId: doc.requestID }; },
        findOne: async (filter) => store.get(filter.token) || null,
        updateOne: async (filter, ops) => {
          updates.push(ops.$set);
          const doc = store.get(filter.token);
          if (doc) Object.assign(doc, ops.$set);
          return { modifiedCount: doc ? 1 : 0 };
        },
      }),
    })),
  },
}));

const mod = () => import('./testimonialRequest.js');

async function aRequest() {
  const { createTestimonialRequest } = await mod();
  return createTestimonialRequest({
    accountID: 'user-c9f82772',
    accountName: 'Marlen Jewelers',
    recipientEmail: 'andrew@example.com',
    context: { invoiceID: 'rinv-6fb2c454', label: 'the September packages' },
    createdBy: 'user-1fae26bf',
  });
}

beforeEach(() => {
  store.clear();
  updates.length = 0;
  vi.clearAllMocks();
});

describe('consent', () => {
  it('records permission when the box was actually ticked', async () => {
    const { recordResponse, isQuotable, attributionLine } = await mod();
    const req = await aRequest();
    const saved = await recordResponse(req.token, {
      rating: 5, comment: 'Fast and the retipping is clean.', mayQuote: true, attribution: 'person',
      attributionName: 'Andrew Eilberg, Marlen Jewelers',
    });
    expect(isQuotable(saved)).toBe(true);
    expect(attributionLine(saved)).toBe('Andrew Eilberg, Marlen Jewelers');
  });

  it.each([
    ['the box was left unticked', false],
    ['the field never arrived', undefined],
    ['null', null],
    ['the STRING "true" — a form post', 'true'],
    ['the STRING "false" — reads as truthy', 'false'],
    ['"on" — what an unconfigured checkbox sends', 'on'],
    ['the number 1', 1],
    ['a non-empty object', {}],
  ])('is NOT consent: %s', async (_label, value) => {
    const { recordResponse, isQuotable, attributionLine } = await mod();
    const req = await aRequest();
    const saved = await recordResponse(req.token, { rating: 5, comment: 'Great work', mayQuote: value });
    expect(saved.response.mayQuote).toBe(false);
    expect(isQuotable(saved)).toBe(false);
    expect(attributionLine(saved)).toBeNull();
  });

  it('keeps no attribution at all when there is no permission', async () => {
    // A name captured beside a refusal is a name waiting to be published by the next careless reader.
    const { recordResponse } = await mod();
    const req = await aRequest();
    const saved = await recordResponse(req.token, {
      rating: 4, comment: 'Good', mayQuote: false, attribution: 'person', attributionName: 'Andrew Eilberg',
    });
    expect(saved.response.attribution).toBeNull();
    expect(saved.response.attributionName).toBe('');
  });

  it('will not call an empty comment quotable, however willing they were', async () => {
    const { recordResponse, isQuotable } = await mod();
    const req = await aRequest();
    const saved = await recordResponse(req.token, { rating: 5, comment: '   ', mayQuote: true });
    expect(saved.response.mayQuote).toBe(true);
    expect(isQuotable(saved)).toBe(false);
  });

  it('anonymises when that is what they chose, even though we know who they are', async () => {
    const { recordResponse, attributionLine } = await mod();
    const req = await aRequest();
    const saved = await recordResponse(req.token, {
      rating: 5, comment: 'Quick turnaround.', mayQuote: true, attribution: 'anonymous',
      attributionName: 'Andrew Eilberg',
    });
    expect(attributionLine(saved)).toBe('a trade account');
  });

  it('replaces the whole response rather than merging onto the last one', async () => {
    // Four incidents in this codebase came from `x: x || existing.x`. Here it would leave an earlier
    // mayQuote:true standing over a later unticked box.
    const { recordResponse, isQuotable } = await mod();
    const req = await aRequest();
    await recordResponse(req.token, { rating: 5, comment: 'Quote me', mayQuote: true, attribution: 'business' });
    const second = await recordResponse(req.token, { rating: 3, comment: 'Actually, keep this private', mayQuote: false });
    expect(second.response.mayQuote).toBe(false);
    expect(second.response.attribution).toBeNull();
    expect(isQuotable(second)).toBe(false);
    expect(updates.at(-1).response.comment).toBe('Actually, keep this private');
  });
});

describe('the link itself', () => {
  it('mints a token long enough not to be guessed', async () => {
    const req = await aRequest();
    expect(req.token).toMatch(/^[0-9a-f]{48}$/);
  });

  it('gives two requests different tokens', async () => {
    const a = await aRequest();
    const b = await aRequest();
    expect(a.token).not.toBe(b.token);
  });

  it('refuses to create a request with nobody to send it to', async () => {
    const { createTestimonialRequest } = await mod();
    await expect(createTestimonialRequest({ accountName: 'Marlen Jewelers' })).rejects.toThrow(/email/i);
  });

  it('writes nothing for an unknown token', async () => {
    const { recordResponse } = await mod();
    await expect(recordResponse('not-a-real-token', { rating: 5, mayQuote: true })).rejects.toThrow(/Unknown/i);
    expect(updates).toHaveLength(0);
  });

  it('never hands the token or the asker back to the page', async () => {
    const { publicView } = await mod();
    const req = await aRequest();
    const view = publicView(req);
    expect(view.token).toBeUndefined();
    expect(view.createdBy).toBeUndefined();
    expect(view.recipientEmail).toBeUndefined();
    expect(view.accountName).toBe('Marlen Jewelers');
  });

  it('says WHETHER there is an account, never which one', async () => {
    // The thank-you screen offers the portal only to someone who has an account to sign in to. It
    // needs a yes/no for that and nothing more — a user id on a page reachable by a link in an email
    // is an id in anybody's browser history.
    const { publicView, createTestimonialRequest } = await mod();
    const withAccount = publicView(await aRequest());
    expect(withAccount.hasAccount).toBe(true);
    expect(JSON.stringify(withAccount)).not.toContain('user-c9f82772');

    const walkIn = await createTestimonialRequest({ recipientEmail: 'walkin@example.com' });
    expect(publicView(walkIn).hasAccount).toBe(false);
  });
});

describe('the rating', () => {
  it.each([[0], [6], [2.5], [NaN], [undefined], ['five']])('refuses %s', async (value) => {
    const { recordResponse } = await mod();
    const req = await aRequest();
    await expect(recordResponse(req.token, { rating: value, comment: 'x', mayQuote: false }))
      .rejects.toThrow(/1 to 5/);
  });

  it('accepts "5" from a form post — coercion is fine HERE and nowhere near consent', async () => {
    // The asymmetry is deliberate and is the point of this file. A rating read loosely costs a wrong
    // number in a report. Permission read loosely costs publishing someone who said no. So the rating
    // takes whatever a form sends and `mayQuote` takes a literal `true` only.
    const { recordResponse } = await mod();
    const req = await aRequest();
    const saved = await recordResponse(req.token, { rating: '5', comment: 'x', mayQuote: 'true' });
    expect(saved.response.rating).toBe(5);
    expect(saved.response.mayQuote).toBe(false);
  });
});
