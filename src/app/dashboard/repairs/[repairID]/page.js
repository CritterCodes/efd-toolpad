"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';
import { Box, Snackbar, Typography, Button, Breadcrumbs, Link } from '@mui/material';
import RepairHeader from '@/app/components/repairHeader.component';
import RepairDetailsForm from '@/app/components/repairDetailsForm.component';
import RepairImage from '@/app/components/repairImage.component';
import RepairTasksTable from '@/app/components/repairTasksTable.component';
import RepairsService from '@/services/repairs';
import UsersService from '@/services/users';

const ViewRepairPage = ({ params }) => {
    const { repairs, setRepairs } = useRepairs();
    const router = useRouter();

    const [repairID, setRepairID] = React.useState(null);
    const [repair, setRepair] = React.useState(null);
    const [updatedRepair, setUpdatedRepair] = React.useState({});
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState('info');
    const [hasChanges, setHasChanges] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [isWholesale, setIsWholesale] = React.useState(false);

    // ✅ Unwrapping the params with useEffect
    React.useEffect(() => {
        const fetchParams = async () => {
            const resolvedParams = await params;
            setRepairID(resolvedParams?.repairID);
        };
        fetchParams();
    }, [params]);

    React.useEffect(() => {
        if (repairID) {
            const foundRepair = repairs.find(r => r.repairID === repairID);
            console.log('foundRepair', foundRepair);
            if (foundRepair) {
                setRepair(foundRepair);
                setUpdatedRepair(foundRepair);


                const getUser = async () => {
                    console.log('foundRepair.userID', foundRepair.userID);
                    const user = await UsersService.getUserByQuery(foundRepair.userID);
                    console.log('user', user);
                    if (user.role === 'wholesaler') {
                        console.log('isWholesale', true);
                        setIsWholesale(true);
                    }
                };
                getUser();
                setLoading(false);
            }

        }
    }, [repairID, repairs]);

    if (loading) {
        return <Typography>Loading repair data...</Typography>;
    }

    const handleEditChange = (field, value) => {
        if (field === 'repairTasks') {
            // Update repairTasks and recalculate cost
            const updatedRepairTasks = value.map(task => ({
                ...task,
                quantity: task.quantity || 1, // Default quantity to 1 if not present
            }));

            const updatedCost = updatedRepairTasks.reduce(
                (acc, task) => acc + (parseFloat(task.price || 0) * (task.quantity || 1)),
                0
            );

            setUpdatedRepair(prev => ({
                ...prev,
                [field]: updatedRepairTasks,
                totalCost: updatedCost.toFixed(2), // Save the total cost in updatedRepair
            }));
        } else {
            setUpdatedRepair(prev => ({ ...prev, [field]: value }));
        }

        setHasChanges(true);
        setSnackbarMessage("⚠️ Unsaved changes detected! Please save.");
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
    };

    const handleDeleteRepair = async () => {
        try {
            if (!repairID) {
                setSnackbarMessage("❌ Repair ID is missing.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }

            setLoading(true);
            await RepairsService.deleteRepair(repairID);
            setRepairs(prev => prev.filter(r => r.repairID !== repairID));
            setSnackbarMessage("✅ Repair deleted successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            router.push('/dashboard/repairs');
        } catch (error) {
            setSnackbarMessage(`❌ Error deleting repair: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };


    const handleSaveChanges = async () => {
        try {
            if (!repairID) {
                setSnackbarMessage("❌ Repair ID is missing.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }

            if (!updatedRepair.clientName || !updatedRepair.status) {
                setSnackbarMessage("❌ Please fill in all required fields.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }

            setLoading(true);
            
            const formattedRepair = {
                ...updatedRepair,
                repairTasks: updatedRepair.repairTasks.map(task => ({
                    ...task,
                    quantity: task.quantity || 1, // Ensure quantity is set
                    sku: task.sku || "", // Ensure SKU is set
                    title: task.title || "Custom Task", // Ensure title is set
                })),
                metalType: typeof updatedRepair.metalType === 'object'
                    ? `${updatedRepair.metalType.type}${updatedRepair.metalType.karat ? ` - ${updatedRepair.metalType.karat}` : ''}`
                    : updatedRepair.metalType,
            };

            await RepairsService.updateRepair(repairID, formattedRepair);

            setRepairs(prev => prev.map(r => (r.repairID === repairID ? formattedRepair : r)));
            setSnackbarMessage("✅ Repair saved successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setHasChanges(false);
        } catch (error) {
            setSnackbarMessage(`❌ Error saving repair: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };


    return (
        <Box sx={{ padding: { xs: '10px', sm: '20px' } }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>
                    Dashboard
                </Link>
                <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/repairs/all')} sx={{ cursor: 'pointer' }}>
                    Repairs
                </Link>
                <Typography color="text.primary">Repair Details</Typography>
            </Breadcrumbs>

            <RepairHeader
                onSave={handleSaveChanges}
                onDelete={() => router.push('/dashboard/repairs')}
                hasChanges={hasChanges}
                repair={updatedRepair}
            />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                <RepairImage picture={updatedRepair.picture} />
                <RepairDetailsForm repair={updatedRepair} onEdit={handleEditChange} />
            </Box>
            
            <Box sx={{ mt: 3, width: '100%' }}>
                <RepairTasksTable repairTasks={updatedRepair.repairTasks} onEdit={handleEditChange} isWholesale={isWholesale} selectedMetal={updatedRepair.metalType} />
            </Box>

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
                    hasChanges && snackbarSeverity === 'warning' ? (
                        <Button color="inherit" size="small" onClick={handleSaveChanges}>
                            Save Now
                        </Button>
                    ) : (
                        <Button color="inherit" size="small" onClick={() => setSnackbarOpen(false)}>
                            Close
                        </Button>
                    )
                }
            />
        </Box>
    );
};

export default ViewRepairPage;
