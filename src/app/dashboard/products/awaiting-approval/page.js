'use client';

import React from 'react';
import {
    Container,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Paper,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useAwaitingApproval } from '@/hooks/products/useAwaitingApproval';
import StatsCards from './components/StatsCards';
import ProductFilters from './components/ProductFilters';
import ProductTable from './components/ProductTable';
import ProductDetailDialog from './components/ProductDetailDialog';
import ApprovalDialog from './components/ApprovalDialog';

export default function ProductsAwaitingApprovalPage() {
    const {
        session,
        products,
        filteredProducts,
        loading,
        error,
        setError,
        actionLoading,
        page,
        rowsPerPage,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        artisanFilter,
        setArtisanFilter,
        approvalDialog,
        setApprovalDialog,
        selectedProduct,
        approvalNotes,
        setApprovalNotes,
        approvalAction,
        detailView,
        setDetailView,
        selectedDetailProduct,
        setSelectedDetailProduct,
        handleApprovalClick,
        handleSubmitApproval,
        getUniqueArtisans,
        getUniqueStatuses,
        paginatedProducts,
        handleChangePage,
        handleChangeRowsPerPage
    } = useAwaitingApproval();

    if (!session?.user || session.user.role !== 'admin') {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">Admin access required</Alert>
            </Container>
        );
    }

    const uniqueArtisansCount = Object.keys(getUniqueArtisans()).length;
    const cogDataCount = products.filter(p => p.cogData).length;

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                    í¾ Products Awaiting Approval
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage and review designs that are ready to be listed on the website
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <StatsCards 
                products={products}
                filteredProducts={filteredProducts}
                uniqueArtisansCount={uniqueArtisansCount}
                cogDataCount={cogDataCount}
            />

            <ProductFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                artisanFilter={artisanFilter}
                setArtisanFilter={setArtisanFilter}
                uniqueStatuses={getUniqueStatuses()}
                uniqueArtisans={getUniqueArtisans()}
            />

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : filteredProducts.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No products found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {searchQuery || statusFilter !== 'all' || artisanFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'All products have been reviewed!'}
                    </Typography>
                </Paper>
            ) : (
                <ProductTable
                    paginatedProducts={paginatedProducts}
                    filteredProductsCount={filteredProducts.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    handleChangePage={handleChangePage}
                    handleChangeRowsPerPage={handleChangeRowsPerPage}
                    setSelectedDetailProduct={setSelectedDetailProduct}
                    setDetailView={setDetailView}
                    handleApprovalClick={handleApprovalClick}
                    actionLoading={actionLoading}
                />
            )}

            <ProductDetailDialog
                detailView={detailView}
                setDetailView={setDetailView}
                selectedDetailProduct={selectedDetailProduct}
            />

            <ApprovalDialog
                approvalDialog={approvalDialog}
                setApprovalDialog={setApprovalDialog}
                approvalAction={approvalAction}
                selectedProduct={selectedProduct}
                approvalNotes={approvalNotes}
                setApprovalNotes={setApprovalNotes}
                handleSubmitApproval={handleSubmitApproval}
                actionLoading={actionLoading}
            />
        </Container>
    );
}
