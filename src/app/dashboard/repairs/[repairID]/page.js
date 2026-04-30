"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRepairs } from '@/app/context/repairs.context';
import { 
    Box, 
    Snackbar,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Alert
} from '@mui/material';
import { 
    Print as PrintIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import RepairsService from '@/services/repairs';
import UsersService from '@/services/users';

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
    const [isWholesale, setIsWholesale] = React.useState(false);
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
            console.log('foundRepair', foundRepair);

            if (foundRepair) {
                // Reset any access denied state from a prior failed API fetch
                setAccessDenied(false);

                // Check access permissions
                const userRole = session.user.role;
                const userEmail = session.user.email;

                // Admins can see all repairs
                // Wholesalers can only see repairs they created
                if (userRole === 'wholesaler') {
                    const isOwner = (
                        foundRepair.createdBy === userEmail ||
                        foundRepair.submittedBy === userEmail ||
                        foundRepair.userID === userEmail
                    );

                    if (!isOwner) {
                        console.log('Access denied: Wholesaler trying to view repair not created by them');
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
                        console.log('Repair not in context, fetching from API:', repairID);
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
    }, [repairID, repairs, session?.user]);

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
    }, [repairID, session?.user, setRepairs]);

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
    const allWorkItems = [
        ...(repair.tasks || []).map(item => ({ ...item, type: 'Task', category: 'Service' })),
        ...(repair.processes || []).map(item => ({ ...item, type: 'Process', category: 'Service' })),
        ...(repair.materials || []).map(item => ({ ...item, type: 'Material', category: 'Material' })),
        ...(repair.customLineItems || []).map(item => ({ ...item, type: 'Custom', category: 'Custom' })),
        ...(repair.repairTasks || []).map(item => ({ ...item, type: 'Legacy Task', category: 'Legacy' }))
    ];

    const totalCost = allWorkItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0) + 
                     (repair.rushJobFee ? parseFloat(repair.rushJobFee) : 0);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'success';
            case 'in progress': return 'info';
            case 'pending': return 'warning';
            case 'cancelled': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ pb: 10 }}>

            {/* Header Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            Repair {repair.repairID}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="contained"
                                startIcon={<PrintIcon />}
                                onClick={handlePrint}
                                color="primary"
                            >
                                Print
                            </Button>
                            {/* Hide Edit and Delete buttons for wholesalers */}
                            {session?.user?.role !== 'wholesaler' && (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={handleEdit}
                                        color="info"
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DeleteIcon />}
                                        onClick={handleDeleteRepair}
                                        color="error"
                                    >
                                        Delete
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Client Information */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon /> Client Information
                            </Typography>
                            <Typography><strong>Name:</strong> {repair.clientName}</Typography>
                            {clientInfo && (
                                <>
                                    <Typography><strong>Email:</strong> {clientInfo.email}</Typography>
                                    <Typography><strong>Phone:</strong> {clientInfo.phone || 'N/A'}</Typography>
                                    <Typography><strong>Role:</strong> {clientInfo.role}</Typography>
                                </>
                            )}
                        </Grid>

                        {/* Repair Status & Dates */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ScheduleIcon /> Status & Timeline
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <Chip 
                                    label={repair.status || 'Pending'} 
                                    color={getStatusColor(repair.status)}
                                    variant="filled"
                                />
                                {repair.isRush && (
                                    <Chip 
                                        label="🚨 RUSH JOB" 
                                        color="error"
                                        variant="filled"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Box>
                            <Typography><strong>Created:</strong> {new Date(repair.createdAt || Date.now()).toLocaleDateString()}</Typography>
                            <Typography><strong>Promise Date:</strong> {repair.promiseDate || 'N/A'}</Typography>
                            <Typography><strong>Due Date:</strong> {repair.dueDate || 'N/A'}</Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {/* Item Details */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CategoryIcon /> Item Details
                            </Typography>
                            
                            {repair.picture && (
                                <Box sx={{ mb: 2, textAlign: 'center', position: 'relative', width: '100%', height: '300px' }}>
                                    <Image
                                        src={repair.picture}
                                        alt="Repair Item"
                                        fill
                                        style={{
                                            objectFit: 'contain',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </Box>
                            )}

                            <Typography sx={{ mb: 1 }}><strong>Description:</strong> {repair.description}</Typography>
                            <Typography sx={{ mb: 1 }}><strong>Metal Type:</strong> {repair.metalType || 'N/A'}</Typography>
                            {repair.karat && (
                                <Typography sx={{ mb: 1 }}><strong>Karat:</strong> {repair.karat}</Typography>
                            )}
                            
                            {repair.isRing && (
                                <>
                                    <Typography sx={{ mb: 1 }}><strong>Current Ring Size:</strong> {repair.currentRingSize}</Typography>
                                    <Typography sx={{ mb: 1 }}><strong>Desired Ring Size:</strong> {repair.desiredRingSize}</Typography>
                                </>
                            )}
                            
                            {repair.notes && (
                                <Typography sx={{ mb: 1 }}><strong>Notes:</strong> {repair.notes}</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Work Items & Pricing */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Work Items & Pricing</Typography>
                            
                            <List dense>
                                {allWorkItems.map((item, index) => (
                                    <ListItem 
                                        key={`${item.type}-${index}`}
                                        sx={{ 
                                            bgcolor: item.isStullerItem ? '#e3f2fd' : 'transparent',
                                            mb: 1,
                                            borderRadius: 1
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {item.quantity}x {item.title || item.displayName || item.name || item.description}
                                                    </Typography>
                                                    <Chip 
                                                        label={item.type} 
                                                        size="small" 
                                                        variant="outlined"
                                                        color={item.category === 'Material' ? 'info' : 'default'}
                                                    />
                                                    {item.isStullerItem && (
                                                        <Chip 
                                                            label="Stuller" 
                                                            size="small" 
                                                            color="primary"
                                                            variant="filled"
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={item.skillLevel && `Skill Level: ${item.skillLevel}`}
                                        />
                                        <ListItemSecondaryAction>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                ${item.price}
                                            </Typography>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}

                                {repair.rushJobFee && parseFloat(repair.rushJobFee) > 0 && (
                                    <ListItem sx={{ bgcolor: '#ffebee', mb: 1, borderRadius: 1 }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                                                    Rush Job Fee
                                                </Typography>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                                ${parseFloat(repair.rushJobFee).toFixed(2)}
                                            </Typography>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                )}
                            </List>

                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6">Total:</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    ${repair.totalPrice || repair.totalCost || totalCost.toFixed(2)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

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
    );
};

export default ViewRepairPage;
