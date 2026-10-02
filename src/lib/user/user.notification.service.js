import { NotificationService, notifyAllAdmins } from '@/lib/notificationService';

/**
 * What a person is told when their account is approved, rejected, or waiting on someone.
 *
 * **F14.** Every method here was `// TODO: Implement email notification service` with an empty body — and
 * these are not dead paths. `/api/users/approve` → `UnifiedUserService.approveUser` → `approveUser` in
 * `user.role.service.js` calls `sendApprovalNotification` on every approval and every rejection, from the
 * approve/reject dialog on `/dashboard/users/manage`. So an applicant was approved or turned down and
 * **told nothing at all**: no email, no in-app notice, nothing to refresh and see. Someone waiting to be
 * let in had no way to learn they already had been.
 *
 * `sendPendingApprovalNotification` is the other half — nobody was told an application had arrived — but be
 * precise about it: **nothing calls it today**. It is reachable only through
 * `UnifiedUserService.sendPendingApprovalNotification`, which no route uses. Implemented here so the
 * surface is real when a registration path wires it up, and so the next person finds a function rather
 * than a TODO; it is not a behaviour change until something calls it.
 *
 * Two rules this file lives by:
 *
 * 1. **Telling someone must never fail the thing it is about.** An approval that throws because an SMTP
 *    host is down would leave the account approved in the database and the caller holding an error —
 *    which is how a user ends up approved twice, or approved and then "fixed" by hand. Every method
 *    swallows and logs.
 * 2. **A rejection reason reaches the person it is about.** It is already captured and required by the
 *    route; it simply had nowhere to go.
 */

/** Where a newly approved person goes. Relative, so it works on any deployment. */
const SIGN_IN_PATH = '/auth/signin';
const PENDING_USERS_PATH = '/dashboard/users/manage';

export class UserNotificationService {
  /**
   * Approved or rejected. `approved` picks which, and `reason` is carried through on a rejection because
   * "no" without a reason is the version of this message that generates a phone call.
   */
  static async sendApprovalNotification(user, approved, reason = '') {
    if (!user?.userID && !user?.email) return;

    const role = user.approvalData?.requestedRole || user.role || 'account';
    try {
      await NotificationService.createNotification({
        userId: user.userID,
        type: approved ? 'account-approved' : 'account-rejected',
        title: approved ? 'Your account is approved' : 'Your account request was not approved',
        message: approved
          ? `You can sign in now. Your account is set up as ${role}.`
          : reason
            ? `Your request was not approved. ${reason}`
            : 'Your request was not approved. Reply to this message if you think that is a mistake.',
        recipientEmail: user.email,
        priority: approved ? 'normal' : 'high',
        data: {
          userRole: user.role,
          actionUrl: approved ? SIGN_IN_PATH : '',
          actionLabel: approved ? 'Sign in' : '',
          requestedRole: role,
          reason: approved ? '' : reason,
        },
        tags: ['account', approved ? 'approved' : 'rejected'],
      });
    } catch (error) {
      // Rule 1: the account is already approved or rejected. Losing the notice is bad; undoing the
      // decision because the notice failed would be worse.
      console.error('[user.notification] approval notice failed for', user.userID, error?.message);
    }
  }

  /**
   * Deliberately not implemented, and not a TODO.
   *
   * The original note read *"Implement welcome email with temporary password"*. Emailing a password is
   * not a thing to build: it puts a working credential in an inbox and in every mail server between here
   * and there, where it stays after the person changes it. This app already has the right shape — an
   * account-claim link that expires, minted by the caller that knows which flow it is (efd-shop,
   * `account-claim`, see EFD-DEFECTS C3). A welcome message belongs on that path, with a link rather
   * than a secret.
   *
   * Left as a no-op rather than removed because two services call it, and silently doing nothing is
   * exactly what it did before. The difference is that it is now a decision instead of an omission.
   */
  static async sendWelcomeEmail() {
    return undefined;
  }

  /** An application arrived. Before this, the only way to find one was to go and look. */
  static async sendPendingApprovalNotification(user) {
    if (!user?.userID && !user?.email) return;

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.userID;
    const role = user.approvalData?.requestedRole || user.role || 'account';
    try {
      await notifyAllAdmins({
        type: 'account-pending-approval',
        title: 'An account is waiting for approval',
        message: `${name} asked for a ${role} account.`,
        relatedId: user.userID,
        relatedType: 'user',
        relatedData: { userID: user.userID, email: user.email, requestedRole: role },
        actionUrl: PENDING_USERS_PATH,
        actionLabel: 'Review',
        priority: 'normal',
        tags: ['account', 'pending'],
      });
    } catch (error) {
      console.error('[user.notification] pending-approval notice failed for', user.userID, error?.message);
    }
  }
}
