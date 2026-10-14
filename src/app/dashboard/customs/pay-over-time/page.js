'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FaceliftRoot, PageBody, PageHeader, MetricRow, MetricCard, SectionLabel, LineItem, CardGrid, SurfaceCard,
  StatusChip, QuietButton, LoadingPage, facelift,
} from '@/components/facelift';

/**
 * PAY OVER TIME — every open pay-over-time custom order and what it needs from the owner this week.
 *
 * Owner, 2026-10-14: "In admin, I need to be able to see anything related to a pay-as-you-go custom and
 * jobs that I need to do each week." The same chores go out by email every Monday
 * (cron pay-over-time-weekly). Data: GET /api/custom-orders/pay-over-time; the decisions behind each
 * chore are in services/customs/payOverTime.js choresFor().
 */

const money = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');
const RED = '#EF5350';
const GREEN = '#66BB6A';

function nextStage(ladder = {}) {
  const g = (ladder.gates || []).find((x) => !x.covered);
  return g ? `${money(g.toCover)} secures ${g.name.toLowerCase()}` : 'All stages paid';
}

export default function PayOverTimePage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/custom-orders/pay-over-time')
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Only admins can see pay-over-time orders.' : 'Could not load pay-over-time orders.');
        return r.json();
      })
      .then((d) => setRows(d.orders || []))
      .catch((e) => setError(e.message));
  }, []);

  if (!rows && !error) return <FaceliftRoot><LoadingPage label="Loading pay-over-time orders" shape="cards" /></FaceliftRoot>;

  const list = rows || [];
  const withChores = list.filter((r) => r.chores.length);
  const overdue = list.filter((r) => r.overdueSince || r.clock?.overdue).length;
  const collected = list.reduce((s, r) => s + (Number(r.progress.totalPaid) || 0), 0);

  return (
    <FaceliftRoot>
      <PageBody>
        <PageHeader
          badge="Customs"
          title="Pay over time"
          subtitle="Every open pay-over-time order and what it needs from you this week. The same list is emailed to you every Monday."
          actions={<QuietButton as={Link} href="/dashboard/customs">All customs</QuietButton>}
        />
        {error ? <p>{error}</p> : (
          <>
            <MetricRow>
              <MetricCard value={list.length} label="Open orders" />
              <MetricCard value={withChores.length} label="Need you this week" emphasis={withChores.length > 0} />
              <MetricCard value={overdue} label="Payment overdue" accent={overdue ? RED : facelift.gold} emphasis={overdue > 0} />
              <MetricCard value={money(collected)} label="Collected so far" />
            </MetricRow>

            <SectionLabel>This week</SectionLabel>
            {withChores.length === 0
              ? <p>Nothing to do: every stone is checked, nothing is overdue, nothing is waiting to be bought.</p>
              : withChores.map((r) => (
                <Link key={r.customID} href={`/dashboard/customs/${r.customID}`}>
                  <LineItem
                    title={`${r.title || r.customID}${r.customerName ? ` · ${r.customerName}` : ''}`}
                    meta={r.chores.map((c) => c.label).join(' · ')}
                    tone={r.chores.some((c) => c.key === 'overdue') ? RED : undefined}
                    value="Open →"
                  />
                </Link>
              ))}

            <SectionLabel>All pay-over-time orders</SectionLabel>
            {list.length === 0 ? <p>No open pay-over-time orders.</p> : (
              <CardGrid>
                {list.map((r) => (
                  <SurfaceCard key={r.customID} as={Link} href={`/dashboard/customs/${r.customID}`} interactive accent={r.overdueSince || r.clock?.overdue ? RED : undefined}>
                    <LineItem
                      title={r.title || r.customID}
                      meta={`${r.customerName || r.customerEmail || ''}${r.customerName || r.customerEmail ? ' · ' : ''}${r.customID}`}
                      chips={(
                        <>
                          {(r.overdueSince || r.clock?.overdue) && <StatusChip label="Overdue" hue={RED} solid />}
                          {r.progress.readyForProduction && <StatusChip label="Production paid" hue={GREEN} />}
                          {r.stoneItem && r.stoneCheck?.status && <StatusChip label={`Stone: ${r.stoneCheck.status}`} hue={r.stoneCheck.status === 'sold' ? RED : GREEN} />}
                          {r.stoneDue && <StatusChip label="Stone check due" />}
                        </>
                      )}
                      value={`${r.progress.paymentProgress}%`}
                    />
                    <LineItem title="Paid" value={`${money(r.progress.totalPaid)} of ${money(r.progress.projectTotal)}`} />
                    <LineItem title="Next stage" value={nextStage(r.ladder)} />
                    <LineItem title="Next payment" value={r.clock?.dueBy ? `${money(r.clock.minimumDue)} by ${day(r.clock.dueBy)}` : '—'} />
                    <LineItem title="Mounting" value={r.ladder?.mountingGatePaid ? 'Paid, locked' : r.followsMarket ? 'Follows metal market' : 'Typed by hand (fixed)'} />
                  </SurfaceCard>
                ))}
              </CardGrid>
            )}
          </>
        )}
      </PageBody>
    </FaceliftRoot>
  );
}
