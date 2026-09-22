'use client';
/**
 * How EFD works — role-aware, every dollar figure pulled from LIVE settings via GET /api/guide
 * (services/guide/guideTerms). If a number here is wrong, the code that prices tickets and payouts is
 * wrong too, because they read the same settings. Never hard-code a rate in this file.
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PageHeader, SurfaceCard, SectionLabel, StatusChip, facelift } from '@/components/facelift';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const pct = (n, d = 0) => `${(Number(n || 0) * 100).toLocaleString('en-US', { maximumFractionDigits: d })}%`;
const mult = (n) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}×`;

const T = {
  h: { color: '#fff', fontWeight: 600, fontSize: 18, lineHeight: 1.3 },
  p: { color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.55 },
  muted: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
};

function Section({ label, title, chip, children }) {
  return (
    <SurfaceCard style={{ padding: 20 }}>
      {label && <SectionLabel>{label}</SectionLabel>}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography sx={T.h}>{title}</Typography>
        {chip}
      </Stack>
      <Stack spacing={1.25}>{children}</Stack>
    </SurfaceCard>
  );
}

function P({ children }) { return <Typography sx={T.p}>{children}</Typography>; }
function Muted({ children }) { return <Typography sx={T.muted}>{children}</Typography>; }

/** Label / value rows — the numbers, always from `terms`. */
function Facts({ rows }) {
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'minmax(0,1fr) minmax(0,1.2fr)' }, columnGap: 2, rowGap: { xs: 1.25, sm: 0.75 } }}>
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <Typography component="dt" sx={{ ...T.p, color: 'rgba(255,255,255,0.66)', minWidth: 0, mb: { xs: -0.75, sm: 0 } }}>{k}</Typography>
          <Typography component="dd" sx={{ ...T.p, m: 0, minWidth: 0, color: '#fff', fontFamily: facelift.mono, fontSize: 14, textAlign: { xs: 'left', sm: 'right' }, overflowWrap: 'anywhere' }}>{v}</Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}

function Steps({ items }) {
  const router = useRouter();
  return (
    <Stack component="ol" spacing={1} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
      {items.map((it, i) => (
        <Box component="li" key={it.title} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(251,191,36,0.15)', color: facelift.gold, fontFamily: facelift.mono, fontSize: 13 }}>{i + 1}</Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography sx={{ ...T.p, color: '#fff', fontWeight: 600 }}>{it.title}</Typography>
            <Typography sx={T.p}>{it.body}</Typography>
          </Box>
          {it.href && (
            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push(it.href)} sx={{ textTransform: 'none', color: facelift.gold, flexShrink: 0 }}>
              {it.cta || 'Open'}
            </Button>
          )}
        </Box>
      ))}
    </Stack>
  );
}

/* ----------------------------- shared blocks ----------------------------- */

function PayrollBlock({ t, role }) {
  const p = t.payroll;
  return (
    <Section label="How and when" title="Payroll: Sunday to Saturday, paid Wednesday, in your bank Friday" chip={<StatusChip label="Stripe Connect only" />}>
      <P>
        Everything you earn in a week (Sunday through Saturday) is bundled into one payout batch. Every {p.runDay} morning the shop finalizes the closed week and sends it to your Stripe account. Stripe pays your bank on its normal schedule, so it typically lands {p.landing}.
      </P>
      <P>
        There is exactly one way to get paid: a connected Stripe account. {role === 'admin' || role === 'dev' ? 'That includes you — your own labor and draws use the same rail.' : 'If yours is not connected yet, your batch waits as “finalized” until it is. Nothing is lost and nothing is sent by another route.'}
      </P>
      <Facts rows={[
        ['Pay week', `${p.weekStart} – ${p.weekEnd}`],
        ['Payroll runs', `${p.runDay} ${p.runHourUtc}:00 UTC`],
        ['Weekly payout fee to you', money(p.weeklyFee)],
        ['Daily payouts (optional, admin enables)', p.dailyFeeLabel],
      ]} />
      <Muted>Weekly is free because EFD absorbs Stripe’s payout fee. Daily payouts pass Stripe’s fee through plus a flat fee, netted out of each transfer; the batch shows gross, fee and net.</Muted>
    </Section>
  );
}

