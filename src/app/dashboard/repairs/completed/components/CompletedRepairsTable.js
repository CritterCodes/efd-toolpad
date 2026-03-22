import React from 'react';
import {
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Chip,
    Stack,
    IconButton,
    Collapse,
    Box
} from '@mui/material';
import {
    Visibility as ViewIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { getStatusLabel, getStatusColor, formatDate, formatCurrency } from './utils';

export const CompletedRepairsTable = ({
    repairs,
    isMobile,
    expandedRows,
    toggleRowExpansion,
    handleViewRepair
}) => {
    return (
        <TableContainer component={Paper}>
            <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                    <TableRow>
                        <TableCell>Repair #</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell>Completed</TableCell>
                        {!isMobile && <TableCell>Total Cost</TableCell>}
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {repairs.map((repair) => (
                        <React.Fragment key={repair._id}>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        #{repair.repairNumber}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {repair.clientFirstName} {repair.clientLastName}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={getStatusLabel(repair.status)}
                                        color={getStatusColor(repair.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                <TableCell>{formatDate(repair.completedDate || repair.updatedAt)}</TableCell>
                                {!isMobile && (
                                    <TableCell>{formatCurrency(repair.totalCost)}</TableCell>
                                )}
                                <TableCell align="center">
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleViewRepair(repair._id)}
                                            title="View Details"
                                        >
                                            <ViewIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => toggleRowExpansion(repair._id)}
                                            title="Show Details"
                                        >
                                            {expandedRows.has(repair._id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                    <Collapse in={expandedRows.has(repair._id)} timeout="auto" unmountOnExit>
                                        <Box sx={{ margin: 1 }}>
                                            <Typography variant="h6" gutterBottom component="div">
                                                Repair Details
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Item Description:</strong> {repair.repairDescription || repair.itemDescription || 'No description'}
                                            </Typography>
                                            {repair.notes && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    <strong>Notes:</strong> {repair.notes}
                                                </Typography>
                                            )}
                                            {isMobile && repair.totalCost && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    <strong>Total Cost:</strong> {formatCurrency(repair.totalCost)}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
