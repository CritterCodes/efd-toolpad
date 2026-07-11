import React from 'react';
import Link from 'next/link';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Box,
    Typography,
    Grid,
    Chip,
} from '@mui/material';
import { ThumbUp as ThumbUpIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLOR = {
    approved: '#66BB6A',
    pending: '#FFB74D',
    rejected: '#EF5350',
    submitted: '#64B5F6',
};

export default function ProductDetailDialog({
    detailView,
    setDetailView,
    selectedDetailProduct
}) {
    if (!selectedDetailProduct) return null;

    const statusColor = STATUS_COLOR[selectedDetailProduct.designInfo?.status] || '#FFB74D';

    return (
        <Dialog
            open={detailView}
            onClose={() => setDetailView(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}
        >
            <DialogTitle sx={{ color: REPAIRS_UI.textHeader, borderBottom: `1px solid ${REPAIRS_UI.border}` }}>
                {selectedDetailProduct?.title}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    {selectedDetailProduct.images?.[0]?.url && (
                        <Box
                            component="img"
                            src={selectedDetailProduct.images[0].url}
                            alt={selectedDetailProduct.title}
                            sx={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 1, border: `1px solid ${REPAIRS_UI.border}` }}
                        />
                    )}

                    {selectedDetailProduct.description && (
                        <Box>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Description</Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
                                {selectedDetailProduct.description}
                            </Typography>
                        </Box>
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Retail Price</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mt: 0.5 }}>
                                ${parseFloat(selectedDetailProduct.retailPrice || 0).toFixed(2)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Artisan</Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
                                {selectedDetailProduct.artisanInfo?.businessName || selectedDetailProduct.artisanInfo?.name}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Design Status</Typography>
                            <Box sx={{ mt: 0.5 }}>
                                <Chip
                                    label={selectedDetailProduct.designInfo?.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                    size="small"
                                    sx={{ backgroundColor: `${statusColor}22`, color: statusColor, fontWeight: 700, fontSize: '0.7rem' }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Submitted</Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
                                {new Date(selectedDetailProduct.submittedAt).toLocaleString()}
                            </Typography>
                        </Grid>
                        {selectedDetailProduct.cogData && (
                            <Grid item xs={12}>
                                <Chip
                                    icon={<ThumbUpIcon sx={{ fontSize: 14 }} />}
                                    label="COG Data Configured — Ready for Listing"
                                    sx={{ backgroundColor: '#66BB6A22', color: '#66BB6A', fontWeight: 600 }}
                                />
                            </Grid>
                        )}
                    </Grid>

                    <Box>
                        <Link href={`/dashboard/products/gemstones/${selectedDetailProduct.productId || selectedDetailProduct._id}`}>
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<ViewIcon />}
                                sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary, '&:hover': { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent, backgroundColor: REPAIRS_UI.bgCard } }}
                            >
                                View Full Product Page
                            </Button>
                        </Link>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ borderTop: `1px solid ${REPAIRS_UI.border}` }}>
                <Button onClick={() => setDetailView(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
