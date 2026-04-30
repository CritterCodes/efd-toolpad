/**
 * Admin/Staff/Dev Dashboard Content
 * Industrial luxury dashboard baseline aligned with UI_REDESIGN_DESIGN_DOC.md.
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
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
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

const COLORS = {
  bgPrimary: '#0F1115',
  bgPanel: '#15181D',
  bgSecondary: '#171A1F',
  bgTertiary: '#1F232A',
  border: '#2A2F38',
  textPrimary: '#E6E8EB',
  textHeader: '#D1D5DB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#D4AF37',
};

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

function Surface({ children, sx }) {
  return (
    <Box
      sx={{
        backgroundColor: COLORS.bgPanel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        color: COLORS.textPrimary,
        p: 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function MetricCard({ label, value, subtext, icon, progress }) {
  return (
    <Box
      sx={{
        height: '100%',
        backgroundColor: COLORS.bgSecondary,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        p: 2.5,
      }}
    >
      <Stack spacing={2.5} sx={{ height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: 12, mb: 1 }}>{label}</Typography>
            <Typography sx={{ fontSize: { xs: 34, md: 40 }, fontWeight: 700, lineHeight: 1, color: COLORS.textHeader }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: COLORS.bgTertiary,
              color: COLORS.accent,
              border: `1px solid ${COLORS.border}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Box sx={{ mt: 'auto' }}>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: 14 }}>{subtext}</Typography>
          {typeof progress === 'number' && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: COLORS.bgTertiary,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    backgroundColor: COLORS.accent,
                  },
                }}
              />
              <Typography sx={{ mt: 1, color: COLORS.textMuted, fontSize: 12 }}>
                {progress}% of total repair volume completed
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function QueuePanel({ items, onNavigate }) {
  return (
    <Surface sx={{ height: '100%' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, mb: 0.75 }}>
            Operational queues
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 600, color: COLORS.textHeader }}>Focus for today</Typography>
        </Box>

        <Stack divider={<Divider sx={{ borderColor: COLORS.border }} />}>
          {items.map((item) => (
            <Box
              key={item.label}
              sx={{
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: COLORS.bgSecondary,
                    color: COLORS.accent,
                    border: `1px solid ${COLORS.border}`,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: COLORS.textHeader }}>{item.label}</Typography>
                  <Typography sx={{ color: COLORS.textSecondary, fontSize: 14 }}>{item.detail}</Typography>
                </Box>
              </Box>
              <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
                <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: COLORS.textHeader }}>{item.value}</Typography>
                <Button
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => onNavigate(item.href)}
                  sx={{
                    color: COLORS.accent,
                    minWidth: 0,
                    p: 0,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: 'transparent', opacity: 0.9 },
                  }}
                >
                  Open
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Surface>
  );
}

function PriorityNotice({ children }) {
  return (
    <Alert
      icon={false}
      sx={{
        backgroundColor: COLORS.bgPanel,
        color: COLORS.textPrimary,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `2px solid ${COLORS.accent}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        '& .MuiAlert-message': { padding: 0 },
      }}
    >
      {children}
    </Alert>
  );
}

function getStatusTone(status) {
  if (['READY FOR PICKUP', 'READY FOR PICK-UP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'COMPLETED'].includes(status)) {
    return { color: COLORS.textPrimary, bg: COLORS.bgSecondary, borderLeft: `2px solid ${COLORS.accent}` };
  }

  return { color: COLORS.textSecondary, bg: COLORS.bgSecondary, borderLeft: `2px solid ${COLORS.border}` };
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

function RepairLookupPanel({ repairs, onNavigate }) {
  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState('');

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

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!trimmedQuery) return;

    const exactMatch = repairs.find((repair) => String(repair.repairID || '').toLowerCase() === trimmedQuery.toLowerCase());
    const target = exactMatch || matches[0];

    if (target?.repairID) {
      openRepair(target.repairID);
      return;
    }

    setError(`No repair found for "${trimmedQuery}".`);
  };

  return (
    <Surface>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, mb: 0.75 }}>
              Repair lookup
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 600, color: COLORS.textHeader }}>Scan or search repairs</Typography>
          </Box>
          <Button
            startIcon={<WorkIcon />}
            onClick={() => onNavigate('/dashboard/repairs/my-bench')}
            sx={{
              color: COLORS.accent,
              borderColor: COLORS.border,
              textTransform: 'none',
              fontWeight: 600,
            }}
            variant="outlined"
          >
            My Bench
          </Button>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
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
                  <QrCodeScannerIcon sx={{ color: COLORS.accent }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: COLORS.textMuted }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: COLORS.bgSecondary,
                color: COLORS.textPrimary,
                borderRadius: 2,
                '& fieldset': { borderColor: COLORS.border },
                '&:hover fieldset': { borderColor: COLORS.accent },
                '&.Mui-focused fieldset': { borderColor: COLORS.accent },
              },
              '& input::placeholder': {
                color: COLORS.textMuted,
                opacity: 1,
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!trimmedQuery}
            startIcon={<SearchIcon />}
            sx={{
              bgcolor: COLORS.accent,
              color: '#000',
              px: 2.5,
              minWidth: { xs: '100%', md: 120 },
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#c9a227' },
              '&.Mui-disabled': {
                bgcolor: COLORS.bgTertiary,
                color: COLORS.textMuted,
              },
            }}
          >
            Search
          </Button>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ backgroundColor: COLORS.bgSecondary, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}>
            {error}
          </Alert>
        )}

        {trimmedQuery && matches.length > 0 && (
          <Stack divider={<Divider sx={{ borderColor: COLORS.border }} />}>
            {matches.map((repair) => {
              const tone = getStatusTone(repair.status);
              return (
                <Box
                  key={repair.repairID}
                  sx={{
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: COLORS.textHeader, fontWeight: 600 }}>
                      {getRepairDisplayName(repair)}
                    </Typography>
                    <Typography sx={{ color: COLORS.textSecondary, fontSize: 14 }}>
                      {repair.repairID} · {repair.repairType || repair.description || 'Repair'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Chip
                      label={repair.status || 'No status'}
                      size="small"
                      sx={{
                        color: tone.color,
                        backgroundColor: tone.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderLeft: tone.borderLeft,
                        borderRadius: 2,
                      }}
                    />
                    <Button
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => openRepair(repair.repairID)}
                      sx={{
                        color: COLORS.accent,
                        minWidth: 0,
                        p: 0,
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { backgroundColor: 'transparent', opacity: 0.9 },
                      }}
                    >
                      Open
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Surface>
  );
}

export default function AdminDashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { repairs, loading } = useRepairs();

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
        monthlyRevenue: 0,
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pendingReceipts = repairs.filter((r) => r.status === 'RECEIVING');
    const pendingWholesale = repairs.filter((r) => r.status === 'PENDING PICKUP' || r.status === 'PICKUP REQUESTED');
    const completed = repairs.filter((r) => ['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP'].includes(r.status));
    const qcRequired = repairs.filter((r) => r.status === 'QC' || r.status === 'QUALITY CONTROL' || r.status === 'quality-control');
    const rushJobs = repairs.filter((r) => r.rushJob === true || r.priority === 'rush');

    const monthlyRevenue = completed
      .filter((r) => {
        const completedDate = new Date(r.completedDate || r.updatedAt);
        return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);

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
      monthlyRevenue,
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
      <Surface>
        <Stack spacing={2.5}>
          <Typography sx={{ fontSize: 28, fontWeight: 600, color: COLORS.textHeader }}>Loading dashboard</Typography>
          <LinearProgress
            sx={{
              height: 6,
              borderRadius: 999,
              backgroundColor: COLORS.bgTertiary,
              '& .MuiLinearProgress-bar': { backgroundColor: COLORS.accent },
            }}
          />
        </Stack>
      </Surface>
    );
  }

  return (
    <Stack spacing={3}>
      {(dashboardMetrics.rushJobs.length > 0 || dashboardMetrics.pendingWholesale.length > 0) && (
        <Stack spacing={2}>
          {dashboardMetrics.rushJobs.length > 0 && (
            <PriorityNotice>
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
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        <Surface sx={{ height: '100%' }}>
          <Stack spacing={3}>
            <Box>
              <Chip
                label="Operations overview"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: COLORS.bgSecondary,
                  color: COLORS.textPrimary,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
              <Typography sx={{ fontSize: { xs: 40, md: 56 }, fontWeight: 600, lineHeight: 1.05, mb: 2, color: COLORS.textHeader }}>
                Welcome back, {session?.user?.firstName || session?.user?.name || 'team'}
              </Typography>
              <Typography sx={{ color: COLORS.textSecondary, fontSize: 18, maxWidth: 780, lineHeight: 1.6 }}>
                Track repair flow, revenue, and operational bottlenecks from one place.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <MetricCard
                label="Active repairs"
                value={dashboardMetrics.totalRepairs}
                subtext="Total repairs currently in the system"
                icon={<BuildIcon fontSize="small" />}
                progress={completionRate}
              />
              <MetricCard
                label="Monthly revenue"
                value={formatCurrency(dashboardMetrics.monthlyRevenue)}
                subtext="Completed repair revenue this month"
                icon={<MonetizationOnIcon fontSize="small" />}
              />
              <MetricCard
                label="Average ticket"
                value={formatCurrency(dashboardMetrics.averageValue)}
                subtext="Average completed repair value"
                icon={<TrendingUpIcon fontSize="small" />}
              />
            </Box>
          </Stack>
        </Surface>

        <QueuePanel items={operationalQueues} onNavigate={(href) => router.push(href)} />
      </Box>

      <RepairLookupPanel repairs={repairs || []} onNavigate={(href) => router.push(href)} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(320px, 0.9fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Surface>
          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography sx={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                  Live feed
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 600, color: COLORS.textHeader }}>Recent repair activity</Typography>
              </Box>
              <Button
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push('/dashboard/repairs')}
                sx={{
                  color: COLORS.accent,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: 'transparent', opacity: 0.9 },
                }}
              >
                View all repairs
              </Button>
            </Box>

            <Stack divider={<Divider sx={{ borderColor: COLORS.border }} />}>
              {recentActivity.map((item) => {
                const tone = getStatusTone(item.status);
                return (
                  <Box
                    key={item.id}
                    sx={{
                      py: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: COLORS.bgSecondary,
                          color: COLORS.accent,
                          border: `1px solid ${COLORS.border}`,
                          fontWeight: 700,
                        }}
                      >
                        {(item.customerName || 'U')[0].toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 600, color: COLORS.textHeader }}>{item.customerName}</Typography>
                        <Typography sx={{ color: COLORS.textSecondary, fontSize: 14 }}>
                          {item.type} · {formatDate(item.updatedAt)}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={item.status}
                      size="small"
                      sx={{
                        color: tone.color,
                        backgroundColor: tone.bg,
                        border: `1px solid ${COLORS.border}`,
                        borderLeft: tone.borderLeft,
                        borderRadius: 2,
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </Surface>

        <Surface>
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, mb: 0.75 }}>
                Quick actions
              </Typography>
              <Typography sx={{ fontSize: 28, fontWeight: 600, color: COLORS.textHeader }}>Jump into work</Typography>
            </Box>
            <Stack divider={<Divider sx={{ borderColor: COLORS.border }} />}>
              {quickActions.map((action) => (
                <Box
                  key={action.title}
                  sx={{
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: COLORS.bgSecondary,
                        color: COLORS.accent,
                        border: `1px solid ${COLORS.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 600, color: COLORS.textHeader }}>{action.title}</Typography>
                      <Typography sx={{ color: COLORS.textSecondary, fontSize: 14 }}>{action.subtitle}</Typography>
                    </Box>
                  </Box>
                  <Button
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push(action.href)}
                    sx={{
                      color: COLORS.accent,
                      minWidth: 0,
                      p: 0,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: 'transparent', opacity: 0.9 },
                    }}
                  >
                    Open
                  </Button>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Surface>
      </Box>
    </Stack>
  );
}
