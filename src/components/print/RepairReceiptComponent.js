import React from 'react';
import { Box, Typography, List, ListItem } from '@mui/material';
import Barcode from 'react-barcode';

const RepairReceiptComponent = ({ repair }) => {
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
                borderLeft: '0.5px dashed #000',
                display: 'flex',
                flexDirection: 'column',
                '@media print': {
                    border: '1px solid #000',
                    borderLeft: '0.5px dashed #000',
                    padding: '10px',
                },
            }}
        >
            {/* Header */}
            <Box sx={{ textAlign: 'center', marginBottom: '12px' }}>
                <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '50px', height: '25px' }} />
                <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
                    ITEM RECEIPT
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.65rem', color: '#666' }}>
                    Thank you for trusting us with your jewelry
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
                        ID: {repair.repairID}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', marginBottom: '1px' }}>
                        Date: {new Date().toLocaleDateString()}
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
                        key={`receipt-item-${index}`}
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
                    <span>$10.27</span>
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

            {/* Important notice instead of workflow */}
            <Box sx={{ marginTop: '8px', padding: '6px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <Typography variant="body2" sx={{ fontSize: '0.55rem', lineHeight: 1.4 }}>
                    <strong>Important:</strong> This is an item receipt, not a payment receipt. 
                    Payment is due at pickup. Items not claimed within 90 days may be subject to storage fees.
                </Typography>
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

export default RepairReceiptComponent;
