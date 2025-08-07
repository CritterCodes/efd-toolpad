import React from 'react';
import { Box, Typography, List, ListItem } from '@mui/material';
import Barcode from 'react-barcode';

const RepairTicketComponent = ({ repair }) => {
    const allItems = [
        ...(repair.tasks || []).map(item => ({ ...item, type: 'Task' })),
        ...(repair.processes || []).map(item => ({ ...item, type: 'Process' })),
        ...(repair.materials || []).map(item => ({ ...item, type: 'Material', isStullerItem: item.isStullerItem })),
        ...(repair.customLineItems || []).map(item => ({ ...item, type: 'Custom' })),
        ...(repair.repairTasks || []).map(item => ({ ...item, type: 'Legacy Task' }))
    ];

    return (
        <Box
            sx={{
                flex: 1,
                padding: '12px',
                border: '1px solid #000',
                borderRight: '0.5px dashed #000',
                display: 'flex',
                flexDirection: 'column',
                '@media print': {
                    border: '1px solid #000',
                    borderRight: '0.5px dashed #000',
                    padding: '10px',
                },
            }}
        >
            {/* Header */}
            <Box sx={{ textAlign: 'center', marginBottom: '12px' }}>
                <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '50px', height: '25px' }} />
                <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#d32f2f', marginTop: '4px' }}>
                    REPAIR TICKET
                </Typography>
            </Box>

            {/* Customer Info */}
            <Box sx={{ display: 'flex', marginBottom: '12px' }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    {repair.picture && (
                        <img
                            src={repair.picture}
                            alt="Repair"
                            style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '4px'
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ flex: 2, paddingLeft: '12px' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '3px' }}>
                        {repair.clientName}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', marginBottom: '1px' }}>
                        Due: {repair.promiseDate || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', marginBottom: '1px' }}>
                        Metal: {repair.metalType || 'N/A'} {repair.karat && `(${repair.karat})`}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', marginBottom: '1px' }}>
                        Desc: {repair.description}
                    </Typography>
                    {repair.isRush && (
                        <Typography variant="body2" sx={{ fontSize: '0.65rem', color: 'red', fontWeight: 'bold' }}>
                            🚨 DELIVERY REQUIRED
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Work Items */}
            <Typography variant="subtitle2" sx={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '6px' }}>
                Work Items:
            </Typography>
            
            <List dense disablePadding sx={{ flex: 1 }}>
                {allItems.map((item, index) => (
                    <ListItem
                        key={`ticket-item-${index}`}
                        sx={{
                            padding: '4px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <Typography variant="body2" sx={{ fontSize: '0.65rem', flex: 1 }}>
                            {item.quantity}x {item.title || item.name || item.description}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                            ${parseFloat(item.price || 0).toFixed(2)}
                        </Typography>
                    </ListItem>
                ))}
            </List>

            {/* Pricing */}
            <Box sx={{ marginTop: 'auto' }}>
                <Typography sx={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Subtotal:</span>
                    <span>${(repair.subtotal || repair.totalCost || 0).toFixed(2)}</span>
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Rush Fee:</span>
                    <span>$0.00</span>
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Delivery Fee:</span>
                    <span>$5.00</span>
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Tax (Wholesale Exempt):</span>
                    <span>$0.00</span>
                </Typography>
                {repair.isWholesale && (
                    <Typography sx={{ fontSize: '0.65rem', color: 'green', fontWeight: 'bold', marginBottom: '4px' }}>
                        Wholesale Client (50% off, Tax Exempt)
                    </Typography>
                )}
                <Typography sx={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total:</span>
                    <span>$25.53</span>
                </Typography>
            </Box>

            {/* Workflow initials */}
            <Box sx={{ margin: '8px 0 4px 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontWeight: 'bold' }}>
                <span>PO__________</span>
                <span>COMP__________</span>
                <span>QC__________</span>
            </Box>

            {/* Barcode */}
            <Box sx={{ textAlign: 'center', marginTop: '8px' }}>
                <Barcode
                    value={repair.repairID}
                    width={0.7}
                    height={15}
                    displayValue={true}
                    font={'monospace'}
                    format={'CODE39'}
                    fontSize={7}
                />
            </Box>
        </Box>
    );
};

export default RepairTicketComponent;
