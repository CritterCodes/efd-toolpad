import { db } from '@/lib/database';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';
import { adminLink } from '@/lib/appUrls';

/**
 * Tell the wholesale partner their invoice exists.
 *
 * Until now a finalized wholesale invoice simply appeared in the partner's billing portal — nothing
 * emailed them, nothing pushed, and they found out whenever they next happened to log in. The
 * finalize action is the moment a draft becomes a real bill, so this is where the partner hears
 * about it: in-app (which auto-pushes) plus email, per matching portal account.
 *
 * Best-effort by design: the invoice is already open by the time this runs, and the worst failure
 * mode is an undelivered heads-up that staff send by hand. The returned summary exists so the
 * closeout UI can SAY that instead of leaving staff to assume delivery — the email.sent flag in
 * this codebase has been fiction before, so the summary reads the stored outcome, never assumes it.
 */

/**
 * The portal accounts this invoice belongs to — the same identity rules the wholesaler billing
 * read uses (GET /api/wholesale/invoices), inverted: clientID/storeId by userID, or any wholesaler
 * whose business name normalizes to the invoice's business account key.
 */
export async function resolveWholesaleInvoiceRecipients(invoice) {
  const dbi = await db.connect();
  const projection = { _id: 0, userID: 1, email: 1, firstName: 1, business: 1, 'wholesaleApplication.businessName': 1 };

  const ids = [...new Set(
    [invoice.clientID, invoice.storeId].map((v) => String(v || '').trim()).filter(Boolean),
  )];
  const businessKey = String(invoice.accountID || '').startsWith('wholesale-business:')
    ? String(invoice.accountID).slice('wholesale-business:'.length)
    : '';

  const [byId, wholesalers] = await Promise.all([
    ids.length
      ? dbi.collection('users').find({ userID: { $in: ids } }, { projection }).toArray()
      : [],
    // Business keys are normalized slugs, so the match has to happen in JS — the wholesaler set is
    // tiny (invite-only network), a full read is fine.
    businessKey
      ? dbi.collection('users').find({ role: 'wholesaler' }, { projection }).toArray()
      : [],
  ]);

  const byBusiness = wholesalers.filter((user) =>
    [user.business, user.wholesaleApplication?.businessName]
      .map(normalizeAccountKey)
      .filter(Boolean)
      .includes(businessKey),
  );

  const seen = new Map();
  for (const user of [...byId, ...byBusiness]) {
    if (user?.userID && !seen.has(user.userID)) seen.set(user.userID, user);
  }
  return [...seen.values()];
}

export async function notifyWholesaleInvoiceFinalized(invoice) {
  const result = { notified: 0, emailed: 0, recipients: [], errors: [] };

  try {
    if (invoice?.accountType !== 'wholesale') return { ...result, skipped: 'not-wholesale' };
    // The stamp is the dedupe: finalize re-runs (double click, a re-finalize after correction)
    // must not send the partner a second "new invoice".
    if (invoice.partnerNotifiedAt) return { ...result, skipped: 'already-notified' };

    const recipients = await resolveWholesaleInvoiceRecipients(invoice);
    if (recipients.length === 0) {
      // NOT stamped — once the partner's portal account exists, the next finalize can still deliver.
      result.errors.push('No portal account matches this invoice — notify the partner by hand.');
      return result;
    }

    const total = Number(invoice.remainingBalance ?? invoice.total) || 0;
    const repairCount = (invoice.repairIDs || []).length;
    // A STORE pays in the admin portal, where their account, terms and ACH live — not in the shop,
    // which is the retail customer's path (services/repairs/readyForPickup.js). Deep-linked to this
    // invoice so the button opens its pay drawer rather than a list to hunt through (owner,
    // 2026-09-29: "when a wholesale store gets their email, it should take them to the admin to pay").
    const billingUrl = adminLink(`/dashboard/wholesaler/billing?invoice=${encodeURIComponent(invoice.invoiceID)}`);
    const payable = total > 0;
    const dbi = await db.connect();

    for (const user of recipients) {
      try {
        const notification = await NotificationService.createNotification({
          userId: user.userID,
          type: NOTIFICATION_TYPES.WHOLESALE_INVOICE_FINALIZED,
          title: payable
            ? `New invoice from Engel Fine Design — $${total.toFixed(2)} due`
            : 'New invoice from Engel Fine Design',
          message: payable
            ? `Invoice ${invoice.invoiceID} — $${total.toFixed(2)} for ${repairCount} repair${repairCount === 1 ? '' : 's'}. You can pay it by card or bank transfer in your billing portal, or settle it with us as usual.`
            : `Invoice ${invoice.invoiceID} — ${repairCount} repair${repairCount === 1 ? '' : 's'}, nothing left to pay. It is in your billing portal for your records.`,
          channels: ['inApp', 'email'],
          recipientEmail: user.email || '',
          data: {
            actionUrl: billingUrl,
            actionLabel: payable ? 'View & pay invoice' : 'View invoice',
            amountDue: total,
            invoiceID: invoice.invoiceID,
            relatedType: 'repair-invoice',
            userRole: 'wholesaler',
            // The email channel defaults recipientName to the EMAIL PREFIX ("Hi jacobengel,").
            // relatedData is spread over that default, so a real name here wins.
            ...(user.firstName || user.business
              ? { recipientName: user.firstName || user.business }
              : {}),
          },
        });
        result.notified += 1;

        // The email channel records its outcome on the STORED doc, not the returned object — read it
        // back so "emailed" means delivered-or-errored truthfully, not "we tried".
        const stored = notification?._id
          ? await dbi.collection('notifications').findOne({ _id: notification._id }, { projection: { email: 1 } })
          : null;
        if (stored?.email?.sent) {
          result.emailed += 1;
          result.recipients.push(user.email || user.userID);
        } else {
          result.recipients.push(user.email || user.userID);
          if (stored?.email?.error) result.errors.push(`Email to ${user.email || user.userID} failed: ${stored.email.error}`);
        }
      } catch (error) {
        result.errors.push(`Could not notify ${user.email || user.userID}: ${error.message}`);
      }
    }

    if (result.notified > 0) {
      await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
        partnerNotifiedAt: new Date(),
        partnerNotification: {
          notified: result.notified,
          emailed: result.emailed,
          recipients: result.recipients,
          errors: result.errors,
        },
      });
    }

    return result;
  } catch (error) {
    console.error('[wholesale] invoice notification failed:', error?.message || error);
    result.errors.push(error?.message || String(error));
    return result;
  }
}
