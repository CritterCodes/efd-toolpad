import React from 'react';
import { Box, Typography, List, ListItem } from '@mui/material';
import Barcode from 'react-barcode';

const RepairReceiptComponent = ({ repair }) => {
    const formalItems = [
        ...(repair.tasks || []).map(item => ({ ...item, type: 'Task' })),
        ...(repair.processes || []).map(item => ({ ...item, type: 'Process' })),
        ...(repair.materials || []).map(item => ({ ...item, type: 'Material', isStullerItem: item.isStullerItem })),
        ...(repair.customLineItems || []).map(item => ({ ...item, type: 'Custom' })),
        ...(repair.repairTasks || []).map(item => ({ ...item, type: 'Legacy Task' }))
    ];

    // Fallback for wholesale repairs that only have itemType/repairType
    const allItems = formalItems.length > 0 ? formalItems : [
        ...(repair.repairType ? [{ quantity: 1, title: repair.repairType, price: 0, type: 'Intake' }] : []),
        ...(repair.specialInstructions ? [{ quantity: 1, title: repair.specialInstructions, price: 0, type: 'Note' }] : [])
    ];

    return (
        <Box
            sx={{
                width: '3.75in',
                height: '5.75in',
                maxWidth: '3.75in',
                maxHeight: '5.75in',
                padding: '6px',
                border: '1px solid #000',
                borderLeft: '0.5px dashed #000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box',
                '@media print': {
                    width: '3.75in',
                    height: '5.75in',
                    maxWidth: '3.75in',
                    maxHeight: '5.75in',
                    padding: '6px',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '40px', height: '20px', marginRight: '6px' }} />
                <Typography variant="h6" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#d32f2f' }}>
                    REPAIR RECEIPT
                </Typography>
            </Box>

            {/* Customer Info */}
            <Box sx={{ display: 'flex'}}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    {repair.picture && (
                        <img
                            src={repair.picture}
                            alt="Repair"
                            style={{
                                width: '90px',
                                height: '90px',
                                objectFit: 'cover',
                                borderRadius: '3px'
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ flex: 2, paddingLeft: '6px' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '1px' }}>
                        {repair.clientName}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.6rem', marginBottom: '1px' }}>
                        Received: {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'N/A'} | Due: {repair.promiseDate || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.6rem', marginBottom: '1px' }}>
                        Metal: {repair.metalType || 'N/A'} {repair.karat}
                    </Typography>
                    {repair.isRing && (repair.currentRingSize || repair.desiredRingSize) && (
                        <Typography variant="body2" sx={{ fontSize: '0.6rem', marginBottom: '1px' }}>
                            Ring Size: {repair.currentRingSize || 'N/A'} → {repair.desiredRingSize || 'N/A'}
                        </Typography>
                    )}
                    <Typography variant="body2" sx={{ fontSize: '0.6rem', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                        Desc: {repair.description}
                    </Typography>
                    {repair.smartIntakeInput && repair.smartIntakeInput !== repair.description && (
                        <Typography variant="body2" sx={{ fontSize: '0.55rem', marginBottom: '1px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            Request: {repair.smartIntakeInput}
                        </Typography>
                    )}
                    {(repair.isRush || repair.includeDelivery) && (
                        <Typography variant="body2" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
                            {repair.isRush && <span style={{ color: 'red' }}>🚨 RUSH ORDER</span>}
                            {repair.isRush && repair.includeDelivery && <span> | </span>}
                            {repair.includeDelivery && <span style={{ color: 'blue' }}>🔷 DELIVERY INCLUDED</span>}
                        </Typography>
                    )}
                </Box>
            </Box>
            {/* Work Items */}
            <Typography variant="subtitle2" sx={{ fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px' }}>
                Work Items:
            </Typography>

            <List dense disablePadding sx={{ flex: 1 }}>
                {allItems.map((item, index) => (
                    <ListItem
                        key={`receipt-item-${index}`}
                        sx={{
                            padding: '1px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <Typography variant="body2" sx={{ fontSize: '0.6rem', flex: 1 }}>
                            {item.quantity}x {item.title || item.displayName || item.name || item.description}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.6rem', fontWeight: 500 }}>
                            ${parseFloat(item.price || 0).toFixed(2)}
                        </Typography>
                    </ListItem>
                ))}
            </List>

            {/* Important notice instead of workflow */}
            <Box sx={{ textAlign: 'center', marginTop: '6px', padding: '4px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <Typography variant="body2" sx={{ fontSize: '0.5rem', lineHeight: 1.3 }}>
                    <strong>Important:</strong> This is an item receipt, not a payment receipt.
                    Payment is due at pickup. Items not claimed within 90 days may be subject to storage fees.
                </Typography>

                <Typography variant="body2" sx={{ fontSize: '0.55rem', color: '#666' }}>
                    Thank you for trusting us with your jewelry
                </Typography>
            </Box>
            {/* Pricing */}
            <Box sx={{ marginTop: 'auto' }}>
                <Typography sx={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>Subtotal:</span>
                    <span>${(repair.subtotal || 0).toFixed(2)}</span>
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>Rush Fee:</span>
                    <span>${(repair.rushFee || 0).toFixed(2)}</span>
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>Delivery Fee:</span>
                    <span>${(repair.deliveryFee || 0).toFixed(2)}</span>
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span>Tax {repair.isWholesale ? '(Wholesale Exempt)' : ''}:</span>
                    <span>${(repair.taxAmount || 0).toFixed(2)}</span>
                </Typography>
                {repair.isWholesale && (
                    <Typography sx={{ fontSize: '0.65rem', color: 'green', fontWeight: 'bold', marginBottom: '4px' }}>
                        Wholesale Client (50% off, Tax Exempt)
                    </Typography>
                )}
                <Typography sx={{ fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total:</span>
                    <span>${(repair.totalCost || 0).toFixed(2)}</span>
                </Typography>
            </Box>


            {/* Barcode */}
            <Box sx={{ textAlign: 'center', marginTop: '4px' }}>
                <Barcode
                    value={repair.repairID}
                    width={1.5}
                    height={40}
                    displayValue={true}
                    font={'monospace'}
                    format={'CODE39'}
                    fontSize={9}
                />
            </Box>
        </Box>
    );
};

export default RepairReceiptComponent;
