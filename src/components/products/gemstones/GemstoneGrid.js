
'use client';
import React from 'react';
import { Grid, Card, CardContent, CardMedia, Typography, Box, Chip, IconButton, Button } from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';

export default function GemstoneGrid({ products, onEdit, onDelete, isLoading, emptyMessage }) {
  if (isLoading) return <Typography>Loading...</Typography>;
  if (!products || products.length === 0) return <Typography>{emptyMessage || 'No products found'}</Typography>;

  return (
    <Grid container spacing={3}>
      {products.map((product, idx) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
          <Card>
            <CardContent>
              <Typography variant="h6">{product.title}</Typography>
              <Typography variant="body2">{product.gemstone?.species || product.species}</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                 {onEdit && <Button size="small" onClick={() => onEdit(product)}>Edit</Button>}
                 {onDelete && <Button size="small" color="error" onClick={() => onDelete(product)}>Delete</Button>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
