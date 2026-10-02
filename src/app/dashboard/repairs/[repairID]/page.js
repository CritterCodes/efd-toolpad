"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import { Box, Snackbar, Typography, Button, Alert } from '@mui/material';
import { FaceliftRoot } from '@/components/facelift';
import RepairsService from '@/services/repairs';
import UsersService from '@/services/users';
import { isWholesalerViewer } from '@/lib/repairAccess';
import {
    QuoteRequestAlerts,
    RepairHeaderCard,
    RepairDetailBody,
    buildWorkItems,
    calculateDisplayedRepairTotal,
} from './repairDetailView';

const ViewRepairPage = ({ params }) => {
    const { repairs, setRepairs, removeRepair } = useRepairs();
    const { data: session } = useSession();
    const router = useRouter();

    const [repairID, setRepairID] = React.useState(null);
    const [repair, setRepair] = React.useState(null);
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState('info');
    const [loading, setLoading] = React.useState(true);
    const [, setIsWholesale] = React.useState(false);
    const [clientInfo, setClientInfo] = React.useState(null);
    const [accessDenied, setAccessDenied] = React.useState(false);

    // ✅ Unwrapping the params with useEffect
    React.useEffect(() => {
        const fetchParams = async () => {
            const resolvedParams = await params;
            setRepairID(resolvedParams?.repairID);
        };
        fetchParams();
    }, [params]);

    React.useEffect(() => {
        let cancelled = false;

        if (repairID && session?.user) {
            const foundRepair = repairs.find(r => r.repairID === repairID);

            if (foundRepair) {
                // Reset any access denied state from a prior failed API fetch
                setAccessDenied(false);

                // Check access permissions
                const userEmail = session.user.email;

                // Admins can see all repairs
                // Wholesalers can only see repairs they created
                if (isWholesalerViewer(session)) {
                    const isOwner = (
                        foundRepair.createdBy === userEmail ||
                        foundRepair.submittedBy === userEmail ||
                        foundRepair.userID === userEmail
                    );

                    if (!isOwner) {
                        setAccessDenied(true);
                        setLoading(false);
                        return;
                    }
                }

                setRepair(foundRepair);

                const getUser = async () => {
                    // Retail leads have userID 'retail-lead' — no real user account to look up
                    if (foundRepair.userID === 'retail-lead' || foundRepair.leadSource === 'retail-chat') {
                        setClientInfo({
                            name: foundRepair.clientName,
                            email: foundRepair.leadContact || foundRepair.notes?.replace('Contact: ', '') || '',
                            role: 'retail-lead',
                        });
                        return;
                    }
                    try {
                        const user = await UsersService.getUserByQuery(foundRepair.userID);
                        setClientInfo(user);
                        if (user.role === 'wholesaler') {
                            setIsWholesale(true);
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    }
                };
                getUser();
                setLoading(false);
            } else {
                // Repair not found in context yet — fetch directly from API
                const fetchRepairFromAPI = async () => {
                    try {
                        const response = await fetch(`/api/repairs?repairID=${repairID}`);
                        if (cancelled) return; // context loaded and found it — ignore this response
                        if (response.ok) {
                            const data = await response.json();
                            if (data) {
                                setRepair(data);
                                try {
                                    const user = await UsersService.getUserByQuery(data.userID);
                                    setClientInfo(user);
                                    if (user.role === 'wholesaler') {
                                        setIsWholesale(true);
                                    }
                                } catch (err) {
                                    console.error('Error fetching user:', err);
                                }
                            } else {
                                if (!cancelled) setAccessDenied(true);
                            }
                        } else if (response.status === 403 || response.status === 401) {
                            if (!cancelled) setAccessDenied(true);
                        } else {
                            console.error('Failed to fetch repair:', response.status);
                            if (!cancelled) setAccessDenied(true);
                        }
                    } catch (error) {
                        console.error('Error fetching repair from API:', error);
                        if (!cancelled) setAccessDenied(true);
                    } finally {
                        if (!cancelled) setLoading(false);
                    }
                };
                fetchRepairFromAPI();
            }
        }

        return () => { cancelled = true; };
    // Depend on the primitives the effect reads, not session.user object identity —
    // useSession returns a new object per poll and identity deps loop the fetch.
    }, [repairID, repairs, session?.user?.role, session?.user?.email, session?.user?.userID]);

    React.useEffect(() => {
        let cancelled = false;

        const fetchFreshRepair = async () => {
            if (!repairID || !session?.user) return;

            try {
                const response = await fetch(`/api/repairs?repairID=${encodeURIComponent(repairID)}`);
                if (cancelled) return;

                if (response.ok) {
                    const data = await response.json();
                    if (!data) return;

                    setAccessDenied(false);
                    setRepair(data);
                    setRepairs((prevRepairs) => {
                        const exists = prevRepairs.some((item) => item.repairID === data.repairID);
                        if (!exists) return [data, ...prevRepairs];
                        return prevRepairs.map((item) => item.repairID === data.repairID ? data : item);
                    });

                    if (data.userID === 'retail-lead' || data.leadSource === 'retail-chat') {
                        setClientInfo({
                            name: data.clientName,
                            email: data.leadContact || data.notes?.replace('Contact: ', '') || '',
                            role: 'retail-lead',
                        });
                        setIsWholesale(false);
                    } else {
                        try {
                            const user = await UsersService.getUserByQuery(data.userID);
                            if (!cancelled) {
                                setClientInfo(user);
                                setIsWholesale(user.role === 'wholesaler');
                            }
                        } catch (error) {
                            console.error('Error fetching user:', error);
                        }
                    }
                } else if (response.status === 403 || response.status === 401) {
                    setAccessDenied(true);
                } else {
                    console.error('Failed to refresh repair:', response.status);
                }
            } catch (error) {
                console.error('Error refreshing repair from API:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchFreshRepair();

        return () => { cancelled = true; };
    }, [repairID, session?.user?.userID, session?.user?.email, setRepairs]);

    if (loading) {
        return <Typography>Loading repair data...</Typography>;
    }

    if (accessDenied) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    Access Denied: You can only view repairs that you created.
                </Alert>
                <Button 
                    variant="contained" 
                    onClick={() => router.push('/dashboard/repairs/my-repairs')}
                >
                    Back to My Repairs
                </Button>
            </Box>
        );
    }

    if (!repair) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Repair not found.
                </Alert>
                <Button 
                    variant="contained" 
                    onClick={() => router.push('/dashboard/repairs/my-repairs')}
                >
                    Back to My Repairs
                </Button>
            </Box>
        );
    }

    const handleDeleteRepair = async () => {
        if (window.confirm('Are you sure you want to delete this repair? This action cannot be undone.')) {
            try {
                setLoading(true);
                await RepairsService.deleteRepair(repairID);
                // ✅ Use the proper context method to remove the repair
                removeRepair(repairID);
                setSnackbarMessage("✅ Repair deleted successfully!");
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                setTimeout(() => router.push('/dashboard/repairs/all'), 1500);
            } catch (error) {
                setSnackbarMessage(`❌ Error deleting repair: ${error.message}`);
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePrint = () => {
        router.push(`/dashboard/repairs/${repairID}/print`);
    };

    const handleEdit = () => {
        // Navigate to edit page (we'll create this later)
        router.push(`/dashboard/repairs/${repairID}/edit`);
    };


    // Calculate all work items for display
    const allWorkItems = buildWorkItems(repair);

    const totalCost = calculateDisplayedRepairTotal(repair);

    return (
        <FaceliftRoot>
            <Box sx={{ pb: 10, display: 'flex', flexDirection: 'column', gap: 2.25 }}>

                <QuoteRequestAlerts repair={repair} session={session} />

                <RepairHeaderCard
                    repair={repair}
                    session={session}
                    clientInfo={clientInfo}
                    onPrint={handlePrint}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRepair}
                />

                <RepairDetailBody
                    repair={repair}
                    clientInfo={clientInfo}
                    allWorkItems={allWorkItems}
                    totalCost={totalCost}
                />

                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={6000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Box>
        </FaceliftRoot>
    );
};

export default ViewRepairPage;
