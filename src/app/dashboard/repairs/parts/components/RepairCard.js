import React, { useState } from 'react';
import Image from 'next/image';
import {
    Paper,
    Box,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    Chip,
    Badge
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { mergeMaterialsWithPending } from '../utils/partsUtils';

const RepairCard = ({ 
    repair, 
    pendingMaterials = [], 
    onAddMaterial, 
    onEditMaterial,
    onMarkPartsOrdered,
    onMarkReadyForWork 
}) => {
    const [menuAnchor, setMenuAnchor] = useState(null);

    const handleMenuOpen = (event) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const allMaterials = mergeMaterialsWithPending(repair.parts || [], pendingMaterials);
    const hasPendingChanges = pendingMaterials.length > 0;

    const getStatusChipColor = (status) => {
        switch (status) {
            case "NEEDS PARTS":
                return "warning";
            case "PARTS ORDERED":
                return "info";
            default:
                return "default";
        }
    };

    const formatPrice = (price) => {
        if (typeof price === 'number') {
            return `$${price.toFixed(2)}`;
        }
        return price || 'N/A';
    };

    return (
        <Paper 
            elevation={3} 
            sx={{ 
                padding: '20px', 
                borderRadius: '12px',
                border: hasPendingChanges ? '2px solid #ff9800' : 'none'
            }}
        >
            <Box sx={{ display: 'flex', gap: 2 }}>
                {repair.picture && (
                    <Box
                        sx={{
                            flex: 1,
                            maxWidth: '150px',
                            height: '150px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                        }}
                    >
                        <Image
                            src={repair.picture}
                            alt="Repair Image"
                            fill
                            style={{
                                objectFit: 'cover'
                            }}
                        />
                    </Box>
                )}

                <Box sx={{ flex: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                            <Typography variant="h6" fontWeight="600">
                                {repair.clientName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {repair.repairID}
                                </Typography>
                                <Chip 
                                    label={repair.status}
                                    color={getStatusChipColor(repair.status)}
                                    size="small"
                                />
                                {hasPendingChanges && (
                                    <Badge color="warning" variant="dot">
                                        <Chip label="Unsaved Changes" size="small" color="warning" />
                                    </Badge>
                                )}
                            </Box>
                        </Box>
                        <IconButton onClick={handleMenuOpen}>
                            <MoreVertIcon />
                        </IconButton>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Due:</strong> {repair.promiseDate ? new Date(repair.promiseDate).toLocaleDateString() : 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>Description:</strong> {repair.description}
                    </Typography>

                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Materials & Parts:
                    </Typography>
                    <List dense>
                        {allMaterials.length === 0 ? (
                            <ListItem>
                                <ListItemText 
                                    primary="No materials added yet"
                                    secondary="Click 'Add Material' to get started"
                                />
                            </ListItem>
                        ) : (
                            allMaterials.map((material, index) => (
                                <ListItem 
                                    key={material.sku || index}
                                    sx={{ 
                                        bgcolor: pendingMaterials.find(p => p.sku === material.sku) ? 'warning.50' : 'transparent',
                                        borderRadius: 1,
                                        mb: 0.5
                                    }}
                                    secondaryAction={
                                        <IconButton 
                                            size="small" 
                                            onClick={() => onEditMaterial(repair.repairID, material)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    }
                                >
                                    <ListItemText 
                                        primary={`${material.partName || material.name || 'Unknown Material'} (${material.sku || 'No SKU'})`}
                                        secondary={
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Typography variant="caption">
                                                    Qty: {material.quantity || 1}
                                                </Typography>
                                                <Typography variant="caption">
                                                    Cost: {formatPrice(material.cost)}
                                                </Typography>
                                                <Typography variant="caption">
                                                    Price: {formatPrice(material.price)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))
                        )}
                    </List>
                </Box>
            </Box>

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
                <MenuItem onClick={() => { onAddMaterial(repair.repairID); handleMenuClose(); }}>
                    <AddIcon sx={{ mr: 1 }} /> Add Material
                </MenuItem>
                {repair.status === "NEEDS PARTS" && (
                    <MenuItem onClick={() => { onMarkPartsOrdered(repair.repairID); handleMenuClose(); }}>
                        Mark Parts Ordered
                    </MenuItem>
                )}
                {repair.status === "PARTS ORDERED" && (
                    <MenuItem onClick={() => { onMarkReadyForWork(repair.repairID); handleMenuClose(); }}>
                        Mark Ready for Work
                    </MenuItem>
                )}
            </Menu>
        </Paper>
    );
};

export default RepairCard;
