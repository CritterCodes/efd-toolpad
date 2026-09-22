/**
 * "How EFD works" — the numbers behind every way someone gets paid, read from LIVE settings so the
 * in-app guide can never drift from what the code actually does. Pure builders; the route feeds them.
 *
 * Sources of truth (do not restate a number here that the code reads from somewhere else):
 *   labor credit      hours × shop wage (adminSettings.pricing.wage) at QC pass — repairLaborLogs/utils
 *   retail charge     base × businessMultiplier (admin/business/consumables fees, floor 2.0) — pricing/config.pricing
 *   wholesale charge  base × pricing.wholesaleMarkup — same
 *   work-order fee    labor + materials × pricing.wholesaleMarkup; casting + shipping AT COST — production/workOrderPricing
 *   sale fees         billing/feeSchedule (consignment / marketplace / pillars)
 *   affiliate         affiliate.commissionRate × pre-tax profit when paid in full — affiliates/commissionEngine
 *   client-mgmt bonus financial.clientMgmtBonusPct of custom-order margin — customs/customProduction
 *   QC review fee     financial.qcReviewFee, a labor line to the reviewer — bench/pieceWorkOrderActions
 *   payroll           Sun–Sat weeks, Wednesday run, Stripe Connect only, weekly free / daily fee — services/payroll
 */
import { getBusinessMultiplierValue, getNormalizedSettings } from '@/services/pricing/config.pricing';
import { loadFeeSchedule } from '@/services/billing/feeSchedule';
import { FEE_DEFAULTS, dailyFeeLabel } from '@/services/payroll/payoutCadence';

export const DEFAULT_AFFILIATE_RATE = 0.1;      // api/affiliates POST default for a new affiliate
export const DEFAULT_CLIENT_MGMT_BONUS_PCT = 0.05; // customs/customProduction
export const DEFAULT_QC_REVIEW_FEE = 25;         // bench/pieceWorkOrderActions

const round = (n, d = 4) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;

export function buildGuideTerms({ settings = {}, fees = FEE_DEFAULTS, qcMode = 'separate', affiliate = null } = {}) {
  const s = settings || {};
  const normalized = getNormalizedSettings(s);
  const wage = Number(s?.pricing?.wage) > 0 ? Number(s.pricing.wage) : normalized.baseWage;
  const businessMultiplier = getBusinessMultiplierValue(s);
  const wholesaleMarkup = normalized.wholesaleMarkup;
  const schedule = loadFeeSchedule(s);
  const bonusRaw = Number(s?.financial?.clientMgmtBonusPct);
  const clientMgmtBonusPct = bonusRaw >= 0 && bonusRaw <= 1 && Number.isFinite(bonusRaw) && s?.financial?.clientMgmtBonusPct !== undefined
    ? bonusRaw : DEFAULT_CLIENT_MGMT_BONUS_PCT;
  const qcFeeRaw = Number(s?.financial?.qcReviewFee);
  const qcReviewFee = qcFeeRaw > 0 ? qcFeeRaw : DEFAULT_QC_REVIEW_FEE;
  const affiliateRate = Number(affiliate?.commissionRate) > 0 ? Number(affiliate.commissionRate) : DEFAULT_AFFILIATE_RATE;

  return {
    labor: {
      wage,
      businessMultiplier,
      wholesaleMarkup,
      // share of the LABOR LINE the artisan is credited vs. what EFD keeps
      artisanRetailShare: round(1 / businessMultiplier),
      efdRetailShare: round(1 - 1 / businessMultiplier),
      artisanWholesaleShare: round(1 / wholesaleMarkup),
      efdWholesaleShare: round(1 - 1 / wholesaleMarkup),
      creditedAt: 'QC pass',
      rateSource: 'shop-wide',
    },
    workOrders: {
      markup: wholesaleMarkup,
      castingAtCost: true,
      shippingAtCost: true,
      selfFulfilledBilled: false,
      clientMgmtBonusPct,
      qcReviewFee,
    },
    sales: {
      consignment: schedule.consignment,
      marketplace: schedule.marketplace,
      pillars: { ...schedule.pillars },
      inPersonFee: 0,
      laborDeductedFromPayout: true,
    },
    affiliate: {
      rate: affiliateRate,
      rateIsDefault: !(Number(affiliate?.commissionRate) > 0),
      base: 'pre-tax profit',
      trigger: 'order paid in full',
    },
    wholesale: {
      markup: wholesaleMarkup,
      taxRate: Number(s?.pricing?.taxRate) || 0,
      deliveryFee: Number(s?.pricing?.deliveryFee) || 0,
    },
    payroll: {
      weekStart: 'Sunday',
      weekEnd: 'Saturday',
      runDay: 'Wednesday',
      runHourUtc: 11,
      landing: 'Friday',
      method: 'Stripe Connect',
      onlyPath: true,
      weeklyFee: 0,
      dailyFeeLabel: dailyFeeLabel(fees),
      dailyFees: { ...fees },
    },
    qc: { mode: qcMode },
  };
}

