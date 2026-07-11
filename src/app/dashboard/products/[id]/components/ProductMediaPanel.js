'use client';

import React, { useRef, useState } from 'react';
import { Box, Typography, ImageList, ImageListItem, Chip, IconButton, Menu, MenuItem, LinearProgress } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function ProductMediaPanel({ imageUrls, pendingImages, onImageAdd, onImageRemove, onImageReorder }) {
    const fileInputRef = useRef(null);
    const [dragIdx, setDragIdx] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuIdx, setMenuIdx] = useState(null);

    const allPreviews = [
        ...imageUrls.map(url => ({ src: url, type: 'existing' })),
        ...pendingImages.map(f => ({ src: URL.createObjectURL(f), type: 'pending' })),
    ];

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) onImageAdd(files);
    };

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) onImageAdd(files);
        e.target.value = '';
    };

    const handleItemDragStart = (idx) => setDragIdx(idx);

    const handleItemDrop = (e, toIdx) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === toIdx || dragIdx >= imageUrls.length || toIdx >= imageUrls.length) {
            setDragIdx(null);
            return;
        }
        onImageReorder(dragIdx, toIdx);
        setDragIdx(null);
    };

    const openMenu = (e, idx) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
        setMenuIdx(idx);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuIdx(null);
    };

    const handleSetPrimary = () => {
        if (menuIdx !== null && menuIdx < imageUrls.length) {
            onImageReorder(menuIdx, 0);
        }
        closeMenu();
    };

    const handleRemove = () => {
        if (menuIdx !== null) onImageRemove(menuIdx);
        closeMenu();
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Box
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                sx={{
                    border: `2px dashed ${REPAIRS_UI.border}`,
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: REPAIRS_UI.bgPanel,
                    mb: 2,
                    '&:hover': { borderColor: REPAIRS_UI.accent },
                    transition: 'border-color 0.15s',
                }}
            >
                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.875rem' }}>
                    Drag &amp; drop images or click to upload
                </Typography>
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileInput}
                />
            </Box>

            {pendingImages.length > 0 && (
                <LinearProgress
                    sx={{ mb: 1, backgroundColor: REPAIRS_UI.bgTertiary, '& .MuiLinearProgress-bar': { backgroundColor: REPAIRS_UI.accent } }}
                />
            )}

            {allPreviews.length > 0 && (
                <ImageList cols={3} gap={8} sx={{ mt: 0 }}>
                    {allPreviews.map((item, idx) => (
                        <ImageListItem
                            key={idx}
                            draggable={item.type === 'existing'}
                            onDragStart={() => handleItemDragStart(idx)}
                            onDrop={(e) => handleItemDrop(e, idx)}
                            onDragOver={(e) => e.preventDefault()}
                            sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden', cursor: item.type === 'existing' ? 'grab' : 'default' }}
                        >
                            <img
                                src={item.src}
                                alt={`product-${idx}`}
                                loading="lazy"
                                style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                            />
                            {idx === 0 && (
                                <Chip
                                    label="PRIMARY"
                                    size="small"
                                    color="primary"
                                    sx={{ position: 'absolute', top: 4, left: 4, fontSize: '0.65rem', height: 20 }}
                                />
                            )}
                            <IconButton
                                size="small"
                                onClick={(e) => openMenu(e, idx)}
                                sx={{
                                    position: 'absolute', top: 2, right: 2,
                                    backgroundColor: 'rgba(0,0,0,0.55)',
                                    color: '#fff',
                                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                                    p: 0.25,
                                }}
                            >
                                <MoreVertIcon fontSize="small" />
                            </IconButton>
                        </ImageListItem>
                    ))}
                </ImageList>
            )}

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                PaperProps={{
                    sx: {
                        backgroundColor: REPAIRS_UI.bgCard,
                        color: REPAIRS_UI.textPrimary,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        backgroundImage: 'none',
                    },
                }}
            >
                {menuIdx !== null && menuIdx < imageUrls.length && menuIdx !== 0 && (
                    <MenuItem onClick={handleSetPrimary} sx={{ '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                        Set as Primary
                    </MenuItem>
                )}
                <MenuItem onClick={handleRemove} sx={{ color: '#EF5350', '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                    Remove
                </MenuItem>
            </Menu>
        </Box>
    );
}
