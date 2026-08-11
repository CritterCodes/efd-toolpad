# Custom-order invoices: admin ↔ shop contract

Status: **admin side shipped 2026-08-11. Shop side not built.**

Stripe hosted invoices are retired for custom orders. EFD now issues its own invoice and receipt, and
the customer pays a balance by card in the **shop** portal. This is the seam between the two apps.

## The flow

```
quote published
   → EFD invoice created (admin)
   → "Send invoice" emails a printable EFD invoice
        ├─ card, remote   → link to shop portal → shop checkout → webhook marks paid
        ├─ Zelle          → customer sends → STAFF VERIFY BY HAND → mark paid in admin
        └─ cash / card in store → staff mark paid at the counter
   → marking paid (any method) emails a receipt AND prints one
```

Every invoice and every receipt states the **remaining balance**. A custom job is paid in instalments,
so a receipt without a balance is how a customer concludes they are square when they still owe money.

## What admin already provides

| Thing | Where |
|---|---|
| Invoice + receipt document model | `src/services/customs/customInvoiceDocument.js` |
| Rendered HTML (print **and** email) | `src/services/customs/customInvoiceHtml.js` |
| Send invoice | `POST /api/custom-orders/:customID/invoices/:invoiceID/send` |
| Fetch document | `GET /api/custom-orders/:customID/invoices/:invoiceID/document?kind=invoice\|receipt` |
| Mark paid (`cash`\|`zelle`\|`card`\|`stripe`) | `PUT /api/custom-orders/:customID/invoices/:invoiceID` |
| Print view | `/dashboard/customs/:customID/invoices/:invoiceID/print?kind=…` |

The invoice email links the customer to `${shopBase()}/custom-work/portal`.

## What shop needs to build

1. **Show outstanding invoices in the portal.** The portal exists (`app/custom-work/portal/page.js`).
   It needs the order's invoices with `invoiceNumber`, `amount`, `status`, and the balance. Read the
   `customInvoices` collection — both apps share the same database, so no new API is required. Use the
   **tax-inclusive** `quote.total` as the project total; `paymentProgress.js` is the reference.

2. **Pay a balance by card** through the existing `app/api/checkout/route.js`. Two requirements:
   - The Stripe session metadata MUST carry `customID` and `invoiceID`. Without both, the webhook
     cannot tell which invoice was paid, and a partial payment on a multi-instalment order is
     unattributable.
   - On success the invoice must be marked paid **through admin's PUT route** with
     `paymentMethod: 'card'`, not by writing the collection directly. That route recomputes payment
     progress, advances the order status (deposit → in_production at 50%), and sends the receipt. A
     direct write skips all three — this is the same class of bug as the dropped-off repairs that never
     reached the bench because a raw driver write skipped `syncFromRepair`.

3. **Do not build a second invoice document.** Call the `document` endpoint or import the renderer. The
   printed copy, the emailed copy and the portal copy have to agree; three renderers will drift, and
   the drift is silent until a customer disputes a balance.

## Prerequisite, not optional

`EMAIL_USER` / `EMAIL_PASSWORD` are **not set in Vercel production**. Every email in the app's history
has failed, and until 2026-08-11 each one was recorded as `email.sent: true` anyway. Nothing in this
flow reaches a customer until those are set for admin (and checked for shop, which shares the mail
setup). See commit `dd39b11`.

## Open

- `financial.zelleHandle` has no settings UI. Unset, the documents still show the Zelle QR and the
  manual-verification wording; the handle string is simply omitted.
- No automatic reminder for an unpaid balance. Staff resend by hand.
- Refunds/voids aren't modelled. Cancelling an invoice leaves any receipt already sent standing.
