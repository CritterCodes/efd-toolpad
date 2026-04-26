'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Grid,
  Alert,
  Tabs,
  Tab,
  Badge,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLORS = {
    'RECEIVING': REPAIRS_UI.accent,
    'IN PROGRESS': '#F59E0B',
    'READY FOR PICK-UP': '#10B981',
    'COMPLETED': '#10B981',
    'QUALITY CONTROL': '#8B5CF6'
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function RepairCard({ repair, onView }) {
    const statusColor = STATUS_COLORS[repair.status] || REPAIRS_UI.textMuted;

    return (
        <Box
            sx={{
                backgroundColor: REPAIRS_UI.bgPanel,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 3,
                boxShadow: REPAIRS_UI.shadow,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                height: '100%'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem', color: REPAIRS_UI.textMuted }}>
                    #{repair.repairNumber || repair.repairID}
                </Typography>
                <Chip
                    label={repair.status}
                    size="small"
                    sx={{
                        backgroundColor: REPAIRS_UI.bgCard,
                        color: statusColor,
                        border: `1px solid ${statusColor}`,
                        fontSize: '0.68rem',
                        fontWeight: 700
                    }}
                />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <PersonIcon sx={{ fontSize: 13, color: REPAIRS_UI.textMuted }} />
                <Typography sx={{ fontSize: '0.85rem', color: REPAIRS_UI.textSecondary }}>
                    {repair.clientFirstName} {repair.clientLastName}
                </Typography>
            </Box>

            <Typography
                sx={{
                    fontSize: '0.85rem',
                    color: REPAIRS_UI.textPrimary,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1
                }}
            >
                {repair.repairDescription || 'No description'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CalendarIcon sx={{ fontSize: 13, color: REPAIRS_UI.textMuted }} />
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                    {formatDate(repair.createdAt)}
                </Typography>
                {repair.dueDate && (
                    <>
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>·</Typography>
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                            Due {formatDate(repair.dueDate)}
                        </Typography>
                    </>
                )}
            </Box>

            <Button
                size="small"
                variant="outlined"
                fullWidth
                onClick={() => onView(repair._id)}
                sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard, mt: 0.5 }}
            >
                View Details
            </Button>
        </Box>
    );
}

export default function MyRepairsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (session?.user) fetchMyRepairs();
  }, [session?.user]);

  const fetchMyRepairs = async (status = null) => {
    try {
      setLoading(true);
      const url = status ? `/api/repairs/my-repairs?status=${status}` : '/api/repairs/my-repairs';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRepairs(data.repairs || []);
      } else {
        setError('Failed to fetch repairs');
      }
    } catch {
      setError('An error occurred while fetching repairs');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const statusFilters = [null, 'current', 'completed'];
    fetchMyRepairs(statusFilters[newValue]);
  };

  const getFilteredRepairs = () => {
    if (activeTab === 1) return repairs.filter(r => !['COMPLETED', 'READY FOR PICK-UP', 'CANCELLED'].includes(r.status));
    if (activeTab === 2) return repairs.filter(r => ['COMPLETED', 'READY FOR PICK-UP'].includes(r.status));
    return repairs;
  };

  const currentCount = repairs.filter(r => !['COMPLETED', 'READY FOR PICK-UP', 'CANCELLED'].includes(r.status)).length;
  const completedCount = repairs.filter(r => ['COMPLETED', 'READY FOR PICK-UP'].includes(r.status)).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
      </Box>
    );
  }

  const filtered = getFilteredRepairs();

  return (
    <Box sx={{ pb: 10, position: 'relative' }}>
        <Box
            sx={{
                backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                borderRadius: { xs: 0, sm: 3 },
                boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                p: { xs: 0.5, sm: 2.5, md: 3 },
                mb: 3
            }}
        >
            <Box sx={{ maxWidth: 920 }}>
                <Typography
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.25,
                        py: 0.5,
                        mb: 1.5,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: REPAIRS_UI.textPrimary,
                        backgroundColor: REPAIRS_UI.bgCard,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 2,
                        textTransform: 'uppercase'
                    }}
                >
                    <PersonIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                    My work
                </Typography>

                <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                    My Repairs
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 2.5 }}>
                    Track the repairs assigned to your account.
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/dashboard/repairs/new')}
                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                >
                    New Repair
                </Button>
            </Box>
        </Box>

        {error && (
            <Alert severity="error" sx={{ mb: 3, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
                {error}
            </Alert>
        )}

        <Box
            sx={{
                backgroundColor: REPAIRS_UI.bgPanel,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 3,
                mb: 3,
                '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent },
                '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none', fontWeight: 600 },
                '& .MuiTab-root.Mui-selected': { color: REPAIRS_UI.textPrimary },
            }}
        >
            <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>All<Badge badgeContent={repairs.length} sx={{ '& .MuiBadge-badge': { backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` } }} showZero><Box sx={{ width: 8 }} /></Badge></Box>} />
                <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Current<Badge badgeContent={currentCount} sx={{ '& .MuiBadge-badge': { backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}` } }} showZero><Box sx={{ width: 8 }} /></Badge></Box>} />
                <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Completed<Badge badgeContent={completedCount} sx={{ '& .MuiBadge-badge': { backgroundColor: REPAIRS_UI.bgCard, color: '#10B981', border: `1px solid ${REPAIRS_UI.border}` } }} showZero><Box sx={{ width: 8 }} /></Badge></Box>} />
            </Tabs>
        </Box>

        {filtered.length === 0 ? (
            <Box
                sx={{
                    backgroundColor: REPAIRS_UI.bgPanel,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    borderRadius: 3,
                    px: 3,
                    py: 5,
                    textAlign: 'center'
                }}
            >
                <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 1 }}>
                    {activeTab === 0 && 'No repairs found'}
                    {activeTab === 1 && 'No current repairs'}
                    {activeTab === 2 && 'No completed repairs yet'}
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 3 }}>
                    {activeTab === 0 && "You haven't submitted any repairs yet."}
                    {activeTab === 1 && 'All your repairs are either completed or picked up.'}
                    {activeTab === 2 && 'Complete some repairs to see them here.'}
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/dashboard/repairs/new')}
                    sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                >
                    Create New Repair
                </Button>
            </Box>
        ) : (
            <Grid container spacing={2}>
                {filtered.map((repair) => (
                    <Grid item xs={12} sm={6} md={4} key={repair._id}>
                        <RepairCard repair={repair} onView={(id) => router.push(`/dashboard/repairs/${id}`)} />
                    </Grid>
                ))}
            </Grid>
        )}
    </Box>
  );
}
