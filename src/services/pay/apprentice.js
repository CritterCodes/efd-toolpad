/**
 * What an apprentice IS, to the code (owner rulings, 2026-09-30).
 *
 *   1. PAID BY THE HOUR, AS A SHOP EXPENSE. Clocked hours × the apprentice rate on the pay ladder.
 *      Nobody else's pay moves: the jeweler who holds the job is credited it in full, exactly as if
 *      he had done it alone.
 *   2. NEVER HOLDS A JOB. An apprentice polishes, plates, sizes under supervision — she TOUCHES the
 *      jeweler's work, she doesn't own it. So she can't claim, isn't assigned, isn't handed off to,
 *      and no bench credit ever lands on her. That one rule is what makes (1) safe: a shift writes
 *      a payable labor log and so does a QC pass, so an apprentice who both clocked and held jobs
 *      would be paid twice for the same hours.
 *
 * WHY THE FLAG IS THE LADDER TIER. The artisan page already had a "Staff type: Apprentice" and a
 * "Pay type: Hourly" dropdown. Nothing in the codebase read either — both shop apprentices sat on
 * the $50 shop rate / a hand-typed $15 looking exactly like jewelers to every line that pays anyone.
 * `employment.payTier` is the one field money already follows (services/pay/payLadder.js), so being
 * placed on the Apprentice rung is being an apprentice: it sets the rate AND the rules, and there is
 * no second field to drift out of step with it. The stored key is checked, not the live ladder, so
 * renaming or deleting the rung in Settings can't quietly turn an apprentice back into a jeweler.
 *
 * WHY ONLY APPRENTICES CAN CLOCK. The time clock used to take anyone signed in and credit the shift
 * at their resolved rate — which, for someone never placed on the ladder, is the $50 shop rate. A
 * customer account could clock itself in. It bit in production on 2026-09-29: the first shift ever
 * entered was recorded at $50/hr ($300) because the apprentice had no rate on file, and had to be
 * corrected to $15 by hand.
 */
import { db } from '@/lib/database';
import { APPRENTICE_TIER, NOT_APPRENTICE_QUERY, isApprentice, canUseTimeClock } from './apprenticeRules';

export { APPRENTICE_TIER, NOT_APPRENTICE_QUERY, isApprentice, canUseTimeClock };

export const APPRENTICE_ERROR = Object.freeze({
  HOLD: 'APPRENTICE_CANNOT_HOLD_WORK',
  CLOCK: 'NOT_ON_THE_CLOCK',
});

function coded(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

async function loadUser(userID) {
  if (!userID) return null;
  const dbi = await db.connect();
  return dbi.collection('users').findOne(
    { userID: String(userID) },
    { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, employment: 1 } },
  );
}

/**
 * Throws when `userID` is an apprentice. Read from the database, never the session — a session is
 * minted at sign-in, so it would keep saying "jeweler" for someone placed on the Apprentice rung an
 * hour ago.
 *
 * `who` shapes the message: 'self' for a claim ("you"), anything else for assigning someone else.
 */
export async function assertCanHoldWork(userID, { who = 'self' } = {}) {
  const user = await loadUser(userID);
  if (!isApprentice(user)) return;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'This person';
  throw coded(
    who === 'self'
      ? 'Apprentices don’t hold jobs — you’re paid on the time clock. The jeweler who holds this job keeps it; tell them what you did on it.'
      : `${name} is an apprentice. Apprentices are paid on the time clock and don’t hold jobs — keep it with the jeweler doing the work.`,
    APPRENTICE_ERROR.HOLD,
  );
}

/** Whether `userID` may use the time clock — for the UI, which should not offer a button that refuses. */
export async function isOnTheClock(userID) {
  try {
    return canUseTimeClock(await loadUser(userID));
  } catch {
    return false;
  }
}

/** Throws unless `userID` is paid by the hour. The time clock's gate. */
export async function assertOnTheClock(userID) {
  const user = await loadUser(userID);
  if (canUseTimeClock(user)) return user;
  throw coded(
    'The time clock is for apprentices paid by the hour. Bench work is paid per task at QC pass.',
    APPRENTICE_ERROR.CLOCK,
  );
}

/** For API routes: the HTTP status an apprentice-rule error should answer with. */
export function apprenticeErrorStatus(error) {
  return error?.code === APPRENTICE_ERROR.HOLD || error?.code === APPRENTICE_ERROR.CLOCK ? 403 : null;
}

/**
 * The labor-log backstop. Fifteen code paths can set an assignee; the claim gates cover the ones an
 * apprentice actually uses, and THIS covers the rest: bench credit that lands on an apprentice by
 * any route is held for admin review instead of paying out. The admin splits it to the jeweler who
 * held the job (Labor Review already supports that).
 *
 * Returns the fields to merge into the log, or null. Fails open on a lookup error — a guard that
 * silently stops paying people when a read hiccups is worse than the rare miss it prevents.
 */
export async function apprenticeCreditHold({ userID, sourceType }) {
  if (!userID || String(sourceType) === 'shift') return null;
  try {
    const user = await loadUser(userID);
    if (!isApprentice(user)) return null;
    return {
      requiresAdminReview: true,
      apprenticeHold: true,
      holdNote: 'Credited to an apprentice. Apprentices are paid on the time clock, not per task — reassign this to the jeweler who held the job.',
    };
  } catch (error) {
    console.error('apprenticeCreditHold lookup failed; crediting as before:', error?.message || error);
    return null;
  }
}
