"use client";
import React from 'react';
import { SpeedDial, SpeedDialIcon, SpeedDialAction, Box } from '@mui/material';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Role-dependent Floating Action Button (FAB)
 * - Admin: New Repair
 * - Wholesaler: New Repair
 * - Artisan: Gallery, Profile  
 * - Customer: No FAB (returns null)
 */
const FloatingActionButton = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const openSalesCheckout = () => {
        router.push('/dashboard/commerce/sales-invoices?create=1');
    };
    
    // Get user role
    const userRole = session?.user?.role;
    
    // Define actions based on role
    const getActionsForRole = (role) => {
        switch (role) {
            case 'admin':
                return [
                    {
                        icon: <PointOfSaleIcon />,
                        name: 'Sales Checkout',
                        onClick: openSalesCheckout
                    },
                    {
                        icon: <NoteAddIcon />,
                        name: 'New Repair',
                        onClick: () => router.push('/dashboard/repairs/new')
                    },
                    {
                        icon: <ReceiptLongIcon />,
                        name: 'Scan Invoice',
                        onClick: () => router.push('/dashboard/repairs/pick-up?scanInvoice=1')
                    },
                    {
                        icon: <HomeRepairServiceIcon />,
                        name: 'Scan Repair',
                        onClick: () => router.push('/dashboard?scanRepair=1')
                    }
                ];
                
            case 'wholesaler':
                return [
                    {
                        icon: <NoteAddIcon />,
                        name: 'New Repair',
                        onClick: () => router.push('/dashboard/repairs/new')
                    }
                ];
                
            case 'artisan':
                return [
                    ...(session?.user?.employment?.isOnsite === true && (
                        session?.user?.staffCapabilities?.repairOps === true ||
                        session?.user?.staffCapabilities?.closeoutBilling === true
                    ) ? [{
                        icon: <PointOfSaleIcon />,
                        name: 'Sales Checkout',
                        onClick: openSalesCheckout
                    }] : []),
                    ...(session?.user?.employment?.isOnsite === true && session?.user?.staffCapabilities?.repairOps === true ? [{
                        icon: <NoteAddIcon />,
                        name: 'New Repair',
                        onClick: () => router.push('/dashboard/repairs/new')
                    }] : []),
                    {
                        icon: <PhotoLibraryIcon />,
                        name: 'Gallery',
                        onClick: () => router.push('/dashboard/gallery')
                    },
                    {
                        icon: <PersonIcon />,
                        name: 'Profile',
                        onClick: () => router.push('/dashboard/profile')
                    }
                ];
                
            default:
                // For customer or unknown roles, return empty array
                return [];
        }
    };
    
    const actions = getActionsForRole(userRole);

    if (pathname?.startsWith('/dashboard/finance')) {
        return null;
    }
    
    // Don't render FAB if no actions available
    if (actions.length === 0) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 1200,
                // The SpeedDial root reserves a tall column for its (collapsed) actions.
                // Without this, that invisible fixed column captures clicks on content
                // buttons beneath it (right-side "dead space"). Pass clicks through the
                // empty area; re-enable pointer events only on the actual FAB + actions.
                pointerEvents: 'none',
            }}
        >
            <SpeedDial
                ariaLabel={`${userRole} Actions`}
                icon={<SpeedDialIcon />}
                sx={{
                    '& .MuiSpeedDial-fab': { pointerEvents: 'auto' },
                    '& .MuiSpeedDialAction-fab': { pointerEvents: 'auto' },
                    '& .MuiFab-primary': {
                        backgroundColor: 'primary.main',
                        '&:hover': { backgroundColor: 'primary.dark' }
                    }
                }}
            >
                {/* Render role-specific actions */}
                {actions.map((action, index) => (
                    <SpeedDialAction
                        key={index}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={action.onClick}
                    />
                ))}
            </SpeedDial>
        </Box>
    );
};

export default FloatingActionButton;
