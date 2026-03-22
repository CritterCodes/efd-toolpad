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
    Chip
} from '@mui/material';
import { ThumbUp as ThumbUpIcon, Visibility as ViewIcon } from '@mui/icons-material';

export default function ProductDetailDialog({
    detailView,
    setDetailView,
    selectedDetailProduct
}) {
    if (!selectedDetailProduct) return null;

    return (
        <Dialog open={detailView} onClose={() => setDetailView(false)} maxWidth="md" fullWidth>
            <DialogTitle>
                {selectedDetailProduct?.title}
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    {/* Image */}
                    {selectedDetailProduct.images?.[0]?.url && (
                        <Box
                            component="img"
                            src={selectedDetailProduct.images[0].url}
                            alt={selectedDetailProduct.title}
                            sx={{
                                width: '100%',
                                maxHeight: 300,
                                objectFit: 'contain',
                                borderRadius: 1
                            }}
                        />
                    )}
                    
                    {/* Description */}
                    {selectedDetailProduct.description && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Description
                            </Typography>
                            <Typography variant="body2">
                                {selectedDetailProduct.description}
                            </Typography>
                        </Box>
                    )}
                    
                    {/* Details Grid */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Retail Price
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                ${parseFloat(selectedDetailProduct.retailPrice || 0).toFixed(2)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Artisan
                            </Typography>
                            <Typography variant="body2">
                                {selectedDetailProduct.artisanInfo?.businessName || selectedDetailProduct.artisanInfo?.name}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Design Status
                            </Typography>
                            <Chip
                                label={selectedDetailProduct.designInfo?.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                size="small"
                                color={selectedDetailProduct.designInfo?.status === 'approved' ? 'success' : 'warning'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Submitted
                            </Typography>
                            <Typography variant="body2">
                                {new Date(selectedDetailProduct.submittedAt).toLocaleString()}
                            </Typography>
                        </Grid>
                        {selectedDetailProduct.cogData && (
                            <Grid item xs={12}>
                                <Chip
                                    icon={<ThumbUpIcon />}
                                    label="COG Data Configured - Ready for Listing"
                                    color="success"
                                    variant="filled"
                                    fullWidth
                                />
                            </Grid>
                        )}
                    </Grid>
                    
                    {/* View Full Product Link */}
                    <Box>
                        <Link href={`/dashboard/products/gemstones/${selectedDetailProduct.productId || selectedDetailProduct._id}`}>
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<ViewIcon />}
                            >
                                View Full Product Page
                            </Button>
                        </Link>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDetailView(false)}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
