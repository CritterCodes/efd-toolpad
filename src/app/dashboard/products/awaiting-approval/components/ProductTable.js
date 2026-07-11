import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Box,
    Typography,
    Chip,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    Check as ApproveIcon,
    Close as DeclineIcon,
    ThumbUp as ThumbUpIcon,
    Visibility as ViewIcon,
    Diamond as DiamondIcon,
} from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLOR = {
    approved: '#66BB6A',
    pending: '#FFB74D',
    rejected: '#EF5350',
    submitted: '#64B5F6',
};

export default function ProductTable({
    paginatedProducts,
    filteredProductsCount,
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    setSelectedDetailProduct,
    setDetailView,
    handleApprovalClick,
    actionLoading
}) {
    return (
        <>
            <TableContainer component={Paper} sx={{ backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: REPAIRS_UI.bgTertiary }}>
                            <TableCell sx={{ fontWeight: 700, color: REPAIRS_UI.textSecondary, borderBottom: `1px solid ${REPAIRS_UI.border}`, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: REPAIRS_UI.textSecondary, borderBottom: `1px solid ${REPAIRS_UI.border}`, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artisan</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: REPAIRS_UI.textSecondary, borderBottom: `1px solid ${REPAIRS_UI.border}`, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: REPAIRS_UI.textSecondary, borderBottom: `1px solid ${REPAIRS_UI.border}`, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: REPAIRS_UI.textSecondary, borderBottom: `1px solid ${REPAIRS_UI.border}`, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: REPAIRS_UI.textSecondary, borderBottom: `1px solid ${REPAIRS_UI.border}`, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedProducts.map((product) => (
                            <TableRow
                                key={product._id}
                                sx={{
                                    '&:hover': { backgroundColor: REPAIRS_UI.bgPanel },
                                    '& td': { borderBottom: `1px solid ${REPAIRS_UI.border}` },
                                }}
                            >
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        {product.images?.[0]?.url ? (
                                            <Box
                                                component="img"
                                                src={product.images[0].url}
                                                alt={product.title}
                                                sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
                                            />
                                        ) : (
                                            <Box sx={{ width: 50, height: 50, borderRadius: 1, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <DiamondIcon sx={{ fontSize: 24, color: REPAIRS_UI.textMuted }} />
                                            </Box>
                                        )}
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>
                                                {product.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                                                {product.description?.substring(0, 50)}…
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ color: REPAIRS_UI.textSecondary }}>
                                    {product.artisanInfo?.businessName || product.artisanInfo?.name}
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>
                                        ${parseFloat(product.retailPrice || 0).toFixed(2)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={product.designInfo?.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                        size="small"
                                        sx={{
                                            backgroundColor: `${STATUS_COLOR[product.designInfo?.status] || '#FFB74D'}22`,
                                            color: STATUS_COLOR[product.designInfo?.status] || '#FFB74D',
                                            border: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                        }}
                                    />
                                    {product.cogData && (
                                        <Chip
                                            icon={<ThumbUpIcon sx={{ fontSize: 14 }} />}
                                            label="COG"
                                            size="small"
                                            sx={{ ml: 1, backgroundColor: '#66BB6A22', color: '#66BB6A', fontWeight: 700, fontSize: '0.7rem' }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell sx={{ color: REPAIRS_UI.textSecondary, whiteSpace: 'nowrap' }}>
                                    {new Date(product.submittedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="View Details">
                                        <IconButton
                                            size="small"
                                            sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }}
                                            onClick={() => {
                                                setSelectedDetailProduct(product);
                                                setDetailView(true);
                                            }}
                                        >
                                            <ViewIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Approve">
                                        <IconButton
                                            size="small"
                                            sx={{ color: '#66BB6A', '&:hover': { backgroundColor: '#66BB6A22' } }}
                                            onClick={() => handleApprovalClick(product, 'approve')}
                                            disabled={actionLoading}
                                        >
                                            <ApproveIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject">
                                        <IconButton
                                            size="small"
                                            sx={{ color: '#EF5350', '&:hover': { backgroundColor: '#EF535022' } }}
                                            onClick={() => handleApprovalClick(product, 'reject')}
                                            disabled={actionLoading}
                                        >
                                            <DeclineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={filteredProductsCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{ color: REPAIRS_UI.textSecondary }}
            />
        </>
    );
}
