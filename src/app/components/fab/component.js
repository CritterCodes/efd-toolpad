"use client";
import React from 'react';
import { SpeedDial, SpeedDialIcon, SpeedDialAction, Box } from '@mui/material';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import MoveUpIcon from '@mui/icons-material/MoveUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/navigation';

/**
 * Floating Action Button (FAB) with New Repair, Move Repair, and QC
 */
const FloatingActionButton = () => {
    const router = useRouter();

    // ✅ List of Actions
    const actions = [
        {
            icon: <NoteAddIcon />,
            name: 'New Repair',
            onClick: () => router.push('/dashboard/repairs/all?newRepair=true')  // ✅ Open stepper automatically
        },
        {
            icon: <MoveUpIcon />,
            name: 'Move Repair',
            onClick: () => router.push('/dashboard/repairs/move')
        },
        {
            icon: <CheckCircleIcon />,
            name: 'Quality Control',
            onClick: () => router.push('/dashboard/repairs/quality-control')
        }
    ];

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 1200,
            }}
        >
            <SpeedDial
                ariaLabel="Dashboard Actions"
                icon={<SpeedDialIcon />}
                sx={{
                    '& .MuiFab-primary': {
                        backgroundColor: 'primary.main',
                        '&:hover': { backgroundColor: 'primary.dark' }
                    }
                }}
            >
                {/* ✅ Loop through actions and render each option */}
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
