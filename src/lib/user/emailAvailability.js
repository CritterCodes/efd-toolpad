import { db } from '@/lib/database';

/**
 * One email, one account (EFD-DEFECTS C2, 2026-10-01).
 *
 * POST /api/users never checked, and production had 3 duplicate emails and no index on users.email: a claim
 * resolved to the older account and failed, and a reset could land on the wrong account. Every path that INSERTS a
 * user calls assertEmailAvailable first (UsersService.createUser, UserManagementService.createUser, the auth
 * model's create; the Google and admin-create paths already looked the email up case-insensitively). A unique
 * index would close it at the database too — that's a production change for the owner (docs/OPEN-QUESTIONS.md).
 */
export const DUPLICATE_EMAIL = 'DUPLICATE_EMAIL';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pure: the case-insensitive exact-match query for an email (the same shape the login lookup uses). */
export function emailMatch(email) {
  return { email: { $regex: `^${escapeRegex(String(email || '').trim())}$`, $options: 'i' } };
}

/** Throws a 409-coded error if another user already has this email (any case). A blank email is not checked. */
export async function assertEmailAvailable(email, dbi = null) {
  const value = String(email || '').trim();
  if (!value) return;
  const database = dbi || (await db.connect());
  const existing = await database.collection('users').findOne(emailMatch(value), { projection: { _id: 0, userID: 1 } });
  if (existing) {
    // Say what to do: placeholders like test@test.com were typed for customers with no email (owner, 2026-10-01),
    // and the 2nd one is now refused. Blank is allowed.
    const error = new Error('This email is already on another account. If the customer has no email, leave it blank.');
    error.code = DUPLICATE_EMAIL;
    error.status = 409;
    throw error;
  }
}
