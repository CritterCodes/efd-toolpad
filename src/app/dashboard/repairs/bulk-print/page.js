"use client";
import React, { useEffect } from 'react';
import { Box, Typography, Divider, List, ListItem, ListItemText, Checkbox } from '@mui/material';
import { useRepairs } from '@/app/context/repairs.context';
import Barcode from 'react-barcode';

const PrintRepairTicketsBulk = () => {
    const { repairs } = useRepairs();

    // Filter only "RECEIVING" status repairs
    const receivingRepairs = repairs.filter(r => r.status === "RECEIVING");

    useEffect(() => {
        if (receivingRepairs.length > 0) {
            window.print();  // Automatically trigger print when page loads
        } else {
            console.warn("No repairs with status 'RECEIVING' to print.");
        }
    }, [receivingRepairs]);

    if (receivingRepairs.length === 0) {
        return <Typography>No repairs with status &quot;RECEIVING&quot; found.</Typography>;
    }

    return (
        <Box
            sx={{
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                justifyContent: 'center',
                '@media print': {
                    boxShadow: 'none',
                    border: 'none',
                },
            }}
        >
            {receivingRepairs.map((repair, index) => (
                <Box
                    key={index}
                    sx={{
                        padding: '20px',
                        width: '4in',
                        height: '6in',
                        margin: '0 auto',
                        border: '1px solid #000',
                        borderRadius: '8px',
                        boxShadow: '0 0 5px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        '@media print': {
                            boxShadow: 'none',
                            border: 'none',
                            breakBefore: 'page',  /* ✅ Forces page break before each repair */
                            pageBreakBefore: 'always', /* ✅ Legacy support */
                        },
                    }}
                >
                    {/* Logo Section */}
                    <Divider textAlign="left">
                        <img src="/logos/[efd]500x250.png" alt="Logo" style={{ width: '100px', height: '50px' }} />
                    </Divider>

                    {/* Header Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6"><strong>{repair.clientName}</strong></Typography>
                            {repair.isWholesale && repair.businessName && (
                                <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                                    {repair.businessName}
                                </Typography>
                            )}
                            <Typography variant="body1"><strong>Due:</strong> {repair.promiseDate || 'N/A'}</Typography>
                            <Typography variant="body1"><strong>Metal Type:</strong> {repair.metalType || 'N/A'}</Typography>
                            <Typography variant="body1"><strong>Description:</strong> {repair.description}</Typography>
                        </Box>

                        {/* Task List Section */}
                        <Box sx={{ paddingLeft: '20px' }}>
                            <Typography variant="body2"><strong>Tasks:</strong></Typography>
                            <List dense disablePadding sx={{ paddingTop: '4px' }}>
                                {repair.repairTasks.map((task, index) => (
                                    <ListItem key={index} sx={{ padding: '2px 0' }}>
                                        <ListItemText primary={`${task.qty}x ${task.title}`} />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Box>
                    <Divider />

                    {/* Picture & Status Checkboxes Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        {/* Picture Section */}
                        <Box sx={{ textAlign: 'center', flex: '1' }}>
                            {repair.picture ? (
                                <img
                                    src={repair.picture}
                                    alt="Repair Image"
                                    style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
                                />
                            ) : (
                                <Typography>No Image Available</Typography>
                            )}
                        </Box>

                        {/* Status Checklist Section */}
                        <Box sx={{ flex: '1' }}>
                            {["Needs Parts", "Parts Ordered", "Ready for Work", "QC"].map((status, index) => (
                                <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Checkbox />
                                    <Typography variant="body2">{status}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Divider />

                    {/* Barcode Section */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Barcode
                            value={repair.repairID}
                            width={1}
                            height={50}
                            displayValue={true}
                            font={'monospace'}
                            format={'CODE128'}
                        />
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default PrintRepairTicketsBulk;