function EfdEarnsBlock({ t, role }) {
  const l = t.labor; const s = t.sales; const w = t.workOrders;
  return (
    <>
      <Section label="Where the money goes" title="What EFD earns, and where">
        <P>The platform is free. EFD only earns when it does work for you or sells for you. Here is every stream, with today’s numbers:</P>
        <Facts rows={[
          ['Repair labor, retail ticket', `customer pays ${mult(l.businessMultiplier)} the shop-rate labor line · EFD keeps ${pct(l.efdRetailShare)} at your rate`],
          ['Repair labor, store ticket', `customer pays ${mult(l.wholesaleMarkup)} · EFD keeps ${pct(l.efdWholesaleShare)} at your rate`],
          ['Materials on a ticket', `cost ${mult(l.businessMultiplier)} retail · ${mult(l.wholesaleMarkup)} wholesale`],
          ['Work EFD facilitates for an artisan', `labor + materials ${mult(w.markup)}`],
          ['Selling your piece (EFD holds + ships)', pct(s.consignment)],
          ['Selling your piece (you hold + ship)', pct(s.marketplace)],
          ['Custom orders', 'quote minus cost of goods (bonuses and referral commissions come out of this)'],
        ]} />
      </Section>
      <Section label="Not charged" title="What EFD does not take a cut of">
        <Facts rows={[
          ['Casting through EFD’s vendor', 'at cost'],
          ['Shipping and insurance', 'at cost'],
          ['Work you do on your own pieces', 'never billed'],
          ['Selling in person', money(0)],
          ['Listing, membership or platform fee', 'none'],
          ['Stripe’s fee on your weekly payout', 'EFD pays it'],
          ['Stripe’s monthly fee for your connected account', 'EFD pays it'],
        ]} />
        {(role === 'admin' || role === 'dev') && (
          <Muted>Where each number lives: Settings → Pricing (shop rate, admin/business/consumables fees, wholesale markup, tax, delivery fee); Settings → Pay ladder (tiers, pay rates, bench tests); a person’s tier and rate on their artisan profile under Staff &amp; Repair Operations; Settings → Payout fees; Settings → Payroll funding; Settings → QC mode; per-affiliate rate on Affiliates. Consignment/marketplace rates, the client-management bonus and the QC review fee are code defaults with no settings screen yet.</Muted>
        )}
      </Section>
    </>
  );
}

/* ------------------------------ role: artisan ----------------------------- */

