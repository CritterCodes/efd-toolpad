import React from 'react';
import { Grid, Paper, Typography, Card, CardMedia, CardContent, Chip, Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Link from 'next/link';

export const JewelryGrid = ({ paginatedJewelry, handleDelete }) => {
  return (
    <>
{/* Grid */}
            {paginatedJewelry.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        No jewelry found matching your criteria.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {paginatedJewelry.map((item) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <Box sx={{ position: 'relative', pt: '100%' }}>
                                    {item.images && item.images.length > 0 ? (
                                        <img
                                            src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url}
                                            alt={item.title}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: 'grey.100',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <DiamondIcon sx={{ fontSize: 60, color: 'grey.300' }} />
                                        </Box>
                                    )}
                                    <Chip
                                        label={item.status || 'Draft'}
                                        color={item.status === 'active' ? 'success' : 'default'}
                                        size="small"
                                        sx={{ position: 'absolute', top: 8, right: 8 }}
                                    />
                                </Box>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" noWrap gutterBottom>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {item.jewelry?.type} • {item.jewelry?.material}
                                    </Typography>
                                    {item.availability && (
                                        <Chip 
                                            label={item.availability.replace(/-/g, ' ')} 
                                            size="small" 
                                            variant="outlined" 
                                            color="info" 
                                            sx={{ mb: 1, mr: 0.5, textTransform: 'capitalize' }} 
                                        />
                                    )}
                                    {item.classification && (
                                        <Chip 
                                            label={item.classification === 'one-of-one' ? '1 of 1' : 'Signature'} 
                                            size="small" 
                                            variant="outlined" 
                                            color="secondary" 
                                            sx={{ mb: 1, textTransform: 'capitalize' }} 
                                        />
                                    )}
                                    <Typography variant="h6" color="primary">
                                        ${item.price?.toLocaleString() || '0'}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                                    <Button 
                                        size="small" 
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => router.push(`/dashboard/products/jewelry/${item.productId || item._id}`)}
                                    >
                                        View
                                    </Button>
                                    <Box>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => router.push(`/dashboard/products/jewelry/${item.productId || item._id}`)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            color="error"
                                            onClick={() => handleDeleteJewelry(item.productId || item._id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            
    </>
  );
};
