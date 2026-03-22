
'use client';
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Alert, TextField, Grid, Card, CardContent, Paper } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useGemstoneManagement } from '../../../../hooks/products/gemstones/useGemstoneManagement';
import GemstoneGrid from '../../../../components/products/gemstones/GemstoneGrid';

export default function GemstonesDashboardPage() {
    const router = useRouter();
    const { products, loading, error, handleDeleteProduct } = useGemstoneManagement('/api/products/gemstones');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGemstones = products.filter(g => 
        (g.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Gemstones Management</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/products/gemstones/new')}>
                    Add Gemstone
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card><CardContent><Typography>Total Gemstones</Typography><Typography variant="h4">{products.length}</Typography></CardContent></Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card><CardContent><Typography>Available</Typography><Typography variant="h4">{products.filter(p => ['active', 'Available'].includes(p.status)).length}</Typography></CardContent></Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2.5, mb: 3 }}>
                <TextField 
                    placeholder="Search gemstones..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    size="small"
                />
            </Paper>

            <GemstoneGrid 
                products={filteredGemstones} 
                onDelete={handleDeleteProduct} 
                isLoading={loading} 
                emptyMessage="No gemstones found." 
            />
        </Box>
    );
}
