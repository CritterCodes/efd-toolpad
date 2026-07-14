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

    const draftLabel = saving === 'draft' ? 'Saving...' : saving === 'saved' ? 'Saved' : saving === 'failed' ? 'Save failed - retry' : 'Save Draft';
    const compactDraftLabel = saving === 'draft' ? 'Saving' : saving === 'saved' ? 'Saved' : saving === 'failed' ? 'Retry' : 'Save';
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
            px: { xs: 1, sm: 2 }, py: 1.25,
            display: 'flex', alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1,
        }}>
            <IconButton aria-label="Back to products" onClick={onBack} sx={{ color: REPAIRS_UI.textSecondary, flexShrink: 0, order: 1 }}>
                <ArrowBackIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1, minWidth: 0, order: 2 }}>
                <Breadcrumbs sx={{ display: { xs: 'none', sm: 'flex' }, '& .MuiBreadcrumbs-separator': { color: REPAIRS_UI.textMuted } }}>
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
                <Typography sx={{
                    display: { xs: 'block', sm: 'none' },
                    color: REPAIRS_UI.textHeader,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {displayTitle}
                    {isDirty && (
                        <Typography component="span" sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem', ml: 0.5 }}>
                            (unsaved)
                        </Typography>
                    )}
                </Typography>
            </Box>

            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1,
                flexShrink: 0, order: { xs: 4, sm: 3 },
                width: { xs: '100%', sm: 'auto' },
                pl: { xs: 6, sm: 0 },
            }}>
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
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{draftLabel}</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{compactDraftLabel}</Box>
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
                    {saving === 'publish' ? 'Publishing...' : 'Publish'}
                </Button>
            </Box>

            <IconButton aria-label="More product actions" onClick={handleMenuOpen} sx={{ color: REPAIRS_UI.textSecondary, order: { xs: 3, sm: 4 } }}>
                <MoreVertIcon />
            </IconButton>

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
                    Remove from catalog
                </MenuItem>
            </Menu>
        </Box>
    );
}
