"use client";
import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

// ✅ Correctly forward the ref for external usage
const PrintRepairTicket = React.forwardRef((props, ref) => {
    const { repair } = props;

    if (!repair) {
        return <Typography>Loading repair data...</Typography>;
    }

    return (
        <Box
            ref={ref} // ✅ Correct usage for external ref
            sx={{
                padding: '20px',
                maxWidth: '800px',
                margin: '0 auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                '@media print': {
                    boxShadow: 'none',
                    border: 'none',
                    padding: '0',
                },
            }}
        >
            {/* ✅ Header Section */}
            <Typography variant="h4" align="center" gutterBottom>
                Repair Ticket
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* ✅ Client Information Section */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6"><strong>Client Name:</strong> {repair.clientName}</Typography>
                <Typography><strong>Promise Date:</strong> {repair.promiseDate || 'N/A'}</Typography>
                <Typography><strong>Metal Type:</strong> {repair.metalType || 'N/A'}</Typography>
            </Box>

            {/* ✅ Image Section */}
            {repair.picture && (
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <img
                        src={repair.picture}
                        alt="Repair Image"
                        style={{ maxWidth: '100%', borderRadius: '8px' }}
                    />
                </Box>
            )}

            {/* ✅ Repair Tasks Section */}
            <Typography variant="h6" gutterBottom>Repair Tasks</Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Price</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {repair.repairTasks.map((task, index) => (
                        <TableRow key={index}>
                            <TableCell>{task.title}</TableCell>
                            <TableCell>${parseFloat(task.price).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* ✅ Cost Summary Section */}
            <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Typography variant="h5">
                    <strong>Total Cost:</strong> ${repair.cost?.toFixed(2) || 'N/A'}
                </Typography>
            </Box>
        </Box>
    );
});

PrintRepairTicket.displayName = 'PrintRepairTicket'; // ✅ Required for debugging in dev tools
export default PrintRepairTicket;
