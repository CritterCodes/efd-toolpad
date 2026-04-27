import React from 'react';
import { Box, Typography, List, ListItem } from '@mui/material';
import Barcode from 'react-barcode';

const PAPER = '#ffffff';
const INK = '#111111';
const MUTED = '#4b5563';
const BORDER = '#000000';
const ACCENT = '#d32f2f';
const IMAGE_SIZE = 108;
const BARCODE_WIDTH = 0.85;
const BARCODE_HEIGHT = 16;
const BARCODE_FONT_SIZE = 7;

const getTicketItems = (repair) => {
  const formalItems = [
    ...(repair.tasks || []).map((item) => ({ ...item, type: 'Task' })),
    ...(repair.processes || []).map((item) => ({ ...item, type: 'Process' })),
    ...(repair.materials || []).map((item) => ({ ...item, type: 'Material', isStullerItem: item.isStullerItem })),
    ...(repair.customLineItems || []).map((item) => ({ ...item, type: 'Custom' })),
    ...(repair.repairTasks || []).map((item) => ({ ...item, type: 'Legacy Task' }))
  ];

  return formalItems.length > 0
    ? formalItems
    : [
        ...(repair.repairType ? [{ quantity: 1, title: repair.repairType, price: 0, type: 'Intake' }] : []),
        ...(repair.specialInstructions ? [{ quantity: 1, title: repair.specialInstructions, price: 0, type: 'Note' }] : [])
      ];
};

const getItemDisplayPrice = (item) => Number(item?.price || 0);
const getItemQuantity = (item) => Math.max(Number(item?.quantity) || 1, 1);
const getItemLineTotal = (item) => getItemDisplayPrice(item) * getItemQuantity(item);

const RepairTicketComponent = ({ repair }) => {
  const allItems = getTicketItems(repair);
  const storeName = repair.storeName || repair.businessName || 'Engel Fine Design';
  const displayedSubtotal = allItems.reduce((sum, item) => sum + getItemLineTotal(item), 0);
  const rushFee = Number(repair?.rushFee || 0);
  const deliveryFee = Number(repair?.deliveryFee || 0);
  const taxAmount = Number(repair?.taxAmount || 0);
  const displayedTotal = displayedSubtotal + rushFee + deliveryFee + taxAmount;

  return (
    <Box
      sx={{
        width: '3.75in',
        height: '5.75in',
        maxWidth: '3.75in',
        maxHeight: '5.75in',
        padding: '6px',
        border: `1px solid ${BORDER}`,
        borderRight: `0.5px dashed ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        backgroundColor: PAPER,
        color: INK,
        '@media print': {
          width: '3.75in',
          height: '5.75in',
          maxWidth: '3.75in',
          maxHeight: '5.75in',
          padding: '6px',
          overflow: 'hidden',
          backgroundColor: `${PAPER} !important`,
          color: `${INK} !important`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '40px', height: '20px', marginRight: '6px' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: ACCENT }}>
            REPAIR TICKET
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 'bold', textAlign: 'right', maxWidth: '1.5in', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: INK }}>
          {storeName}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', marginBottom: '2px' }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          {repair.picture && (
            <img
              src={repair.picture}
              alt="Repair"
              style={{
                width: `${IMAGE_SIZE}px`,
                height: `${IMAGE_SIZE}px`,
                objectFit: 'cover',
                borderRadius: '3px'
              }}
            />
          )}
        </Box>
        <Box sx={{ flex: 2, paddingLeft: '6px' }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '1px', color: INK }}>
            {repair.clientName}
          </Typography>
          <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', color: INK }}>
            Recv: {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'N/A'} | Due: {repair.promiseDate || 'N/A'}
          </Typography>
          <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', color: INK }}>
            Metal: {repair.metalType || 'N/A'} {repair.karat}
          </Typography>
          {repair.isRing && (repair.currentRingSize || repair.desiredRingSize) && (
            <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', color: INK }}>
              Size: {repair.currentRingSize || 'N/A'} -&gt; {repair.desiredRingSize || 'N/A'}
            </Typography>
          )}
          <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', color: INK, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
            {repair.description}
          </Typography>
          {repair.smartIntakeInput && repair.smartIntakeInput !== repair.description && (
            <Typography sx={{ fontSize: '0.55rem', marginBottom: '1px', fontStyle: 'italic', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Request: {repair.smartIntakeInput}
            </Typography>
          )}
          {(repair.isRush || repair.includeDelivery) && (
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 'bold', color: INK }}>
              {repair.isRush && <span>RUSH</span>}
              {repair.isRush && repair.includeDelivery && <span> | </span>}
              {repair.includeDelivery && <span>DELIVERY</span>}
            </Typography>
          )}
          <Box sx={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', fontWeight: 'bold', color: INK }}>
            <span>PO______</span>
            <span>COMP______</span>
            <span>C&amp;P______</span>
            <span>QC______</span>
          </Box>
        </Box>
      </Box>

      <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold', marginBottom: '2px', marginTop: '2px', color: MUTED }}>
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
              alignItems: 'flex-start',
              gap: 1,
              color: INK
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.55rem', color: INK }}>
                {getItemQuantity(item)}x {item.title || item.displayName || item.name || item.description}
              </Typography>
              <Typography sx={{ fontSize: '0.47rem', color: MUTED }}>
                Bench ____  C&amp;P ____
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.55rem', fontWeight: 500, color: INK, whiteSpace: 'nowrap' }}>
              {getItemQuantity(item) > 1
                ? `${getItemQuantity(item)} x $${getItemDisplayPrice(item).toFixed(2)} = $${getItemLineTotal(item).toFixed(2)}`
                : `$${getItemLineTotal(item).toFixed(2)}`}
            </Typography>
          </ListItem>
        ))}
      </List>

      <Box sx={{ marginTop: 'auto', borderTop: '0.5px solid #ccc', paddingTop: '2px' }}>
        <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between', color: INK }}>
          <span>Subtotal:</span>
          <span>${displayedSubtotal.toFixed(2)}</span>
        </Typography>
        {(repair.rushFee > 0) && (
          <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between', color: INK }}>
            <span>Rush Fee:</span>
            <span>${rushFee.toFixed(2)}</span>
          </Typography>
        )}
        {(repair.deliveryFee > 0) && (
          <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between', color: INK }}>
            <span>Delivery Fee:</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.55rem', display: 'flex', justifyContent: 'space-between', color: INK }}>
          <span>Tax{repair.isWholesale ? ' (Exempt)' : ''}:</span>
          <span>${taxAmount.toFixed(2)}</span>
        </Typography>
        {repair.isWholesale && (
          <Typography sx={{ fontSize: '0.5rem', color: MUTED, fontWeight: 'bold' }}>
            Wholesale ticket
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '1px', color: INK }}>
          <span>Total:</span>
          <span>${displayedTotal.toFixed(2)}</span>
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', marginTop: '4px' }}>
        <Barcode
          value={repair.repairID}
          width={BARCODE_WIDTH}
          height={BARCODE_HEIGHT}
          displayValue={true}
          font={'monospace'}
          format={'CODE39'}
          fontSize={BARCODE_FONT_SIZE}
          margin={2}
        />
      </Box>
    </Box>
  );
};

export default RepairTicketComponent;
