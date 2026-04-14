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

    const storeName = repair.storeName || repair.businessName || 'Engel Fine Design';

    return (
        <Box
            sx={{
                width: '3.75in',
                height: '5.75in',
                maxWidth: '3.75in',
                maxHeight: '5.75in',
                padding: '6px',
                border: '1px solid #000',
                borderRight: '0.5px dashed #000',
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '40px', height: '20px', marginRight: '6px' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#d32f2f' }}>
                        REPAIR TICKET
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.55rem', fontWeight: 'bold', textAlign: 'right', maxWidth: '1.5in', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {storeName}
                </Typography>
            </Box>

            {/* Customer Info */}
            <Box sx={{ display: 'flex', marginBottom: '2px' }}>
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
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '1px' }}>
                        {repair.clientName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px' }}>
                        Recv: {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'N/A'} | Due: {repair.promiseDate || 'N/A'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px' }}>
                        Metal: {repair.metalType || 'N/A'} {repair.karat}
                    </Typography>
                    {repair.isRing && (repair.currentRingSize || repair.desiredRingSize) && (
                        <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px' }}>
                            Size: {repair.currentRingSize || 'N/A'} → {repair.desiredRingSize || 'N/A'}
                        </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {repair.description}
                    </Typography>
                    {repair.smartIntakeInput && (
                        <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Request: {repair.smartIntakeInput}
                        </Typography>
                    )}
                    {(repair.isRush || repair.includeDelivery) && (
                        <Typography sx={{ fontSize: '0.55rem', fontWeight: 'bold' }}>
                            {repair.isRush && <span style={{ color: 'red' }}>🚨 RUSH</span>}
                            {repair.isRush && repair.includeDelivery && <span> | </span>}
                            {repair.includeDelivery && <span style={{ color: 'blue' }}>🔷 DELIVERY</span>}
                        </Typography>
                    )}
                    {/* Workflow initials */}
                    <Box sx={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', fontWeight: 'bold' }}>
                        <span>PO______</span>
                        <span>COMP______</span>
                        <span>QC______</span>
                    </Box>
                </Box>
            </Box>

            {/* Work Items */}
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold', marginBottom: '2px', marginTop: '2px' }}>
                Work Items:
            </Typography>

            <List dense disablePadding sx={{ flex: 1 }}>
                {allItems.map((item, index) => (
                    <ListItem
                        key={`ticket-item-${index}`}
                        sx={{
                            padding: '1px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <Typography sx={{ fontSize: '0.55rem', flex: 1 }}>
                            {item.quantity}x {item.title || item.displayName || item.name || item.description}
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', fontWeight: 500 }}>
                            ${parseFloat(item.price || 0).toFixed(2)}
                        </Typography>
                    </ListItem>
                ))}
            </List>

            {/* Pricing */}
            <Box sx={{ marginTop: 'auto', borderTop: '0.5px solid #ccc', paddingTop: '2px' }}>
                <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>${(repair.subtotal || 0).toFixed(2)}</span>
                </Typography>
                {(repair.rushFee > 0) && (
                    <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Rush Fee:</span>
                        <span>${(repair.rushFee || 0).toFixed(2)}</span>
                    </Typography>
                )}
                {(repair.deliveryFee > 0) && (
                    <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Delivery Fee:</span>
                        <span>${(repair.deliveryFee || 0).toFixed(2)}</span>
                    </Typography>
                )}
                <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax{repair.isWholesale ? ' (Exempt)' : ''}:</span>
                    <span>${(repair.taxAmount || 0).toFixed(2)}</span>
                </Typography>
                {repair.isWholesale && (
                    <Typography sx={{ fontSize: '0.5rem', color: 'green', fontWeight: 'bold' }}>
                        Wholesale (50% off, Tax Exempt)
                    </Typography>
                )}
                <Typography sx={{ fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '1px' }}>
                    <span>Total:</span>
                    <span>${(repair.totalCost || 0).toFixed(2)}</span>
                </Typography>
            </Box>
            {/* Barcode */}
            <Box sx={{ textAlign: 'center', marginTop: '4px' }}>
                <Barcode
                    value={repair.repairID}
                    width={0.6}
                    height={12}
                    displayValue={true}
                    font={'monospace'}
                    format={'CODE39'}
                    fontSize={6}
                />
            </Box>
        </Box>
    );
};

export default RepairTicketComponent;
