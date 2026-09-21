/**
 * Live account state for an authenticated session — the kill switch.
 *
 * The sign-in token bakes role, staffCapabilities and employment at login and is never
 * re-read (auth.js jwt callback), so until this existed a database revocation did NOTHING to
 * a session the person already held — a departed artisan kept full bench / QC / billing
 * access for up to 30 days. Found 2026-09-21 offboarding an artisan who quit over a pay
 * dispute (see docs + memory: artisan-termination-protocol).
 *
 * `applyAccountState` is pure: given the session and the CURRENT user document it either
 * returns null (account no longer allowed in — treat as signed out) or the session with the
 * live role / capabilities / employment overlaid, so a capability revoked in the admin lands
 * on the very next request instead of the next login.
 *
 * `withLiveAccountState` wraps a session with a short per-process cache so the users read
 * is at most one per user per TTL, not one per request.
 */
import { db } from '@/lib/database';

/** Statuses that may hold a session. Everything else is signed out on the next request. */
export const ACTIVE_ACCOUNT_STATUSES = Object.freeze(['verified']);

export const ACCOUNT_STATE_TTL_MS = 30 * 1000;

const ACCOUNT_PROJECTION = Object.freeze({
  _id: 0, userID: 1, status: 1, role: 1, staffCapabilities: 1, employment: 1, mustChangePassword: 1,
});

export function isAccountActive(account) {
  return !!account && ACTIVE_ACCOUNT_STATUSES.includes(account.status);
}

/**
 * Overlay the live account onto the session, or return null when the account may not hold a
 * session (missing, terminated, suspended, unverified…). Pure.
 */
export function applyAccountState(session, account) {
  if (!session?.user) return session ?? null;
  if (!isAccountActive(account)) return null;
  return {
    ...session,
    user: {
      ...session.user,
      role: account.role ?? session.user.role,
      staffCapabilities: account.staffCapabilities ?? null,
      employment: account.employment ?? null,
      mustChangePassword: account.mustChangePassword === true,
    },
  };
}

// userID → { at, account }. Per server instance; a termination also calls forgetAccountState so
// the instance that performed it drops the person immediately rather than at TTL.
const cache = new Map();

export function forgetAccountState(userID) {
  if (userID) cache.delete(String(userID));
}

export function clearAccountStateCache() {
  cache.clear();
}

async function loadAccount(userID) {
  const dbInstance = await db.connect();
  return dbInstance.collection('users').findOne({ userID }, { projection: ACCOUNT_PROJECTION });
}

/**
 * Resolve the live account for a userID, cached for ACCOUNT_STATE_TTL_MS.
 * `loader` is injectable for tests.
 */
export async function liveAccountState(userID, { loader = loadAccount, now = Date.now(), ttlMs = ACCOUNT_STATE_TTL_MS } = {}) {
  const key = String(userID || '');
  if (!key) return null;
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.account;
  const account = await loader(key);
  cache.set(key, { at: now, account: account || null });
  return account || null;
}

/**
 * Wrap a NextAuth session with the live account state. A read failure FAILS OPEN to the token
 * (logged): a Mongo blip must not sign the whole shop out, and the token is what every guard
 * trusted before this existed. A missing or inactive account fails CLOSED (null).
 */
export async function withLiveAccountState(session, opts = {}) {
  if (!session?.user?.userID) return session ?? null;
  let account;
  try {
    account = await liveAccountState(session.user.userID, opts);
  } catch (error) {
    console.error('[accountRevocation] live account read failed; trusting token:', error?.message);
    return session;
  }
  return applyAccountState(session, account);
}
