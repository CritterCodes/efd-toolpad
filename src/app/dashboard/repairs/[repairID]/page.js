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
    Breadcrumbs, 
    Link,
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
        if (repairID && session?.user) {
            const foundRepair = repairs.find(r => r.repairID === repairID);
            console.log('foundRepair', foundRepair);
            
            if (foundRepair) {
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
                    console.log('foundRepair.userID', foundRepair.userID);
                    try {
                        const user = await UsersService.getUserByQuery(foundRepair.userID);
                        console.log('user', user);
                        setClientInfo(user);
                        if (user.role === 'wholesaler') {
                            console.log('isWholesale', true);
                            setIsWholesale(true);
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    }
                };
                getUser();
                setLoading(false);
            } else {
                // Repair not found in context, could be access denied
                setAccessDenied(true);
                setLoading(false);
            }
        }
    }, [repairID, repairs, session?.user]);

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
        <Box sx={{ padding: { xs: '10px', sm: '20px' } }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>
                    Dashboard
                </Link>
                <Link underline="hover" color="inherit" onClick={() => router.push(
                    session?.user?.role === 'wholesaler' ? '/dashboard/repairs/my-repairs' : '/dashboard/repairs/all'
                )} sx={{ cursor: 'pointer' }}>
                    {session?.user?.role === 'wholesaler' ? 'My Repairs' : 'Repairs'}
                </Link>
                <Typography color="text.primary">View Repair</Typography>
            </Breadcrumbs>

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
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                ContentProps={{
                    sx: {
                        backgroundColor:
                            snackbarSeverity === 'success'
                                ? 'green'
                                : snackbarSeverity === 'error'
                                    ? 'red'
                                    : 'orange',
                        color: 'white',
                        fontWeight: 'bold'
                    }
                }}
                action={
                    <Button color="inherit" size="small" onClick={() => setSnackbarOpen(false)}>
                        Close
                    </Button>
                }
            />
        </Box>
    );
};

export default ViewRepairPage;
