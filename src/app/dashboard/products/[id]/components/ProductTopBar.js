'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Breadcrumbs, Link, Menu, MenuItem, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DraftsIcon from '@mui/icons-material/Drafts';
import PublishIcon from '@mui/icons-material/Publish';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function ProductTopBar({ title, isNew, isDirty, saving, onBack, onSaveDraft, onPublish, onDuplicate, onArchive, onDelete }) {
    const [menuAnchor, setMenuAnchor] = useState(null);

    const draftLabel = saving === 'draft' ? 'Saving…' : saving === 'failed' ? 'Save failed — retry' : 'Save Draft';
    const isSaving = saving === 'draft' || saving === 'publish';

    const handleMenuOpen = (e) => setMenuAnchor(e.currentTarget);
    const handleMenuClose = () => setMenuAnchor(null);

    const handleAction = (fn) => {
        handleMenuClose();
        fn?.();
    };

    const displayTitle = isNew ? 'New Product' : (title || 'Edit Product');

    return (
        <Box sx={{
            position: 'sticky', top: 0, zIndex: 100,
            backgroundColor: REPAIRS_UI.bgPrimary,
            borderBottom: `1px solid ${REPAIRS_UI.border}`,
            px: 2, py: 1.25,
            display: 'flex', alignItems: 'center', gap: 1,
        }}>
            <IconButton onClick={onBack} sx={{ color: REPAIRS_UI.textSecondary, flexShrink: 0 }}>
                <ArrowBackIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Breadcrumbs sx={{ '& .MuiBreadcrumbs-separator': { color: REPAIRS_UI.textMuted } }}>
                    <Link href="/dashboard" underline="hover" sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', '&:hover': { color: REPAIRS_UI.accent } }}>
                        Dashboard
                    </Link>
                    <Link href="/dashboard/products" underline="hover" sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', '&:hover': { color: REPAIRS_UI.accent } }}>
                        Products
                    </Link>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: '0.8rem' }}>
                        {displayTitle}
                        {isDirty && (
                            <Typography component="span" sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem', ml: 0.5 }}>
                                (unsaved)
                            </Typography>
                        )}
                    </Typography>
                </Breadcrumbs>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {isSaving && <CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} />}

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DraftsIcon />}
                    onClick={onSaveDraft}
                    disabled={!!saving && saving !== 'failed'}
                    sx={{
                        borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary,
                        '&:hover': { borderColor: REPAIRS_UI.accent, backgroundColor: REPAIRS_UI.bgCard },
                        '&.Mui-disabled': { borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted },
                    }}
                >
                    {draftLabel}
                </Button>

                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PublishIcon />}
                    onClick={onPublish}
                    disabled={!!saving && saving !== 'failed'}
                    sx={{
                        backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600,
                        '&:hover': { backgroundColor: '#C19B2E' },
                        '&.Mui-disabled': { backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textMuted },
                    }}
                >
                    {saving === 'publish' ? 'Publishing…' : 'Publish'}
                </Button>

                <IconButton onClick={handleMenuOpen} sx={{ color: REPAIRS_UI.textSecondary }}>
                    <MoreVertIcon />
                </IconButton>
            </Box>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 0.5, backgroundColor: REPAIRS_UI.bgCard,
                        color: REPAIRS_UI.textPrimary,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        boxShadow: REPAIRS_UI.shadow,
                        backgroundImage: 'none',
                    },
                }}
            >
                <MenuItem onClick={() => handleAction(onDuplicate)} sx={{ '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                    Duplicate
                </MenuItem>
                <MenuItem onClick={() => handleAction(onArchive)} sx={{ '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                    Archive
                </MenuItem>
                <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: '#EF5350', '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                    Delete
                </MenuItem>
            </Menu>
        </Box>
    );
}
