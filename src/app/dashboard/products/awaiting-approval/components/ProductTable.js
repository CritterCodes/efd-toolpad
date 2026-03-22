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
} from '@mui/icons-material';

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
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Artisan</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Submitted</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedProducts.map((product) => (
                            <TableRow key={product._id} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        {product.images?.[0]?.url && (
                                            <Box
                                                component="img"
                                                src={product.images[0].url}
                                                alt={product.title}
                                                sx={{
                                                    width: 50,
                                                    height: 50,
                                                    objectFit: 'cover',
                                                    borderRadius: 1
                                                }}
                                            />
                                        )}
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {product.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {product.description?.substring(0, 50)}...
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {product.artisanInfo?.businessName || product.artisanInfo?.name}
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        ${parseFloat(product.retailPrice || 0).toFixed(2)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={product.designInfo?.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                        size="small"
                                        color={product.designInfo?.status === 'approved' ? 'success' : 'warning'}
                                        variant="outlined"
                                    />
                                    {product.cogData && (
                                        <Chip
                                            icon={<ThumbUpIcon />}
                                            label="COG"
                                            size="small"
                                            color="success"
                                            sx={{ ml: 1 }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {new Date(product.submittedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="View Details">
                                        <IconButton
                                            size="small"
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
                                            color="success"
                                            onClick={() => handleApprovalClick(product, 'approve')}
                                            disabled={actionLoading}
                                        >
                                            <ApproveIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject">
                                        <IconButton
                                            size="small"
                                            color="error"
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
            />
        </>
    );
}