/**
 * Per-role first-steps checklist. `facts` are booleans/counts the route already looked up; this only
 * decides what to show and whether it is done. Items are ordered by what unblocks money first.
 */
export function buildChecklist({ role = 'artisan', facts = {} } = {}) {
  const f = facts;
  const connect = {
    id: 'connect-stripe',
    label: 'Connect your Stripe account',
    detail: 'Payroll is paid through Stripe Connect and only that way. Until this is done your earnings wait as a finalized batch — nothing is lost, nothing is sent.',
    done: f.connectLive === true,
    href: role === 'affiliate' ? '/dashboard/affiliate/payouts' : role === 'admin' || role === 'dev' ? '/dashboard/repairs/payroll' : '/dashboard/artisan/payroll',
    cta: f.connectStarted ? 'Finish Stripe setup' : 'Connect Stripe',
  };
  const guide = {
    id: 'read-guide',
    label: 'Read how you get paid',
    detail: 'Every rate and fee, pulled from the live shop settings.',
    done: f.guideRead === true,
    href: '/dashboard/guide',
    cta: 'Open the guide',
  };

  if (role === 'affiliate') {
    return [
      {
        id: 'affiliate-code',
        label: 'Set your referral code',
        detail: 'Your code is the link you share. Orders that come through it earn your commission once they are paid in full.',
        done: Boolean(f.affiliateCode),
        href: '/dashboard/affiliate',
        cta: 'Set code',
      },
      connect,
      guide,
    ];
  }

  if (role === 'wholesaler') {
    return [
      {
        id: 'store-settings',
        label: 'Finish your store settings',
        detail: 'Business name, contact and how finished repairs come back to you (pickup, hand delivery or shipping).',
        done: f.storeSettingsComplete === true,
        href: '/dashboard/wholesaler/account-settings',
        cta: 'Open settings',
      },
      {
        id: 'first-repair',
        label: 'Create your first repair',
        detail: 'Price it yourself from the price sheet, or request a quote and the shop prices it for you. A ticket prints either way.',
        done: Number(f.storeRepairsCount) > 0,
        href: '/dashboard/repairs/new',
        cta: 'New repair',
      },
      { ...guide, label: 'Read how pricing and billing work' },
    ];
  }

  if (role === 'admin' || role === 'dev') {
    return [
      {
        id: 'stripe-configured',
        label: 'Stripe Connect is configured',
        detail: 'STRIPE_SECRET_KEY set and Connect Express enabled in the Stripe dashboard.',
        done: f.stripeConfigured === true,
        href: '/dashboard/repairs/payroll',
        cta: 'Payroll',
      },
      { ...connect, label: 'Connect your own payout account', detail: 'Your own labor and draws pay out through the same rail as everyone else.' },
      {
        id: 'qc-mode',
        label: 'Choose the QC mode',
        detail: 'Separate reviewer, or self-certify when you are the only jeweler.',
        done: f.qcModeSet === true,
        href: '/dashboard/admin/settings',
        cta: 'Settings',
      },
      {
        id: 'payout-fees',
        label: 'Review payout fees and funding',
        detail: 'Weekly payouts are free to payees; daily payouts carry a fee. Funding keeps the Stripe balance above the floor.',
        done: f.payoutFeesSet === true && f.fundingSet === true,
        href: '/dashboard/admin/settings',
        cta: 'Settings',
      },
    ];
  }

  // artisan (default)
  return [
    {
      id: 'terms',
      label: 'Accept the artisan terms',
      detail: 'Plain-language terms: nothing is fronted, title passes at payment, casting at cost, consignment on sales.',
      done: f.termsAccepted === true,
      href: '/dashboard/policies',
      cta: 'Read & accept',
    },
    {
      id: 'profile',
      label: 'Complete your profile',
      detail: 'Business name, a short about, and a profile photo — this is what the shop shows customers.',
      done: f.profileComplete === true,
      href: '/dashboard/profile',
      cta: 'Edit profile',
    },
    connect,
    guide,
  ];
}

/** Pure: is an artisan's public profile complete enough to show? */
export function profileIsComplete(user = {}) {
  const a = user?.artisanApplication || {};
  return Boolean(String(a.businessName || '').trim() && String(a.about || a.bio || '').trim() && (a.profileImageUrl || user?.image));
}
