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
                <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '50px', height: '25px' }} /></Divider>
            {/* ✅ Section 1: Header (2 Columns) */}
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

                <Box sx={{ flex: '2', paddingLeft: '20px' }}>
                    <Typography variant="h6"><strong>{repair.clientName}</strong></Typography>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.7rem' }}><strong>Due:</strong> {repair.promiseDate || 'N/A'}</Typography>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.7rem' }}><strong>Metal Type:</strong> {repair.metalType || 'N/A'}</Typography>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.7rem' }}><strong>Description:</strong> {repair.description}</Typography>
                </Box>
            </Box>


            <Divider textAlign="left">
                <Typography sx={{ fontSize: '0.75rem' }}><strong>Tasks:</strong></Typography>
            </Divider>

            {/* ✅ Section 2: Picture & Status Checkboxes */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>

                <Box sx={{ paddingLeft: '16px' }}>
                    <List
                        dense
                        disablePadding
                        sx={{
                            paddingTop: '8px',
                        }}
                    >
                        {repair.repairTasks.map((task, index) => (
                            <ListItem
                                key={index}
                                sx={{
                                    padding: '6px 8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: index !== repair.repairTasks.length - 1 ? '1px solid #e0e0e0' : 'none', // Divider between tasks
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 500,
                                            fontSize: '0.9rem',
                                            color: '#333',
                                        }}
                                    >
                                        {task.quantity}x
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        whiteSpace={'normal'}
                                        sx={{
                                            fontSize: '0.85rem',
                                            color: '#555',
                                        }}
                                    >
                                        {task.title}
                                    </Typography>
                                </Box>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: '0.85rem',
                                        paddingLeft: '25px',
                                    }}
                                >
                                    ${task.price}
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                </Box>



            </Box>


            <Divider textAlign='right'><Typography sx={{ fontSize: '.75rem' }} ><strong>Total: ${repair.totalCost}</strong></Typography></Divider>

            {/* ✅ Section 3: Repair Tasks */}

            <Box sx={{ textAlign: 'center' }}>
                <Barcode
                    value={repair.repairID}
                    width={.75} height={37.5}
                    displayValue={true}
                    font={'monospace'}
                    format={'CODE39'}
                    fontSize={12}
                />
            </Box>
        </Box>
    );
};

export default PrintRepairTicket;
