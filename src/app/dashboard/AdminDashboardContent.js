/**
 * Admin/Staff/Dev Dashboard Content
 * Facelift Ring 1 conversion: containers use the facelift primitives; the
 * data flow, queues, lookup, and scanner behavior are unchanged.
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Inventory2 as Inventory2Icon,
  MonetizationOn as MonetizationOnIcon,
  Settings as SettingsIcon,
  Storefront as StorefrontIcon,
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import { PageHeader, SurfaceCard, SectionLabel, StatusChip, facelift, tint } from '@/components/facelift';
import GettingStartedCard from '@/components/guide/GettingStartedCard';
import { IconTile, OpenLink, PanelHeader, PriorityNotice, QueuePanel, StatCard, formatCurrency, formatDate, rowDividerSx, statusHue } from './adminDashboardParts';
import { RepairLookupPanel } from './RepairLookupPanel';

export default function AdminDashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { repairs, loading } = useRepairs();
  const [analyticsSnapshot, setAnalyticsSnapshot] = React.useState(null);
  const [reportSnapshot, setReportSnapshot] = React.useState(null);

  React.useEffect(() => {
    let active = true;

    const loadSnapshots = async () => {
      try {
        const [analyticsResponse, reportsResponse] = await Promise.all([
          fetch('/api/analytics/summary?dateRange=last_month&includeLegacy=false'),
          fetch('/api/analytics/reports?dateRange=last_week'),
        ]);
        const [analyticsData, reportsData] = await Promise.all([
          analyticsResponse.json(),
          reportsResponse.json(),
        ]);
        if (!analyticsResponse.ok) throw new Error(analyticsData.error || 'Failed to load dashboard analytics.');
        if (!reportsResponse.ok) throw new Error(reportsData.error || 'Failed to load dashboard reports.');
        if (active) {
          setAnalyticsSnapshot(analyticsData);
          setReportSnapshot(reportsData);
        }
      } catch (error) {
        console.error('Failed to load admin dashboard analytics snapshot:', error);
      }
    };

    loadSnapshots();
    return () => { active = false; };
  }, []);

  const dashboardMetrics = React.useMemo(() => {
    if (!repairs || loading) {
      return {
        totalRepairs: 0,
        pendingReceipts: [],
        pendingWholesale: [],
        completed: [],
        qcRequired: [],
        rushJobs: [],
        averageValue: 0,
      };
    }

    const pendingReceipts = repairs.filter((r) => r.status === 'RECEIVING');
    const pendingWholesale = repairs.filter((r) => r.status === 'PENDING PICKUP' || r.status === 'PICKUP REQUESTED');
    const completed = repairs.filter((r) => ['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP'].includes(r.status));
    const qcRequired = repairs.filter((r) => r.status === 'QC' || r.status === 'QUALITY CONTROL' || r.status === 'quality-control');
    const rushJobs = repairs.filter((r) => r.rushJob === true || r.priority === 'rush');

    const averageValue = completed.length > 0
      ? completed.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0) / completed.length
      : 0;

    return {
      totalRepairs: repairs.length,
      pendingReceipts,
      pendingWholesale,
      completed,
      qcRequired,
      rushJobs,
      averageValue,
    };
  }, [repairs, loading]);

  const recentActivity = React.useMemo(() => {
    if (!repairs || loading) return [];

    return repairs
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map((repair) => ({
        id: repair.repairID || repair._id,
        customerName: repair.customerName || 'Unknown Customer',
        status: repair.status,
        updatedAt: repair.updatedAt,
        type: repair.repairType || 'General Repair',
      }));
  }, [repairs, loading]);

  const completionRate = dashboardMetrics.totalRepairs > 0
    ? Math.round((dashboardMetrics.completed.length / dashboardMetrics.totalRepairs) * 100)
    : 0;

  const dashboardFinance = {
    lastMonthRevenue: analyticsSnapshot?.revenue?.totalRevenue || 0,
    lastMonthGoLiveRepairs: analyticsSnapshot?.repairOverview?.goLiveRepairCount || 0,
    lastWeekCashCollected: reportSnapshot?.cashCollected?.summary?.totalCollected || 0,
    outstandingReceivables: reportSnapshot?.accountsReceivable?.summary?.outstandingBalance || 0,
    closeoutBottlenecks:
      (reportSnapshot?.closeoutBottlenecks?.summary?.completedUninvoicedCount || 0)
      + (reportSnapshot?.closeoutBottlenecks?.summary?.readyForPickupUnpaidCount || 0),
  };

  const operationalQueues = [
    {
      label: 'Receiving queue',
      value: dashboardMetrics.pendingReceipts.length,
      detail: 'Incoming repairs waiting for intake review',
      icon: <Inventory2Icon fontSize="small" />,
      href: '/dashboard/repairs/receiving',
    },
    {
      label: 'Quality control',
      value: dashboardMetrics.qcRequired.length,
      detail: 'Repairs currently sitting in the QC location',
      icon: <CheckCircleIcon fontSize="small" />,
      href: '/dashboard/repairs/move?mode=scan',
    },
    {
      label: 'Wholesale coordination',
      value: dashboardMetrics.pendingWholesale.length,
      detail: 'Wholesale pickups and store coordination',
      icon: <StorefrontIcon fontSize="small" />,
      href: '/dashboard/repairs/pending-wholesale',
    },
  ];

  const quickActions = [
    {
      title: 'Repairs board',
      subtitle: 'See every repair in the workflow',
      icon: <BuildIcon fontSize="small" />,
      href: '/dashboard/repairs',
    },
    {
      title: 'My Bench',
      subtitle: 'Claim work and manage active bench repairs',
      icon: <WorkIcon fontSize="small" />,
      href: '/dashboard/repairs/my-bench',
    },
    {
      title: 'Task builder',
      subtitle: 'Manage repair operations and pricing logic',
      icon: <AssignmentIcon fontSize="small" />,
      href: '/dashboard/admin/tasks',
    },
    {
      title: 'Admin settings',
      subtitle: 'Pricing, stores, and system controls',
      icon: <SettingsIcon fontSize="small" />,
      href: '/dashboard/admin/settings',
    },
  ];

  if (loading) {
    return (
      <SurfaceCard>
        <SectionLabel>Operations overview</SectionLabel>
        <Typography sx={{ mt: 1, fontSize: '1.375rem', fontWeight: 600 }}>Loading dashboard</Typography>
        <LinearProgress sx={{ mt: 2.5 }} />
      </SurfaceCard>
    );
  }

  return (
    <Stack spacing={2.5}>
      <GettingStartedCard sx={{ marginBottom: 0 }} />
      {(dashboardMetrics.rushJobs.length > 0 || dashboardMetrics.pendingWholesale.length > 0) && (
        <Stack spacing={1.5}>
          {dashboardMetrics.rushJobs.length > 0 && (
            <PriorityNotice hue="#F87171">
              {dashboardMetrics.rushJobs.length} rush job(s) need priority handling.
            </PriorityNotice>
          )}
          {dashboardMetrics.pendingWholesale.length > 0 && (
            <PriorityNotice>
              {dashboardMetrics.pendingWholesale.length} wholesale repair(s) need coordination.
            </PriorityNotice>
          )}
        </Stack>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.7fr) minmax(360px, 0.95fr)' },
          gap: 2.5,
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <PageHeader
            badge="Operations overview"
            title={`Welcome back, ${session?.user?.firstName || session?.user?.name || 'team'}`}
            subtitle="Track repair flow, revenue, and operational bottlenecks from one place."
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.75,
              flex: 1,
            }}
          >
            <StatCard
              label="Active repairs"
              value={dashboardMetrics.totalRepairs}
              subtext="Total repairs currently in the system"
              icon={<BuildIcon fontSize="small" />}
              progress={completionRate}
            />
            <StatCard
              label="Last month revenue"
              value={formatCurrency(dashboardFinance.lastMonthRevenue)}
              subtext={`${dashboardFinance.lastMonthGoLiveRepairs} go-live repair(s) invoiced`}
              icon={<MonetizationOnIcon fontSize="small" />}
            />
            <StatCard
              label="Last week cash"
              value={formatCurrency(dashboardFinance.lastWeekCashCollected)}
              subtext={`${formatCurrency(dashboardFinance.outstandingReceivables)} still sitting in receivables`}
              icon={<TrendingUpIcon fontSize="small" />}
            />
          </Box>
        </Box>

        <QueuePanel items={operationalQueues} onNavigate={(href) => router.push(href)} />
      </Box>

      <RepairLookupPanel
        repairs={repairs || []}
        onNavigate={(href) => router.push(href)}
        autoOpenScanner={searchParams.get('scanRepair') === '1'}
      />

      <SurfaceCard>
        <PanelHeader
          overline="Analytics at a glance"
          title="Business health"
          action={<OpenLink onClick={() => router.push('/dashboard/analytics/reports')}>Open analytics reports</OpenLink>}
        />
        <Box
          sx={{
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
            gap: 1.75,
          }}
        >
          <StatCard
            label="Accounts receivable"
            value={formatCurrency(dashboardFinance.outstandingReceivables)}
            subtext="Open invoice balances that still need collection"
            icon={<MonetizationOnIcon fontSize="small" />}
          />
          <StatCard
            label="Closeout bottlenecks"
            value={dashboardFinance.closeoutBottlenecks}
            subtext="Completed jobs still waiting on invoice or payment"
            icon={<AssignmentIcon fontSize="small" />}
          />
          <StatCard
            label="Average ticket"
            value={formatCurrency(dashboardMetrics.averageValue)}
            subtext="Average completed repair value in current data"
            icon={<TrendingUpIcon fontSize="small" />}
          />
          <StatCard
            label="Go-live repairs"
            value={dashboardFinance.lastMonthGoLiveRepairs}
            subtext="Repairs entered in the clean system last month"
            icon={<BuildIcon fontSize="small" />}
          />
        </Box>
      </SurfaceCard>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(320px, 0.9fr)' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <SurfaceCard>
          <PanelHeader
            overline="Live feed"
            title="Recent repair activity"
            action={<OpenLink onClick={() => router.push('/dashboard/repairs')}>View all repairs</OpenLink>}
          />

          <Box sx={{ mt: 1 }}>
            {recentActivity.map((item) => (
              <Box key={item.id} sx={{ ...rowDividerSx, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: tint(facelift.gold).bg,
                      color: facelift.gold,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {(item.customerName || 'U')[0].toUpperCase()}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>{item.customerName}</Typography>
                    <Typography sx={{ color: facelift.text2, fontSize: '0.8125rem' }}>
                      {item.type} · {formatDate(item.updatedAt)}
                    </Typography>
                  </Box>
                </Box>
                <StatusChip label={item.status || 'No status'} hue={statusHue(item.status)} />
              </Box>
            ))}
          </Box>
        </SurfaceCard>

        <SurfaceCard>
          <PanelHeader overline="Quick actions" title="Jump into work" />
          <Box sx={{ mt: 1 }}>
            {quickActions.map((action) => (
              <Box key={action.title} sx={rowDividerSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <IconTile>{action.icon}</IconTile>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>{action.title}</Typography>
                    <Typography sx={{ color: facelift.text2, fontSize: '0.8125rem' }}>{action.subtitle}</Typography>
                  </Box>
                </Box>
                <OpenLink onClick={() => router.push(action.href)} />
              </Box>
            ))}
          </Box>
        </SurfaceCard>
      </Box>
    </Stack>
  );
}
