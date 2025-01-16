"use client";
import React, { useEffect } from 'react';
import { Box, Typography, Divider, List, ListItem, ListItemText, Checkbox } from '@mui/material';
import { useRepairs } from '@/app/context/repairs.context';
import { useParams } from 'next/navigation';
import Barcode from 'react-barcode';

const PrintRepairTicket = () => {
    const { repairs } = useRepairs();
    const params = useParams();
    const repairID = params.repairID;

    console.log("Params from URL:", params);
    console.log("Repairs from Context:", repairs);
    console.log("Repair ID to Search:", repairID);

    const repair = repairs.find(r => r.repairID === repairID);

    useEffect(() => {
        if (repair) {
            console.log("Repair Found:", repair);
            window.print();
        } else {
            console.warn("Repair Not Found! Check the repairID and context data.");
        }
    }, [repair]);

    if (!repair) {
        return <Typography>Error: Repair not found. Check the console for details.</Typography>;
    }

    return (
        <Box
            sx={{
                padding: '30px',
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
                },
            }}
        >
            <Divider textAlign="left">
            <img src="/logos/[efd]500x250.png" alt="Logo" style={{ width: '100px', height: '50px' }} /></Divider>
            {/* ✅ Section 1: Header (2 Columns) */}
            <Box sx={{ display: 'flex'}}>
                
                <Box>
                    <Typography variant="h6"><strong>{repair.clientName}</strong></Typography>
                    <Typography variant="body1"><strong>Due:</strong> {repair.promiseDate || 'N/A'}</Typography>
                    <Typography variant="body1"><strong>Metal Type:</strong> {repair.metalType || 'N/A'}</Typography>
                    <Typography variant="body1"><strong>Description:</strong> {repair.description}</Typography>
                </Box>
                
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

            {/* ✅ Section 2: Picture & Status Checkboxes */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                {/* Picture Column */}
                <Box sx={{ textAlign: 'center', flex: '1' }}>
                    {repair.picture && (
                        <img
                            src={repair.picture}
                            alt="Repair Image"
                            style={{
                                width: '150px',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px'
                            }}
                        />
                    )}
                </Box>

                {/* Status Column */}
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

            {/* ✅ Section 3: Repair Tasks */}
            
            <Box sx={{ textAlign: 'center' }}>
                    <Barcode 
                    value={repair.repairID} 
                    width={1} height={50} 
                    displayValue={true}
                    font={'monospace'}
                    format={'CODE39'}

                    />
                </Box>
        </Box>
    );
};

export default PrintRepairTicket;
