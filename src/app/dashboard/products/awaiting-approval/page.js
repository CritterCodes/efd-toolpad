'use client';

import React from 'react';
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Paper,
    Stack,
} from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InboxIcon from '@mui/icons-material/Inbox';
import { useAwaitingApproval } from '@/hooks/products/useAwaitingApproval';
import StatsCards from './components/StatsCards';
import ProductFilters from './components/ProductFilters';
import ProductTable from './components/ProductTable';
import ProductDetailDialog from './components/ProductDetailDialog';
import ApprovalDialog from './components/ApprovalDialog';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

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
            <Box sx={{ py: 4, px: 3 }}>
                <Alert severity="error">Admin access required</Alert>
            </Box>
        );
    }

    const uniqueArtisansCount = Object.keys(getUniqueArtisans()).length;
    const cogDataCount = products.filter(p => p.cogData).length;

    return (
        <Box sx={{ pb: 6 }}>
            <Box sx={{
                backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                borderRadius: { xs: 0, sm: 3 },
                boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                p: { xs: 0.5, sm: 2.5, md: 3 },
                mb: 3,
            }}>
                <Typography sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    px: 1.25, py: 0.5, mb: 1.5,
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    color: REPAIRS_UI.textPrimary,
                    backgroundColor: REPAIRS_UI.bgCard,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    borderRadius: 2, textTransform: 'uppercase',
                }}>
                    <HourglassEmptyIcon sx={{ fontSize: 16, color: '#FFB74D' }} />
                    Product Queue
                </Typography>
                <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                    Products Awaiting Approval
                </Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                    Manage and review designs that are ready to be listed on the website.
                </Typography>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    onClose={() => setError('')}
                    sx={{ mb: 3, backgroundColor: '#4A1D1D', color: '#F8BBBB', border: '1px solid #7A2E2E' }}
                >
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
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
                </Box>
            ) : filteredProducts.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                    <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600, mb: 0.5 }}>
                        No products found
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.875rem' }}>
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
        </Box>
    );
}
