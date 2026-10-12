/**
 * READ ONLY. Which Getting Started facts are false for real users, and which can never be true?
 *
 * Owner, 2026-10-12: "it keeps prompting me on the Getting Started... I have set my payout fees and
 * funding, and that Getting Started thing won't go away. We just need to audit the Getting Started
 * for all roles to make sure that whenever they actually do all their stuff, that message goes away."
 *
 * Reports the FACTS the checklist is built from (src/services/guide/guideTerms.buildChecklist) rather
 * than importing it — the service resolves `@/` aliases that bare node does not.
 *
 * Run: MONGO_DB_NAME=efd-database node --env-file=.env.local scripts/audit-getting-started.mjs
 */
import { db as mongo } from '../src/lib/database.js';

const profileIsComplete = (user = {}) => {
  const a = user?.artisanApplication || {};
  return Boolean(String(a.businessName || '').trim() && String(a.about || a.bio || '').trim() && (a.profileImageUrl || user?.image));
};

const run = async () => {
  const d = await mongo.connect();
  const s = await d.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' });

  console.log('ADMIN ITEMS — the settings paths the checklist reads');
  const pairs = [
    ['settings.payoutFees      (read by checklist)', s?.payoutFees],
    ['settings.payrollFunding  (read by checklist)', s?.payrollFunding],
    ['business.payroll.fees    (where it lives)   ', s?.business?.payroll?.fees],
    ['business.payroll.funding (where it lives)   ', s?.business?.payroll?.funding],
    ['business.qc.mode                            ', s?.business?.qc?.mode],
  ];
  pairs.forEach(([k, v]) => console.log(`  ${k} ${v === undefined ? 'undefined  <-- never set' : 'SET'}`));

  const users = await d.collection('users')
    .find({ role: { $in: ['admin', 'dev', 'artisan', 'senior-artisan', 'wholesaler', 'affiliate'] }, status: { $ne: 'terminated' } })
    .project({ _id: 0, userID: 1, email: 1, role: 1, image: 1, agreements: 1, artisanApplication: 1,
               stripeConnect: 1, fulfillmentPreference: 1, business: 1, wholesaleApplication: 1, guide: 1 })
    .toArray();

  const tally = new Map();
  const bump = (k) => tally.set(k, (tally.get(k) || 0) + 1);

  /**
   * Only the facts a role's checklist actually uses.
   *
   * A wholesaler's list is store settings, first repair and the guide — there is no Stripe item, so
   * reporting `connectLive` against a store says they are blocked by something that is not on their
   * card. An audit that over-reports is as misleading as one that under-reports.
   */
  console.log(`\nPER-USER FACTS (${users.length} users) — only facts that role's checklist uses`);
  for (const u of users) {
    const role = u.role === 'senior-artisan' ? 'artisan' : u.role;
    const facts = { guideRead: Boolean(u?.guide?.readAt) };
    const connectLive = Boolean(u?.stripeConnect?.payoutsEnabled || u?.stripeConnect?.chargesEnabled);
    if (role === 'artisan') {
      facts.connectLive = connectLive;
      facts.termsAccepted = Boolean(u?.agreements?.['artisan-terms']);
      facts.profileComplete = profileIsComplete(u);
    }
    if (role === 'affiliate') facts.connectLive = connectLive;
    if (role === 'admin' || role === 'dev') {
      facts.connectLive = connectLive;
      delete facts.guideRead;   // the admin list has no guide item
    }
    if (role === 'wholesaler') {
      facts.storeSettingsComplete = Boolean((u?.business || u?.wholesaleApplication?.businessName) && u?.fulfillmentPreference?.method);
      facts.storeRepairs = await d.collection('repairs').countDocuments({ userID: u.userID });
    }
    const missing = Object.entries(facts)
      .filter(([k, v]) => (k === 'storeRepairs' ? Number(v) === 0 : v === false))
      .map(([k]) => k);
    missing.forEach((m) => bump(`${role}:${m}`));
    if (missing.length) console.log(`  ${String(role).padEnd(11)} ${String(u.email).padEnd(34)} missing: ${missing.join(', ')}`);
  }

  console.log('\nHOW MANY USERS EACH FACT BLOCKS');
  [...tally.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}  ${k}`));
  process.exit(0);
};
run().catch((e) => { console.error(e); process.exit(1); });
