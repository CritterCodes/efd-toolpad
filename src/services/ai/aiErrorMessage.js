/**
 * What a person is allowed to be told when an AI helper fails.
 *
 * On 2026-10-08 a wholesale store owner tried to enter a repair on his phone, tapped "Rewrite
 * description from photo", and got a red banner reading:
 *
 *     "Your project has been denied access. Please contact support."
 *
 * Those are Google's words about our Gemini API key, passed straight through: the route returned
 * `payload?.error?.message`, the hook threw it, and the form rendered it as an error Alert. To a store
 * owner it reads as **his** account being denied, so he stopped and reported that he could not enter
 * his repair. He could have — the description is typed by hand and the Next button was never gated on
 * the photo helper. We cost a customer a job with a sentence that was not even about him.
 *
 * So: a provider's message never reaches a person. Only messages we wrote, and only where we marked
 * them as fit to read, pass through. Everything else becomes a sentence that says what failed and that
 * the work carries on without it.
 *
 * Mark an intentional, user-readable error with `err.userFacing = true` (see `userFacingAiError`).
 * Anything unmarked is treated as internal — which is the safe default, because the failures worth
 * showing are the few we chose, and the ones worth hiding are every surprise an upstream can invent.
 */

/** An error whose message is fit for a customer to read. */
export function userFacingAiError(message, { status } = {}) {
  return Object.assign(new Error(message), { userFacing: true, ...(status ? { status } : {}) });
}

/**
 * The sentence to show, given a failure.
 *
 * @param {Error} error
 * @param {object} options
 * @param {string} options.fallback what to say when the real reason is not ours to share
 */
export function aiErrorMessage(error, { fallback = 'The AI helper is unavailable right now — carry on without it.' } = {}) {
  if (error?.userFacing && typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

/** The photo helper's wording, which has to say out loud that the ticket does not need it. */
export const PHOTO_DESCRIPTION_FALLBACK =
  'Could not read the photo just now. Type the description yourself and carry on — the ticket does not need it.';

/** The smart-intake parser's wording. Same promise: the manual path still works. */
export const SMART_INTAKE_FALLBACK =
  'Could not read that just now. Add the work by hand and carry on.';