function ArtisanPaid({ t }) {
  const l = t.labor; const w = t.workOrders; const s = t.sales; const a = t.affiliate;
  return (
    <>
      <Section label="1 · Bench work on repairs" title={`Hours × ${money(l.payRate.rate)}/hr, credited the moment the job passes QC`} chip={l.payRate.tierLabel ? <StatusChip label={l.payRate.tierLabel} /> : null}>
        <P>
          Every repair task carries a fixed number of hours, set at a proficient pace. When you sign off and the job passes QC, you are credited those hours at your pay rate — finish faster and you still get the full credit. The credit lands in your payroll ledger immediately — not when the customer pays, not when the piece is picked up.
        </P>
        <Facts rows={[
          ['Your pay rate', `${money(l.payRate.rate)} / hour${l.payRate.tierLabel ? ` · ${l.payRate.tierLabel} tier` : l.payRate.source === 'custom' ? ' · negotiated' : ' · shop rate (not yet placed on the ladder)'}`],
          ['Shop rate the customer is priced from', `${money(l.wage)} / hour`],
          ['Retail customer is charged', `${mult(l.businessMultiplier)} the shop-rate labor line`],
          ['Store (wholesale) is charged', `${mult(l.wholesaleMarkup)} the shop-rate labor line`],
          ['You keep of the labor line', `${pct(l.artisanRetailShare)} retail · ${pct(l.artisanWholesaleShare)} wholesale`],
        ]} />
        <Muted>Your rate is snapshotted onto each task at sign-off, so a later change never reprices past work. A fix after a failed QC earns no additional hours: a task is credited once, when it passes. Materials you add from Stuller are billed at cost × the same multiplier; that markup is EFD’s, not part of your credit.</Muted>
      </Section>

      <Section label="Pay ladder" title="Where you sit is decided by a bench test, not a negotiation">
        <P>
          Every tier below has a published rate and the bench work that places you on it. Ask for the test at any time; passing it moves your rate at your next sign-off. The shop rate customers are priced from does not change when you move.
        </P>
        <Stack spacing={1.25}>
          {(t.ladder?.tiers || []).map((tier) => {
            const mine = tier.key === l.payRate.tierKey;
            return (
              <Box key={tier.key} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${mine ? facelift.gold : facelift.hairline}`, bgcolor: mine ? 'rgba(251,191,36,0.08)' : 'transparent' }}>
                <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ ...T.p, color: '#fff', fontWeight: 600 }}>{tier.label}</Typography>
                  <Typography sx={{ ...T.p, color: facelift.gold, fontFamily: facelift.mono, fontSize: 14 }}>{money(tier.rate)}/hr</Typography>
                  {mine && <StatusChip label="you" />}
                </Stack>
                {tier.summary && <Typography sx={{ ...T.muted, mt: 0.25 }}>{tier.summary}</Typography>}
                {tier.requirements?.length > 0 && (
                  <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2.5 }}>
                    {tier.requirements.map((r) => <Typography component="li" key={r} sx={{ ...T.p, fontSize: 14 }}>{r}</Typography>)}
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </Section>

      <Section label="2 · Work orders" title="Work you do for another artisan or for EFD">
        <P>
          When you claim a work order (CAD, bench, gem cutting, engraving) you are credited hours × rate at QC pass, exactly like a repair. The artisan who ordered the work is billed labor + materials × {mult(w.markup)}; the difference is EFD’s facilitation fee, not yours to cover.
        </P>
        <Facts rows={[
          ['QC review of a CAD or piece work order', `${money(w.qcReviewFee)} to the reviewer`],
          ['Client-management bonus (custom orders)', `${pct(w.clientMgmtBonusPct)} of the order’s margin to the CAD designer who handled the client thread`],
          ['Work you do on your own pieces', 'never billed — it is your earnings ledger'],
        ]} />
        <Muted>Labor on your own pieces is not paid through payroll: it comes back to you in the sale price when the piece sells.</Muted>
      </Section>

      <Section label="3 · Selling through EFD" title="Your payout = sale price − EFD’s fee − labor EFD already paid you">
        <P>
          List a piece and EFD sells it. When it sells, your payout is the sale price minus EFD’s fee, minus any labor on that piece that already went to you through payroll (so nothing is paid twice). Sale payouts ride the same weekly batch as your labor and show up as “Sales” on Payroll.
        </P>
        <Facts rows={[
          ['EFD holds and ships it (consignment)', pct(s.consignment)],
          ['You hold and ship it (marketplace)', pct(s.marketplace)],
          ['In between', `${pct(s.pillars.storefront)} storefront + ${pct(s.pillars.custody)} if EFD holds it + ${pct(s.pillars.fulfillment)} if EFD ships it`],
          ['Selling it yourself in person', money(0)],
        ]} />
      </Section>

      <Section label="4 · Referrals" title={`${pct(a.rate)} of pre-tax profit on orders your link brings in`}>
        <P>
          Ask for an affiliate code and share your link. When an order that came through it is paid in full, you earn {pct(a.rate)} of its pre-tax profit (the quote minus cost of goods for customs; price minus cost for shop products). It is written to your payroll ledger and paid with everything else.
        </P>
        <Muted>{a.rateIsDefault ? 'This is the standard rate for a new affiliate; your own rate is set when your code is created.' : 'This is your rate.'} If a product sold without a recorded cost, the commission shows “needs review” until the shop enters the cost — then it is earned normally.</Muted>
      </Section>

      <PayrollBlock t={t} role="artisan" />
    </>
  );
}

function ArtisanApp() {
  return (
    <Section label="Using the app" title="The artisan loop">
      <Steps items={[
        { title: 'Profile', body: 'Business name, about, photo — what the shop shows customers next to your work.', href: '/dashboard/profile', cta: 'Profile' },
        { title: 'Gallery & listings', body: 'Add pieces to your gallery; list the ones for sale. Designs (made-to-order) and one-of-a-kind pieces both become shop listings.', href: '/dashboard/gallery', cta: 'Gallery' },
        { title: 'My Bench', body: 'If you do repair work on site: claim jobs, add parts, sign off tasks. QC pass credits your labor.', href: '/dashboard/repairs/my-bench', cta: 'My Bench' },
        { title: 'My Work', body: 'Work orders you have claimed or been assigned — CAD, bench, gem cutting. Same credit at QC.', href: '/dashboard/artisan/my-work', cta: 'My Work' },
        { title: 'My Invoices', body: 'What you owe (casting, work others did for you). An overdue invoice pauses new work until paid.', href: '/dashboard/artisan/invoices', cta: 'Invoices' },
        { title: 'Payroll', body: 'Connect Stripe once, then watch each week’s batch: labor, sales, status, paid date.', href: '/dashboard/artisan/payroll', cta: 'Payroll' },
        { title: 'Terms', body: 'The plain-language terms you accept: nothing fronted, title passes at payment.', href: '/dashboard/policies', cta: 'Terms' },
      ]} />
    </Section>
  );
}

/* ------------------------------ role: affiliate --------------------------- */

function AffiliatePaid({ t, affiliate }) {
  const a = t.affiliate;
  return (
    <>
      <Section label="Your commission" title={`${pct(a.rate)} of pre-tax profit, once the order is paid in full`} chip={affiliate?.code ? <StatusChip label={`code ${affiliate.code}`} /> : null}>
        <P>
          Share your link or code. Every order that comes through it is tagged to you. When that order is paid in full, you earn {pct(a.rate)} of its pre-tax profit — never revenue, never after tax. For a custom order that is the quoted total minus the quoted cost of goods, fixed at quote time so shop cost overruns can never lower your number. For shop products it is the sale price minus the product’s recorded cost.
        </P>
        <Facts rows={[
          ['Rate', `${pct(a.rate)}${a.rateIsDefault ? ' (standard)' : ''}`],
          ['Base', 'pre-tax profit'],
          ['Earned when', 'the order is paid in full'],
          ['Paid how', 'as an entry in your weekly payout batch'],
        ]} />
        <Muted>“Needs review” means a product on the order has no recorded cost yet. The shop enters it and the commission becomes earned; you do not have to do anything. Refunded or cancelled orders do not earn.</Muted>
      </Section>
      <PayrollBlock t={t} role="affiliate" />
    </>
  );
}

function AffiliateApp() {
  return (
    <Section label="Using the app" title="The affiliate loop">
      <Steps items={[
        { title: 'Set your code', body: 'Your dashboard shows your code and link; you can change the code once it is yours.', href: '/dashboard/affiliate', cta: 'Dashboard' },
        { title: 'Campaigns', body: 'Make a link per channel so you can see which one converts.', href: '/dashboard/affiliate/campaigns', cta: 'Campaigns' },
        { title: 'Referred clients', body: 'Who came through you and what they ordered.', href: '/dashboard/affiliate/clients', cta: 'Clients' },
        { title: 'Payouts', body: 'Connect Stripe once. Each week’s batch shows gross, fee and net.', href: '/dashboard/affiliate/payouts', cta: 'Payouts' },
      ]} />
    </Section>
  );
}

/* ------------------------------ role: wholesaler -------------------------- */

function WholesalerPricing({ t }) {
  const w = t.wholesale;
  return (
    <>
      <Section label="Pricing" title={`Your price is the shop’s base cost × ${mult(w.markup)}`}>
        <P>
          The price sheet is built from the shop’s labor and material costs with the wholesale markup applied. You price your own repairs from it when you create a ticket; if a job needs a look first, request a quote and the shop prices it — a ticket prints either way.
        </P>
        <Facts rows={[
          ['Wholesale markup on labor and materials', mult(w.markup)],
          ['Stuller parts added to a job', `cost × ${mult(w.markup)}`],
          ['Sales tax', w.taxRate > 0 ? `${pct(w.taxRate, 2)} unless your resale permit is on file` : 'per your permit'],
          ['Hand delivery back to your store', w.deliveryFee > 0 ? `${money(w.deliveryFee)} per delivery` : 'no charge'],
          ['Shipping back to your store', 'at cost (FedEx via EasyPost)'],
          ['Pickup at the shop', money(0)],
        ]} />
      </Section>
      <Section label="Billing" title="Invoiced when the work passes QC">
        <P>
          Each repair is invoiced the moment it passes quality control and is added to your open balance. Pay by cash or card at pickup or delivery, or by the payment link on the invoice. Your default return method (pickup, hand delivery, ship) is set in your store settings and applied automatically at finalize.
        </P>
      </Section>
    </>
  );
}

function WholesalerApp() {
  return (
    <Section label="Using the app" title="The store loop">
      <Steps items={[
        { title: 'Create a repair', body: 'Describe the work in a sentence or by voice, add photos, pick tasks from the price sheet or request a quote. Print the ticket.', href: '/dashboard/repairs/new', cta: 'New repair' },
        { title: 'Track it', body: 'Current and completed repairs, status and expected date.', href: '/dashboard/wholesaler/repairs/current', cta: 'Current' },
        { title: 'Get it back', body: 'Pickup, hand delivery or shipment — your default, changeable per job. Shipments show tracking.', href: '/dashboard/wholesaler/shipments', cta: 'Shipments' },
        { title: 'Billing', body: 'Open invoices, payments and statements.', href: '/dashboard/wholesaler/billing', cta: 'Billing' },
        { title: 'Price sheet', body: 'Your live prices — they move with metal markets and the shop’s rates.', href: '/dashboard/wholesaler/price-sheet', cta: 'Price sheet' },
        { title: 'Store settings', body: 'Business info, resale permit, return method.', href: '/dashboard/wholesaler/account-settings', cta: 'Settings' },
      ]} />
    </Section>
  );
}

/* --------------------------------- admin ---------------------------------- */

function AdminOps({ t }) {
  return (
    <Section label="Shop operations" title="What runs by itself, and when">
      <Facts rows={[
        ['Weekly payroll (finalize + Stripe transfers)', `${t.payroll.runDay} ${t.payroll.runHourUtc}:00 UTC`],
        ['Daily payouts (for daily-cadence payees)', 'every day 12:00 UTC'],
        ['Payroll funding check (top-up if below floor)', 'every day 15:00 UTC'],
        ['Affiliate commissions', 'every 30 minutes, on fully-paid orders'],
        ['Listing reprice off the metal snapshot', 'hourly'],
        ['QC mode', t.qc.mode === 'self-certify' ? 'self-certify (bench “Done” passes QC)' : 'separate reviewer'],
      ]} />
      <Muted>Your own labor is credited at QC pass like anyone’s; your weekly batch pays out to your connected account. Owner-operator labor keeps payroll-payable under §4.4.</Muted>
    </Section>
  );
}

/* --------------------------------- page ----------------------------------- */

const TABS = { paid: 'Getting paid', earns: 'What EFD earns', app: 'Using the app' };

export default function GuidePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('paid');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetch('/api/guide').then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not load the guide.');
      setData(d);
    }).catch((e) => setError(e.message));
  }, []);

  const markRead = async () => {
    setMarking(true);
    try {
      await fetch('/api/guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) });
      setData((d) => d ? { ...d, checklist: d.checklist.map((i) => (i.id === 'read-guide' ? { ...i, done: true } : i)) } : d);
    } finally { setMarking(false); }
  };

  if (error) return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: facelift.gold }} /></Box>;

  const { role, terms: t } = data;
  const isAdmin = role === 'admin' || role === 'dev';
  const isWholesaler = role === 'wholesaler';
  const isAffiliate = role === 'affiliate';
  const readItem = data.checklist.find((i) => i.id === 'read-guide');
  const tabLabels = { ...TABS, ...(isWholesaler ? { paid: 'Pricing & billing' } : {}), ...(isAdmin ? { app: 'Operations' } : {}) };

  return (
    <Box sx={{ pb: 8, maxWidth: 860, mx: 'auto' }}>
      <PageHeader
        badge="How EFD works"
        badgeIcon={<MenuBookIcon fontSize="small" />}
        title={isWholesaler ? 'How pricing, billing and returns work' : isAffiliate ? 'How you get paid' : 'How you get paid, and what EFD keeps'}
        subtitle="Every number on this page is read from the shop’s live settings — the same values that price each ticket and each payout."
        actions={readItem && !readItem.done ? (
          <Button variant="contained" size="small" disabled={marking} onClick={markRead} startIcon={<CheckCircleIcon />} sx={{ textTransform: 'none', bgcolor: facelift.gold, color: '#1a1205', '&:hover': { bgcolor: facelift.gold } }}>
            I’ve read this
          </Button>
        ) : readItem ? <StatusChip label="read" hue="#66BB6A" /> : null}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 2, minHeight: 40, '& .MuiTab-root': { textTransform: 'none', minHeight: 40, color: 'rgba(255,255,255,0.6)' }, '& .Mui-selected': { color: `${facelift.gold} !important` }, '& .MuiTabs-indicator': { bgcolor: facelift.gold } }}
      >
        {Object.entries(tabLabels).map(([k, v]) => <Tab key={k} value={k} label={v} />)}
      </Tabs>

      <Stack spacing={2}>
        {tab === 'paid' && (
          isWholesaler ? <WholesalerPricing t={t} />
            : isAffiliate ? <AffiliatePaid t={t} affiliate={data.affiliate} />
              : <ArtisanPaid t={t} />
        )}
        {tab === 'earns' && <EfdEarnsBlock t={t} role={role} />}
        {tab === 'app' && (
          isWholesaler ? <WholesalerApp />
            : isAffiliate ? <AffiliateApp />
              : isAdmin ? <><AdminOps t={t} /><ArtisanApp /></>
                : <ArtisanApp />
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3 }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
        <Muted>Questions about a number? It comes from the shop settings; ask the shop and they can show you exactly where.</Muted>
        {!isWholesaler && !isAffiliate && (
          <Button size="small" onClick={() => router.push('/dashboard/policies')} endIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none', color: facelift.gold, flexShrink: 0 }}>Artisan terms</Button>
        )}
      </Stack>
    </Box>
  );
}
