/**
 * Policy registry + versioned acceptance (PRODUCTION_RUNS.md §4c, ARTISAN_TERMS_AND_POLICIES.md §12).
 * The canonical terms live in `docs/policies/ARTISAN_TERMS_AND_POLICIES.md`; this bundles the
 * current version + section summaries so the in-app page and the acceptance gate ship together and
 * version with the content. An artisan accepts at onboarding and re-accepts on a version bump;
 * acceptance is recorded on `users.agreements[] = { docId, version, acceptedAt }`.
 *
 * Bump `version` here whenever the terms materially change — that automatically re-prompts every
 * artisan (needsAcceptance compares the accepted version to the current one).
 */

export const POLICIES = Object.freeze({
  'artisan-terms': {
    docId: 'artisan-terms',
    version: '0.1',
    title: 'Engel Fine Design — Artisan Terms & Policies',
    status: 'draft',   // not yet legally reviewed (see the canonical doc banner)
    sourceDoc: 'docs/policies/ARTISAN_TERMS_AND_POLICIES.md',
    // Section summaries (the full legal text is the canonical markdown). Faithful to the pinned decisions.
    sections: [
      { heading: 'The one rule', body: 'Nothing is fronted, and title passes at payment. Any work product becomes yours when you pay for it — CAD files, castings, cut stones, finished pieces do not release until the bill is paid.' },
      { heading: 'Your designs & IP', body: 'A design you create or paid for is yours. A design whose creation bill you never paid was never yours. Collaborative designs and runs require every collaborator’s signature and a declared payout split.' },
      { heading: 'Work orders & the platform fee', body: 'You see and accept the price before work starts. EFD-fulfilled work orders carry a 20% markup on labor + materials (self-fulfilled work is never billed). Shipping and insurance are billed at cost.' },
      { heading: 'Casting', body: 'Castings are invoiced when received (actual cost) and do not ship until paid. Casting failures are the caster’s liability. You have 48 hours after delivery to dispute; after that, delivery is accepted.' },
      { heading: 'Materials', body: 'Your piece’s materials are yours to pay. Onsite EFD jewelers work from EFD stock; offsite jewelers buy their own and are reimbursed via payroll.' },
      { heading: 'Gemstones cut in-house', body: 'EFD may front the rough; you pay for the stone when the cut is completed, and it is gated until paid. The cutter is paid via consignment, net of any fronted rough.' },
      { heading: 'Quality control', body: 'EFD standards QC protects the EFD name; acceptance (does it look right) is yours via the dispute window. Remote and solo work self-certifies, with your acceptance as the check.' },
      { heading: 'Shipping, custody & insurance', body: 'Nothing ships until its invoice is paid. You pay shipping at cost with declared-value insurance. While your piece is at another artisan’s bench, that artisan is responsible for it.' },
      { heading: 'If you don’t pay', body: 'An overdue bill freezes new work until paid. After a set period EFD may liquidate the unpaid work product; you are refunded your documented paid-in equity at most — all liquidation profit is EFD’s. A second default ends participation.' },
      { heading: 'Sales, consignment & EFD-produced runs', body: 'Your products sell on consignment (gross minus EFD’s commission). For EFD-produced runs of your design you get your labor + design fees plus a negotiated royalty.' },
      { heading: 'Sales tax', body: 'Provide your resale/sales-tax permit for exemption; without one, applicable tax is added per your state’s rules.' },
    ],
  },
});

/** The current version of a policy doc (null if unknown). PURE. */
export function currentVersion(docId) {
  return POLICIES[docId]?.version ?? null;
}

/** The user's recorded acceptance for a doc (or null). PURE. */
export function acceptanceFor(user = {}, docId) {
  return (user.agreements || []).find((a) => a && a.docId === docId) || null;
}

/**
 * Does this user need to (re-)accept a policy? True when the doc exists and the user has NOT
 * accepted its CURRENT version (never accepted, or accepted an older version → re-prompt). PURE.
 */
export function needsAcceptance(user = {}, docId) {
  const version = currentVersion(docId);
  if (!version) return false;
  const accepted = acceptanceFor(user, docId);
  return !accepted || accepted.version !== version;
}

/**
 * Compute the updated agreements array after accepting a doc's current version (replaces any prior
 * acceptance of the same doc). PURE — the caller persists it.
 */
export function applyAcceptance(agreements = [], docId, version, at) {
  const rest = (agreements || []).filter((a) => a && a.docId !== docId);
  return [...rest, { docId, version, acceptedAt: at }];
}

/** The public policy payload for the in-app page (no internal-only fields). PURE. */
export function publicPolicy(docId) {
  const p = POLICIES[docId];
  if (!p) return null;
  const { sourceDoc, ...pub } = p; // eslint-disable-line no-unused-vars
  return pub;
}
