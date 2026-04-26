"use client";
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Grid,
    Alert,
    Snackbar
} from '@mui/material';
import { VerifiedUser as QcIcon, Add as AddIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import RepairCard from '@/components/business/repairs/RepairCard';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function QualityControlPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { repairs } = useRepairs();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    if (authStatus === 'loading') return null;
    if (!session?.user || session.user.role !== 'admin') {
        router.push('/dashboard');
        return null;
    }

    const qcRepairs = repairs?.filter(repair => repair.status === 'QUALITY CONTROL') || [];

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
                        <QcIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        QC queue
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Quality Control
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 2.5 }}>
                        Review completed repairs, document quality, and approve for customer pickup.
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

            {qcRepairs.length === 0 ? (
                <Box
                    sx={{
                        backgroundColor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 3,
                        boxShadow: REPAIRS_UI.shadow,
                        px: 3,
                        py: 5,
                        textAlign: 'center'
                    }}
                >
                    <QcIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 1 }}>
                        QC queue is clear
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
                        No repairs are currently waiting for quality control.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {qcRepairs.map((repair) => (
                        <Grid item xs={12} sm={6} xl={4} key={repair._id || repair.repairID}>
                            <RepairCard
                                repair={repair}
                                actions={
                                    <Button
                                        variant="outlined"
                                        startIcon={<QcIcon />}
                                        fullWidth
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/dashboard/repairs/quality-control/${repair._id}`);
                                        }}
                                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}
                                    >
                                        Start QC Review
                                    </Button>
                                }
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
