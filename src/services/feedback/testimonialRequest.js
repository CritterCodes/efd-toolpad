/**
 * Asking an account what they think, and recording what they said — including whether we may repeat it.
 *
 * Why this exists: the best account on the books (Marlen Jewelers) said something useful about our work,
 * and the only record of it was the owner's memory of a phone call. A quote nobody can produce is not a
 * quote, and permission nobody wrote down is not permission. Both have to be captured where they are
 * given, by the person who gave them.
 *
 * **The channel is email, not the app.** Of ~389 wholesale repairs, 22 were created by a store itself and
 * Marlen created none — he mails work in and we key it in. A page behind a login would never be seen by
 * the accounts whose opinion is worth having, so a request carries its own long random token and the page
 * is public. Same shape as the emailed password-reset link, and as `customViewer.createShareLink`.
 *
 * **Consent is a field, never an inference.** `mayQuote` is only ever true when the person ticked the box
 * on this form. It is not defaulted, not coerced from a truthy string, and not implied by a warm comment.
 * See the guard tests next door — that is the bug class this module exists to make impossible.
 */
import { randomBytes, randomUUID } from 'crypto';
import { db } from '@/lib/database.js';

const COLLECTION = 'testimonialRequests';

/** How the person wants to be credited if they let us quote them. */
export const ATTRIBUTION = Object.freeze({
  BUSINESS: 'business',   // "Marlen Jewelers"
  PERSON: 'person',       // "Andrew Eilberg, Marlen Jewelers"
  ANONYMOUS: 'anonymous', // "a retail jeweler in Arkansas"
});
const ATTRIBUTIONS = new Set(Object.values(ATTRIBUTION));

const MAX_COMMENT = 4000;

/**
 * Is this a usable quote? The ONLY path to true.
 *
 * Deliberately not a property read: every caller that wants to publish words goes through one function, so
 * there is a single place to audit and a single place a future "quote of the month" surface has to pass.
 */
export function isQuotable(request) {
  const r = request?.response;
  return Boolean(r && r.mayQuote === true && typeof r.comment === 'string' && r.comment.trim().length > 0);
}

/** How to credit a quotable response. Returns null when it is not quotable at all. */
export function attributionLine(request) {
  if (!isQuotable(request)) return null;
  const { attribution, attributionName } = request.response;
  if (attribution === ATTRIBUTION.ANONYMOUS) return 'a trade account';
  return attributionName || request.accountName || 'a trade account';
}

/** Mint a request. The token is the whole authorization, so it is long and random. */
export async function createTestimonialRequest({
  accountID = null,
  accountName = '',
  recipientEmail = '',
  context = {},
  createdBy = null,
} = {}) {
  const email = String(recipientEmail || '').trim();
  if (!email) {
    const err = new Error('A testimonial request needs an email address to go to.');
    err.code = 'NO_RECIPIENT';
    throw err;
  }

  const doc = {
    requestID: `tr-${randomUUID().slice(0, 8)}`,
    token: randomBytes(24).toString('hex'),
    accountID,
    accountName: String(accountName || '').trim(),
    recipientEmail: email,
    context: {
      invoiceID: context.invoiceID || null,
      repairIDs: Array.isArray(context.repairIDs) ? context.repairIDs : [],
      label: String(context.label || '').trim(),
    },
    createdBy,
    createdAt: new Date(),
    sentAt: null,
    response: null,
  };

  const database = await db.connect();
  await database.collection(COLLECTION).insertOne(doc);
  return doc;
}

/** Look a request up by its emailed token. */
export async function findByToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  const database = await db.connect();
  return database.collection(COLLECTION).findOne({ token: t });
}

/**
 * What the public page is allowed to see. Never the token back, never who asked for it, never the
 * other side of the account relationship.
 */
export function publicView(request) {
  if (!request) return null;
  return {
    requestID: request.requestID,
    accountName: request.accountName,
    context: { label: request.context?.label || '', invoiceID: request.context?.invoiceID || null },
    // Whether there is an account behind this, so the thank-you screen can mention the portal. A
    // boolean, never the id: the page has no business knowing our user ids.
    hasAccount: Boolean(request.accountID),
    answered: Boolean(request.response),
    response: request.response
      ? {
        rating: request.response.rating,
        comment: request.response.comment,
        mayQuote: request.response.mayQuote,
        attribution: request.response.attribution,
        attributionName: request.response.attributionName,
      }
      : null,
  };
}

/**
 * Record what they said.
 *
 * `mayQuote` must arrive as a real boolean `true`. A checkbox that did not get ticked, a missing field, the
 * string "false", the string "true", `1`, `"on"` — every one of those is NOT consent. Permission to publish
 * somebody's words is the last place to be generous with coercion.
 */
export async function recordResponse(token, { rating, comment, mayQuote, attribution, attributionName } = {}) {
  const request = await findByToken(token);
  if (!request) {
    const err = new Error('Unknown or expired feedback link.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    const err = new Error('Rating must be a whole number from 1 to 5.');
    err.code = 'BAD_RATING';
    throw err;
  }

  const text = String(comment ?? '').trim().slice(0, MAX_COMMENT);
  const consent = mayQuote === true;
  const how = ATTRIBUTIONS.has(attribution) ? attribution : ATTRIBUTION.BUSINESS;

  const response = {
    rating: score,
    comment: text,
    mayQuote: consent,
    attribution: consent ? how : null,
    attributionName: consent ? String(attributionName || request.accountName || '').trim() : '',
    submittedAt: new Date(),
  };

  const database = await db.connect();
  // Set the one subdocument whole. Never a field-by-field merge onto an older response — a partial write
  // here could leave last week's `mayQuote: true` standing over this week's unticked box.
  await database.collection(COLLECTION).updateOne(
    { token: request.token },
    { $set: { response, updatedAt: new Date() } },
  );

  return { ...request, response };
}

/** Mark that the invitation actually went out. */
export async function markSent(token) {
  const database = await db.connect();
  await database.collection(COLLECTION).updateOne({ token }, { $set: { sentAt: new Date() } });
}

/** Everything we have asked, newest first, for the staff-side list. */
export async function listRequests({ limit = 100 } = {}) {
  const database = await db.connect();
  return database.collection(COLLECTION)
    .find({}, { projection: { _id: 0, token: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
