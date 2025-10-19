/**
 * Wholesale Repair Ticket
 * Printable repair ticket for jewelry store partners
 */

'use client';

import React from 'react';
import {
    Box,
    Button,
    Typography,
    Grid,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableRow
} from '@mui/material';
import {
    Print as PrintIcon,
    Close as CloseIcon
} from '@mui/icons-material';

export default function WholesaleRepairTicket({ repair, wholesaler, onClose }) {

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const generateRepairId = () => {
        // Generate a simple repair ID based on date and random number
        const date = new Date(repair.createdAt);
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `R${year}${month}${day}-${random}`;
    };

    return (
        <>
            <DialogTitle>
                Repair Ticket Preview
            </DialogTitle>
            
            <DialogContent>
                {/* Print Styles */}
                <style jsx global>{`
                    @media print {
                        * {
                            -webkit-print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        
                        body * {
                            visibility: hidden;
                        }
                        
                        .print-content, .print-content * {
                            visibility: visible;
                        }
                        
                        .print-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>

                <Paper 
                    className="print-content"
                    sx={{ 
                        p: 4, 
                        maxWidth: '8.5in', 
                        mx: 'auto',
                        bgcolor: 'white',
                        color: 'black',
                        fontFamily: 'monospace'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4, borderBottom: 2, borderColor: 'black', pb: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                            JEWELRY REPAIR TICKET
                        </Typography>
                        <Typography variant="h6">
                            Engel Fine Design
                        </Typography>
                        <Typography variant="body2">
                            Professional Jewelry Services
                        </Typography>
                    </Box>

                    {/* Repair Information */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6}>
                            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                                REPAIR DETAILS
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Repair ID:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {generateRepairId()}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Date Received:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {formatDate(repair.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Item Type:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {repair.itemType}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Repair Type:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {repair.repairType}
                                        </TableCell>
                                    </TableRow>
                                    {repair.promiseDate && (
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                                Promise Date:
                                            </TableCell>
                                            <TableCell sx={{ border: 'none', py: 0.5 }}>
                                                {formatDate(repair.promiseDate)}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Grid>
                        
                        <Grid item xs={6}>
                            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                                CUSTOMER INFO
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Name:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {repair.customerName}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Phone:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {repair.customerPhone}
                                        </TableCell>
                                    </TableRow>
                                    {repair.customerEmail && (
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                                Email:
                                            </TableCell>
                                            <TableCell sx={{ border: 'none', py: 0.5 }}>
                                                {repair.customerEmail}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                                            Store:
                                        </TableCell>
                                        <TableCell sx={{ border: 'none', py: 0.5 }}>
                                            {wholesaler?.name || 'Wholesale Partner'}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Grid>
                    </Grid>

                    {/* Description */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                            REPAIR DESCRIPTION
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.8, minHeight: '80px' }}>
                            {repair.description}
                        </Typography>
                    </Box>

                    {/* Special Instructions */}
                    {repair.specialInstructions && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                                SPECIAL INSTRUCTIONS
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.8, minHeight: '60px' }}>
                                {repair.specialInstructions}
                            </Typography>
                        </Box>
                    )}

                    {/* Work Areas */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                            WORK PERFORMED
                        </Typography>
                        <Box sx={{ minHeight: '120px', border: 1, borderColor: 'black', p: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                (To be filled in by technician)
                            </Typography>
                        </Box>
                    </Box>

                    {/* Pricing */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6}>
                            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                                PRICING
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            Labor:
                                        </TableCell>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            $________
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            Materials:
                                        </TableCell>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            $________
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1, fontWeight: 'bold' }}>
                                            TOTAL:
                                        </TableCell>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1, fontWeight: 'bold' }}>
                                            $________
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Grid>
                        
                        <Grid item xs={6}>
                            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'black', pb: 1, mb: 2 }}>
                                COMPLETION
                            </Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            Completed Date:
                                        </TableCell>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            ___________
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            Technician:
                                        </TableCell>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            ___________
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            Quality Check:
                                        </TableCell>
                                        <TableCell sx={{ border: 1, borderColor: 'black', py: 1 }}>
                                            ___________
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Grid>
                    </Grid>

                    {/* Footer */}
                    <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'black', textAlign: 'center' }}>
                        <Typography variant="caption">
                            This ticket serves as a record of repair services requested and performed.
                        </Typography>
                        <br />
                        <Typography variant="caption">
                            For questions or concerns, please contact Engel Fine Design.
                        </Typography>
                    </Box>
                </Paper>
            </DialogContent>

            <DialogActions className="no-print" sx={{ p: 3 }}>
                <Button 
                    onClick={onClose}
                    startIcon={<CloseIcon />}
                >
                    Close
                </Button>
                <Button 
                    onClick={handlePrint}
                    variant="contained"
                    startIcon={<PrintIcon />}
                >
                    Print Ticket
                </Button>
            </DialogActions>
        </>
    );
}