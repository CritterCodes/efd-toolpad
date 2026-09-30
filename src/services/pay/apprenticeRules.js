/**
 * The apprentice rule, pure — safe to import from client components. The server half (the checks
 * that read the database) is services/pay/apprentice.js, which re-exports everything here.
 *
 * Being placed on the Apprentice rung of the pay ladder (employment.payTier === 'apprentice') IS
 * being an apprentice: paid by the hour on the time clock, and never the holder of a job.
 */

export const APPRENTICE_TIER = 'apprentice';

/**
 * Mongo fragment: "not an apprentice". Spread into every query that picks who can be ASSIGNED work
 * (the bench-jeweler picker, admin assign, the bench `assign` action), so an apprentice never shows
 * up as someone a job can be given to.
 */
export const NOT_APPRENTICE_QUERY = Object.freeze({ 'employment.payTier': { $ne: APPRENTICE_TIER } });

export function isApprentice(user = {}) {
  return String(user?.employment?.payTier || '').trim() === APPRENTICE_TIER;
}

/** May this person use the time clock? Only people paid by the hour — today, apprentices. */
export function canUseTimeClock(user = {}) {
  return isApprentice(user);
}
