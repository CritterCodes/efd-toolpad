/**
 * Admin/Staff/Dev Dashboard Content
 * Facelift Ring 1 conversion: containers use the facelift primitives; the
 * data flow, queues, lookup, and scanner behavior are unchanged.
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Inventory2 as Inventory2Icon,
  MonetizationOn as MonetizationOnIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Storefront as StorefrontIcon,
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';
import { PageHeader, SurfaceCard, SectionLabel, StatusChip, facelift, tint } from '@/components/facelift';
import GettingStartedCard from '@/components/guide/GettingStartedCard';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return 'No recent activity';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

/** 40px gold icon tile — the mock's row/stat icon treatment. */
function IconTile({ children }) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: `1px solid ${facelift.border}`,
        color: facelift.gold,
        flexShrink: 0,
        '& svg': { fontSize: 19 },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Stat card with a supporting line (and optional progress). The facelift
 * MetricCard carries value + label only; the dashboard's stats each explain
 * themselves with a sentence, which is worth keeping.
 */
function StatCard({ label, value, subtext, icon, progress }) {
  return (
    <SurfaceCard>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <SectionLabel>{label}</SectionLabel>
          <Typography
            sx={{
              mt: 1,
              fontSize: '1.75rem',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </Typography>
        </Box>
        <IconTile>{icon}</IconTile>
      </Box>
      <Typography sx={{ mt: 'auto', pt: 1.5, fontSize: '0.8125rem', lineHeight: 1.55, color: facelift.text2 }}>
        {subtext}
      </Typography>
      {typeof progress === 'number' && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
            <Box sx={{ width: `${progress}%`, height: '100%', borderRadius: 999, backgroundColor: facelift.gold }} />
          </Box>
          <Typography sx={{ mt: 1, fontFamily: facelift.mono, fontSize: '0.66rem', color: facelift.text3 }}>
            {progress}% of total repair volume completed
          </Typography>
        </Box>
      )}
    </SurfaceCard>
  );
}

/** Mono overline + section title, with an optional action on the right. */
function PanelHeader({ overline, title, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <SectionLabel>{overline}</SectionLabel>
        <Typography sx={{ mt: 0.75, fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.022em' }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}

/** Gold text link-button used at the end of rows and panels. */
function OpenLink({ onClick, children = 'Open' }) {
  return (
    <Button
      endIcon={<ArrowForwardIcon />}
      onClick={onClick}
      sx={{
        color: facelift.gold,
        minWidth: 0,
        p: 0,
        textTransform: 'none',
        fontWeight: 600,
        '&:hover': { backgroundColor: 'transparent', opacity: 0.9 },
      }}
    >
      {children}
    </Button>
  );
}

const rowDividerSx = {
  py: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  '& + &': { borderTop: `1px solid ${facelift.hairline}` },
};

function QueuePanel({ items, onNavigate }) {
  return (
    <SurfaceCard sx={{ height: '100%' }}>
      <PanelHeader overline="Operational queues" title="Focus for today" />
      <Box sx={{ mt: 1 }}>
        {items.map((item) => (
          <Box key={item.label} sx={rowDividerSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <IconTile>{item.icon}</IconTile>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>{item.label}</Typography>
                <Typography sx={{ color: facelift.text2, fontSize: '0.8125rem' }}>{item.detail}</Typography>
              </Box>
            </Box>
            <Stack alignItems="flex-end" spacing={0.75} sx={{ flexShrink: 0 }}>
              <Typography
                sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
              >
                {item.value}
              </Typography>
              <OpenLink onClick={() => onNavigate(item.href)} />
            </Stack>
          </Box>
        ))}
      </Box>
    </SurfaceCard>
  );
}

function PriorityNotice({ hue = facelift.gold, children }) {
  return (
    <SurfaceCard accent={hue} sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, py: 1.75 }}>
      <Typography sx={{ fontSize: '0.875rem' }}>{children}</Typography>
    </SurfaceCard>
  );
}

const DONE_STATUSES = ['READY FOR PICKUP', 'READY FOR PICK-UP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'COMPLETED'];

function statusHue(status) {
  return DONE_STATUSES.includes(status) ? facelift.gold : '#A1A1AA';
}

function getRepairSearchText(repair) {
  return [
    repair.repairID,
    repair.clientName,
    repair.customerName,
    repair.businessName,
    repair.description,
    repair.repairType,
    repair.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getRepairDisplayName(repair) {
  return repair.clientName || repair.customerName || repair.businessName || 'Unknown customer';
}

function RepairLookupPanel({ repairs, onNavigate, autoOpenScanner = false }) {
  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState('');
  const [cameraScannerOpen, setCameraScannerOpen] = React.useState(false);
  const autoOpenedScannerRef = React.useRef(false);

  const trimmedQuery = query.trim();
  const matches = React.useMemo(() => {
    if (!trimmedQuery) return [];

    const normalized = trimmedQuery.toLowerCase();
    return repairs
      .filter((repair) => getRepairSearchText(repair).includes(normalized))
      .slice(0, 6);
  }, [repairs, trimmedQuery]);

  const openRepair = (repairID) => {
    if (!repairID) return;
    onNavigate(`/dashboard/repairs/${encodeURIComponent(repairID)}`);
  };

  const findRepair = (value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;

    const exactMatch = repairs.find((repair) => String(repair.repairID || '').toLowerCase() === normalizedValue);
    if (exactMatch) return exactMatch;

    return repairs.find((repair) => getRepairSearchText(repair).includes(normalizedValue)) || null;
  };

  const handleLookup = (value) => {
    setError('');

    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return;

    const target = findRepair(normalizedValue);

    if (target?.repairID) {
      openRepair(target.repairID);
      return;
    }

    setError(`No repair found for "${normalizedValue}".`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleLookup(trimmedQuery);
  };

  const handleCameraScan = (value) => {
    setQuery(value);
    handleLookup(value);
  };

  React.useEffect(() => {
    if (!autoOpenScanner || autoOpenedScannerRef.current) return;
    autoOpenedScannerRef.current = true;
    setCameraScannerOpen(true);
  }, [autoOpenScanner]);

  return (
    <SurfaceCard>
      <PanelHeader
        overline="Repair lookup"
        title="Scan or search repairs"
        action={(
          <Button
            startIcon={<WorkIcon />}
            onClick={() => onNavigate('/dashboard/repairs/my-bench')}
            variant="outlined"
          >
            My Bench
          </Button>
        )}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 2.5,
          display: 'flex',
          gap: 1,
          alignItems: 'stretch',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}
      >
        <TextField
          fullWidth
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (error) setError('');
          }}
          placeholder="Scan a repair ticket barcode or search name, repair ID, business, status"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerIcon sx={{ color: facelift.gold }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon sx={{ color: facelift.text3 }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!trimmedQuery}
          startIcon={<SearchIcon />}
          sx={{ px: 2.5, minWidth: { xs: '100%', md: 120 } }}
        >
          Search
        </Button>
        <Button
          type="button"
          variant="outlined"
          startIcon={<QrCodeScannerIcon />}
          onClick={() => setCameraScannerOpen(true)}
          sx={{ px: 2.5, minWidth: { xs: '100%', md: 140 } }}
        >
          Camera Scan
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {trimmedQuery && matches.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {matches.map((repair) => (
            <Box key={repair.repairID} sx={{ ...rowDividerSx, py: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {getRepairDisplayName(repair)}
                </Typography>
                <Typography sx={{ color: facelift.text2, fontSize: '0.8125rem' }}>
                  {repair.repairID} · {repair.repairType || repair.description || 'Repair'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
                <StatusChip label={repair.status || 'No status'} hue={statusHue(repair.status)} />
                <OpenLink onClick={() => openRepair(repair.repairID)} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <ContinuousBarcodeScanner
        open={cameraScannerOpen}
        title="Scan Repair Ticket"
        queuedCount={0}
        actionLabel="Close Scanner"
        onClose={() => setCameraScannerOpen(false)}
        onScan={handleCameraScan}
        onAction={() => setCameraScannerOpen(false)}
      >
        <Typography variant="body2" sx={{ color: facelift.text2 }}>
          Scan a repair ticket QR code or barcode to open the matching repair.
        </Typography>
      </ContinuousBarcodeScanner>
    </SurfaceCard>
  );
}

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
