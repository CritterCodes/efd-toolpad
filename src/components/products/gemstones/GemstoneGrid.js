'use client';

import React from 'react';
import { Grid, Card, CardActionArea, CardContent, Typography, Box, Chip, IconButton, CircularProgress, Paper } from '@mui/material';
import { Delete as DeleteIcon, Diamond as DiamondIcon } from '@mui/icons-material';
import InboxIcon from '@mui/icons-material/Inbox';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLOR = {
    active: '#66BB6A',
    draft: REPAIRS_UI.textMuted,
    sold: '#EF5350',
    pending: '#FFB74D',
};

export default function GemstoneGrid({ products, onDelete, isLoading, emptyMessage }) {
    const router = useRouter();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

    if (!products || products.length === 0) {
        return (
            <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
                <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{emptyMessage || 'No gemstones found.'}</Typography>
            </Paper>
        );
    }

    return (
        <Grid container spacing={2}>
            {products.map((product, idx) => {
                const id = product.productId || product._id;
                const statusColor = STATUS_COLOR[product.status] || REPAIRS_UI.textMuted;
                const imgSrc = product.images?.[0]?.url || (typeof product.images?.[0] === 'string' ? product.images[0] : null);

                return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={id || idx}>
                        <Card sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            backgroundColor: REPAIRS_UI.bgCard,
                            backgroundImage: 'none',
                            border: `1px solid ${REPAIRS_UI.border}`,
                            borderRadius: 2,
                            boxShadow: 'none',
                            transition: 'border-color 0.15s',
                            '&:hover': { borderColor: '#64B5F6' },
                        }}>
                            <CardActionArea
                                onClick={() => router.push(`/dashboard/products/gemstones/${id}`)}
                                sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                            >
                                {/* Image block */}
                                <Box sx={{ position: 'relative', pt: '100%' }}>
                                    {imgSrc ? (
                                        <img
                                            src={imgSrc}
                                            alt={product.title}
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : null}
                                    <Box sx={{
                                        position: 'absolute', top: 0, left: 0,
                                        width: '100%', height: '100%',
                                        backgroundColor: REPAIRS_UI.bgTertiary,
                                        display: imgSrc ? 'none' : 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <DiamondIcon sx={{ fontSize: 60, color: REPAIRS_UI.textMuted }} />
                                    </Box>
                                    <Chip
                                        label={product.status || 'draft'}
                                        size="small"
                                        sx={{
                                            position: 'absolute', top: 8, right: 8,
                                            backgroundColor: `${statusColor}22`,
                                            color: statusColor,
                                            fontWeight: 700,
                                            fontSize: '0.68rem',
                                            textTransform: 'capitalize',
                                        }}
                                    />
                                </Box>

                                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                                    <Typography noWrap sx={{ fontSize: '1rem', fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.25 }}>
                                        {product.title}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.825rem', color: REPAIRS_UI.textSecondary, mb: 0.5 }}>
                                        {product.gemstone?.species || product.species || '—'}
                                        {product.carat ? ` · ${product.carat} ct` : ''}
                                    </Typography>
                                    {(product.price || product.pricing?.retailPrice) && (
                                        <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, fontSize: '0.95rem' }}>
                                            ${parseFloat(product.price || product.pricing?.retailPrice || 0).toLocaleString()}
                                        </Typography>
                                    )}
                                </CardContent>
                            </CardActionArea>

                            {onDelete && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.5, pb: 1.5 }}>
                                    <IconButton
                                        size="small"
                                        aria-label="Delete gemstone"
                                        onClick={(e) => { e.stopPropagation(); onDelete(product); }}
                                        sx={{ color: REPAIRS_UI.textMuted, '&:hover': { color: '#EF5350', backgroundColor: '#EF535022' } }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            )}
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
}
