import React, { useState } from 'react';
import Image from 'next/image';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Checkbox,
    Avatar,
    Divider,
    LinearProgress
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { WORK_TYPES, COMPLEXITY_LEVELS } from '../constants';

const WorkCard = ({
    repair,
    bulkSelectMode = false,
    isSelected = false,
    onToggleSelect,
    onAssignJeweler,
    onStartWork,
    onViewDetails
}) => {
    const [menuAnchor, setMenuAnchor] = useState(null);

    const handleMenuOpen = (event) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleCardClick = () => {
        if (bulkSelectMode) {
            onToggleSelect(repair.repairID);
        }
    };

    const getDueDateStatus = () => {
        if (!repair.promiseDate) return { status: 'none', color: 'default', label: 'No due date' };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(repair.promiseDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) {
            return { status: 'overdue', color: 'error', label: `${Math.abs(daysDiff)} days overdue` };
        } else if (daysDiff === 0) {
            return { status: 'today', color: 'warning', label: 'Due today' };
        } else if (daysDiff <= 3) {
            return { status: 'soon', color: 'info', label: `Due in ${daysDiff} day${daysDiff > 1 ? 's' : ''}` };
        } else {
            return { status: 'future', color: 'default', label: `Due ${dueDate.toLocaleDateString()}` };
        }
    };

    const getWorkTypeInfo = () => {
        // Try to determine work type from description
        const description = repair.description?.toLowerCase() || '';
        const workType = WORK_TYPES.find(type => 
            description.includes(type.value.replace('-', ' ')) || 
            description.includes(type.label.toLowerCase())
        );
        return workType || { value: 'repair', label: 'Repair', color: 'secondary' };
    };

    const getComplexityLevel = () => {
        // This could be enhanced with AI or manual classification
        const description = repair.description || '';
        if (description.toLowerCase().includes('simple') || description.toLowerCase().includes('clean')) {
            return COMPLEXITY_LEVELS[0]; // Simple
        } else if (description.toLowerCase().includes('complex') || description.toLowerCase().includes('custom')) {
            return COMPLEXITY_LEVELS[2]; // Complex
        }
        return COMPLEXITY_LEVELS[1]; // Moderate (default)
    };

    const dueDateStatus = getDueDateStatus();
    const workType = getWorkTypeInfo();
    const complexity = getComplexityLevel();

    return (
        <Card 
            sx={{ 
                height: '100%',
                cursor: bulkSelectMode ? 'pointer' : 'default',
                border: bulkSelectMode && isSelected ? '2px solid' : '1px solid',
                borderColor: bulkSelectMode && isSelected ? 'primary.main' : 'divider',
                '&:hover': {
                    boxShadow: 3,
                    ...(bulkSelectMode && { 
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover'
                    })
                }
            }}
            onClick={handleCardClick}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    {/* Bulk Select Checkbox */}
                    {bulkSelectMode && (
                        <Checkbox 
                            checked={isSelected}
                            onChange={() => onToggleSelect(repair.repairID)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    {/* Repair Image */}
                    {repair.picture && (
                        <Box
                            sx={{
                                width: 60,
                                height: 60,
                                borderRadius: 1,
                                overflow: 'hidden',
                                position: 'relative',
                                flexShrink: 0
                            }}
                        >
                            <Image
                                src={repair.picture}
                                alt="Repair Item"
                                fill
                                style={{ objectFit: 'cover' }}
                            />
                        </Box>
                    )}

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Header Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                                    {repair.clientName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {repair.repairID}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {repair.isRush && (
                                    <Chip
                                        icon={<PriorityHighIcon />}
                                        label="RUSH"
                                        color="error"
                                        size="small"
                                        sx={{ fontSize: '0.7rem', height: 24 }}
                                    />
                                )}
                                <IconButton 
                                    size="small" 
                                    onClick={handleMenuOpen}
                                >
                                    <MoreVertIcon />
                                </IconButton>
                            </Box>
                        </Box>

                        {/* Work Type & Complexity */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            <Chip 
                                label={workType.label}
                                color={workType.color}
                                size="small"
                                variant="outlined"
                            />
                            <Chip 
                                label={complexity.label}
                                color={complexity.color}
                                size="small"
                                variant="filled"
                            />
                        </Box>

                        {/* Description */}
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                mb: 2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}
                        >
                            {repair.description}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        {/* Footer Info */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccessTimeIcon fontSize="small" color="action" />
                                <Chip 
                                    label={dueDateStatus.label}
                                    color={dueDateStatus.color}
                                    size="small"
                                    variant={dueDateStatus.status === 'overdue' ? 'filled' : 'outlined'}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {repair.assignedJeweler ? (
                                    <Chip
                                        avatar={<Avatar sx={{ width: 20, height: 20 }}><PersonIcon fontSize="small" /></Avatar>}
                                        label={repair.assignedJeweler}
                                        color="primary"
                                        size="small"
                                        variant="outlined"
                                    />
                                ) : (
                                    <Chip
                                        label="Unassigned"
                                        color="default"
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </CardContent>

            {/* Action Menu */}
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
                <MenuItem onClick={() => { onAssignJeweler(repair.repairID); handleMenuClose(); }}>
                    Assign Jeweler
                </MenuItem>
                <MenuItem onClick={() => { onStartWork(repair.repairID); handleMenuClose(); }}>
                    Start Work
                </MenuItem>
                <MenuItem onClick={() => { onViewDetails(repair.repairID); handleMenuClose(); }}>
                    View Details
                </MenuItem>
            </Menu>
        </Card>
    );
};

export default WorkCard;
