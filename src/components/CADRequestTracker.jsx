'use client';

import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Chip,
    Paper,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    MoreHoriz as PendingIcon,
    EmojiPeople as ClaimedIcon,
    Build as InProgressIcon,
    CheckCircle as ApprovedIcon,
    Done as CompleteIcon
} from '@mui/icons-material';

// CAD Request specific workflow stages
const CAD_WORKFLOW_STAGES = [
    {
        id: 'pending',
        label: 'Pending',
        description: 'Waiting for CAD designer to claim',
        icon: '⏳',
        statuses: ['pending']
    },
    {
        id: 'claimed',
        label: 'Claimed',
        description: 'Designer has claimed this request',
        icon: '✋',
        statuses: ['claimed']
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        description: 'Working on STL design',
        icon: '🔧',
        statuses: ['in_progress']
    },
    {
        id: 'stl_approved',
        label: 'STL Approved',
        description: 'STL approved, ready for GLB',
        icon: '✅',
        statuses: ['stl_approved']
    },
    {
        id: 'design_submitted',
        label: 'GLB Uploaded',
        description: 'GLB design submitted',
        icon: '📤',
        statuses: ['design_submitted']
    },
    {
        id: 'design_approved',
        label: 'Approved',
        description: 'Design fully approved',
        icon: '🎉',
        statuses: ['design_approved']
    },
    {
        id: 'completed',
        label: 'Completed',
        description: 'Ready for product listing',
        icon: '✨',
        statuses: ['completed']
    }
];

const STATUS_COLORS = {
    pending: { bg: '#FFF3E0', text: '#E65100', color: 'warning' },
    claimed: { bg: '#E3F2FD', text: '#1565C0', color: 'info' },
    in_progress: { bg: '#F3E5F5', text: '#6A1B9A', color: 'primary' },
    stl_approved: { bg: '#E8F5E9', text: '#2E7D32', color: 'success' },
    design_submitted: { bg: '#FCE4EC', text: '#C2185B', color: 'secondary' },
    design_approved: { bg: '#E0F2F1', text: '#00695C', color: 'success' },
    completed: { bg: '#F1F8E9', text: '#558B2F', color: 'success' }
};

export default function CADRequestTracker({ status = 'pending', designer = null }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Find current stage index
    const currentStageIndex = CAD_WORKFLOW_STAGES.findIndex(
        stage => stage.statuses.includes(status)
    );

    // Determine stage completion status
    const getStageStatus = (index) => {
        if (index < currentStageIndex) return 'completed';
        if (index === currentStageIndex) return 'current';
        return 'pending';
    };

    const currentStage = CAD_WORKFLOW_STAGES[currentStageIndex];
    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

    return (
        <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
                {/* Current Status Header */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Request Status
                        </Typography>
                        <Chip
                            label={`${currentStage?.icon} ${currentStage?.label}`}
                            sx={{
                                bgcolor: statusColor.bg,
                                color: statusColor.text,
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {currentStage?.description}
                    </Typography>

                    {designer && (
                        <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Assigned Designer
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                {designer.name || 'Unknown'}
                            </Typography>
                            {designer.email && (
                                <Typography variant="caption" color="text.secondary">
                                    {designer.email}
                                </Typography>
                            )}
                        </Paper>
                    )}
                </Box>

                {/* Workflow Stepper */}
                <Stepper
                    activeStep={currentStageIndex}
                    orientation={isMobile ? 'vertical' : 'horizontal'}
                    sx={{
                        '& .MuiStepLabel-label': {
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                        },
                        '& .MuiStepIcon-root': {
                            fontSize: isMobile ? '1.5rem' : '2rem',
                        }
                    }}
                >
                    {CAD_WORKFLOW_STAGES.map((stage, index) => {
                        const stageStatus = getStageStatus(index);
                        const isCompleted = stageStatus === 'completed';
                        const isCurrent = stageStatus === 'current';

                        return (
                            <Step
                                key={stage.id}
                                completed={isCompleted}
                                sx={{
                                    '& .MuiStepLabel-root': {
                                        cursor: 'pointer',
                                    }
                                }}
                            >
                                <StepLabel
                                    sx={{
                                        '& .MuiStepIcon-root': {
                                            color: isCompleted
                                                ? theme.palette.success.main
                                                : isCurrent
                                                ? theme.palette.primary.main
                                                : theme.palette.text.disabled
                                        },
                                        '& .MuiStepLabel-label': {
                                            fontWeight: isCurrent ? 600 : 400,
                                            color: isCurrent
                                                ? theme.palette.primary.main
                                                : theme.palette.text.primary
                                        }
                                    }}
                                >
                                    {stage.label}
                                </StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>

                {/* Stage Details */}
                {currentStageIndex !== -1 && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontSize: '2rem' }}>
                                {currentStage?.icon}
                            </Typography>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {currentStage?.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {currentStage?.description}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Progress indication */}
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Progress: {currentStageIndex + 1} of {CAD_WORKFLOW_STAGES.length}
                            </Typography>
                            <Box
                                sx={{
                                    height: 4,
                                    flex: 1,
                                    bgcolor: 'divider',
                                    borderRadius: 2,
                                    overflow: 'hidden'
                                }}
                            >
                                <Box
                                    sx={{
                                        height: '100%',
                                        width: `${((currentStageIndex + 1) / CAD_WORKFLOW_STAGES.length) * 100}%`,
                                        bgcolor: 'primary.main',
                                        transition: 'width 0.3s ease'
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Completed message */}
                {status === 'completed' && (
                    <Paper
                        sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: 'success.light',
                            border: `2px solid ${theme.palette.success.main}`,
                            borderRadius: 1
                        }}
                    >
                        <Typography variant="subtitle2" sx={{ color: 'success.dark', fontWeight: 600 }}>
                            ✨ Design Complete!
                        </Typography>
                        <Typography variant="body2" color="success.dark" sx={{ mt: 0.5 }}>
                            This design is ready to be used as a product option on the shop.
                        </Typography>
                    </Paper>
                )}
            </CardContent>
        </Card>
    );
}
