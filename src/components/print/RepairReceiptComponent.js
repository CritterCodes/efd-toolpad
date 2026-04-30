import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, List, ListItem } from '@mui/material';
import Barcode from 'react-barcode';

const PAPER = '#ffffff';
const INK = '#111111';
const MUTED = '#4b5563';
const BORDER = '#000000';
const ACCENT = '#d32f2f';
const SLIP_WIDTH = '3.7in';
const SLIP_HEIGHT = '5.7in';
const IMAGE_SIZE = 96;
const BARCODE_WIDTH = 0.62;
const BARCODE_HEIGHT = 11;
const BARCODE_FONT_SIZE = 5;
const REVIEW_QR_SIZE = 82;
const REVIEW_URL = 'https://g.page/r/CbpAai4DElTQEBE/review';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getReceiptItems = (repair) => {
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

const getReceiptLinePrice = (item, isWholesale) => {
  if (isWholesale) {
    return toNumber(item?.retailPrice ?? item?.finalSalePrice ?? item?.price);
  }

  return toNumber(item?.price ?? item?.retailPrice ?? item?.finalSalePrice);
};
const getItemQuantity = (item) => Math.max(toNumber(item?.quantity) || 1, 1);
const getReceiptLineTotal = (item, isWholesale) => getReceiptLinePrice(item, isWholesale) * getItemQuantity(item);
const isEngelFineDesignRepair = (repair) => {
  const storeId = String(repair?.storeId || '').trim().toLowerCase();
  const storeName = String(repair?.storeName || repair?.businessName || '').trim().toLowerCase();
  return storeId === 'engel-fine-design' || storeName === 'engel fine design';
};
const getWholesaleAccountKey = (repair) => repair?.storeId || repair?.submittedBy || repair?.createdBy || null;

const RepairReceiptComponent = ({ repair, fullPage = false }) => {
  const allItems = getReceiptItems(repair);
  const isWholesale = Boolean(repair?.isWholesale);
  const showReviewQr = !isWholesale && isEngelFineDesignRepair(repair);
  const reviewQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${REVIEW_QR_SIZE}x${REVIEW_QR_SIZE}&data=${encodeURIComponent(REVIEW_URL)}`;
  const [wholesaleBranding, setWholesaleBranding] = useState({ ticketLogoUrl: '', businessName: '' });
  const wholesaleAccountKey = useMemo(() => getWholesaleAccountKey(repair), [repair]);
  const displayedSubtotal = allItems.reduce(
    (sum, item) => sum + getReceiptLineTotal(item, isWholesale),
    0
  );
  const rushFee = toNumber(repair?.rushFee);
  const deliveryFee = toNumber(repair?.deliveryFee);
  const taxRate = toNumber(repair?.taxRate);
  const taxableBase = displayedSubtotal + rushFee + deliveryFee;
  const taxAmount = isWholesale
    ? Math.round(taxableBase * taxRate * 100) / 100
    : (repair?.includeTax ? toNumber(repair?.taxAmount) : 0);
  const displayedTotal = displayedSubtotal + rushFee + deliveryFee + taxAmount;

  useEffect(() => {
    let cancelled = false;

    const loadWholesaleBranding = async () => {
      if (!isWholesale || !wholesaleAccountKey) {
        setWholesaleBranding({ ticketLogoUrl: '', businessName: '' });
        return;
      }

      try {
        const response = await fetch(`/api/wholesale/account-settings?accountId=${encodeURIComponent(wholesaleAccountKey)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load wholesale branding');
        }

        if (!cancelled) {
          setWholesaleBranding({
            ticketLogoUrl: payload?.data?.ticketLogoUrl || '',
            businessName: payload?.data?.businessProfile?.businessName || repair?.storeName || repair?.businessName || ''
          });
        }
      } catch {
        if (!cancelled) {
          setWholesaleBranding({
            ticketLogoUrl: '',
            businessName: repair?.storeName || repair?.businessName || ''
          });
        }
      }
    };

    loadWholesaleBranding();

    return () => {
      cancelled = true;
    };
  }, [isWholesale, wholesaleAccountKey, repair?.storeName, repair?.businessName]);

  return (
    <Box
      className="print-slip"
      sx={{
        width: SLIP_WIDTH,
        minHeight: SLIP_HEIGHT,
        height: SLIP_HEIGHT,
        maxWidth: SLIP_WIDTH,
        maxHeight: SLIP_HEIGHT,
        padding: '4px',
        border: `1px solid ${BORDER}`,
        borderLeft: `0.5px dashed ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        boxSizing: 'border-box',
        backgroundColor: PAPER,
        color: INK,
        '@media print': {
          width: SLIP_WIDTH,
          minHeight: SLIP_HEIGHT,
          height: SLIP_HEIGHT,
          maxWidth: SLIP_WIDTH,
          maxHeight: SLIP_HEIGHT,
          padding: '4px',
          overflow: 'hidden',
          backgroundColor: `${PAPER} !important`,
          color: `${INK} !important`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {!isWholesale && (
            <img src="/logos/[efd]LogoBlack.png" alt="Logo" style={{ width: '34px', height: '17px', marginRight: '4px' }} />
          )}
          {isWholesale && wholesaleBranding.ticketLogoUrl && (
            <img
              src={wholesaleBranding.ticketLogoUrl}
              alt="Store logo"
              style={{ width: '34px', height: '18px', marginRight: '4px', objectFit: 'contain' }}
            />
          )}
          <Typography variant="h6" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: ACCENT }}>
            REPAIR RECEIPT
          </Typography>
        </Box>
        {isWholesale && wholesaleBranding.businessName && (
          <Typography
            sx={{
              fontSize: '0.44rem',
              fontWeight: 'bold',
              textAlign: 'right',
              maxWidth: '1.05in',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: INK
            }}
          >
            {wholesaleBranding.businessName}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex' }}>
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
        <Box sx={{ flex: 2, paddingLeft: '4px' }}>
          <Typography variant="body2" sx={{ fontSize: '0.52rem', fontWeight: 'bold', marginBottom: '1px', color: INK }}>
            {repair.clientName}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.43rem', marginBottom: '1px', color: INK }}>
            Received: {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'N/A'} | Due: {repair.promiseDate || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.43rem', marginBottom: '1px', color: INK }}>
            Metal: {repair.metalType || 'N/A'} {repair.karat}
          </Typography>
          {repair.isRing && (repair.currentRingSize || repair.desiredRingSize) && (
            <Typography variant="body2" sx={{ fontSize: '0.43rem', marginBottom: '1px', color: INK }}>
              Ring Size: {repair.currentRingSize || 'N/A'} -&gt; {repair.desiredRingSize || 'N/A'}
            </Typography>
          )}
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.43rem',
              marginBottom: '1px',
              color: INK,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical'
            }}
          >
            Desc: {repair.description}
          </Typography>
          {repair.smartIntakeInput && repair.smartIntakeInput !== repair.description && (
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.42rem',
                marginBottom: '1px',
                fontStyle: 'italic',
                color: MUTED,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              Request: {repair.smartIntakeInput}
            </Typography>
          )}
          {(repair.isRush || repair.includeDelivery) && (
            <Typography variant="body2" sx={{ fontSize: '0.43rem', fontWeight: 'bold', color: INK }}>
              {repair.isRush && <span>RUSH ORDER</span>}
              {repair.isRush && repair.includeDelivery && <span> | </span>}
              {repair.includeDelivery && <span>DELIVERY INCLUDED</span>}
            </Typography>
          )}
        </Box>
      </Box>

      <Typography variant="subtitle2" sx={{ fontSize: '0.48rem', fontWeight: 'bold', marginBottom: '2px', color: MUTED }}>
        Work Items:
      </Typography>

      <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
            <Typography variant="body2" sx={{ fontSize: '0.43rem', flex: 1, color: INK }}>
              {getItemQuantity(item)}x {item.title || item.displayName || item.name || item.description}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.43rem', fontWeight: 500, color: INK }}>
              {getItemQuantity(item) > 1
                ? `${getItemQuantity(item)} x $${getReceiptLinePrice(item, isWholesale).toFixed(2)} = $${getReceiptLineTotal(item, isWholesale).toFixed(2)}`
                : `$${getReceiptLineTotal(item, isWholesale).toFixed(2)}`}
            </Typography>
          </ListItem>
        ))}
      </List>

      <Box sx={{ marginTop: 'auto' }}>
        <Typography sx={{ fontSize: '0.43rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: INK }}>
          <span>Subtotal:</span>
          <span>${displayedSubtotal.toFixed(2)}</span>
        </Typography>
        <Typography sx={{ fontSize: '0.43rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: INK }}>
          <span>Rush Fee:</span>
          <span>${rushFee.toFixed(2)}</span>
        </Typography>
        <Typography sx={{ fontSize: '0.43rem', display: 'flex', justifyContent: 'space-between', marginBottom: '1px', color: INK }}>
          <span>Tax:</span>
          <span>${taxAmount.toFixed(2)}</span>
        </Typography>
        <Typography sx={{ fontSize: '0.52rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: INK }}>
          <span>Total:</span>
          <span>${displayedTotal.toFixed(2)}</span>
        </Typography>
      </Box>

      <Box
        sx={{
          mt: 0.5,
          px: 0.5,
          py: 0.5,
          border: `0.5px solid ${BORDER}`,
          borderRadius: '4px',
          display: 'flex',
          alignItems: showReviewQr ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: 0.5,
          backgroundColor: PAPER,
        }}
      >
        <Box sx={{ flex: 1, textAlign: showReviewQr ? 'left' : 'center' }}>
          <Typography variant="body2" sx={{ fontSize: '0.36rem', lineHeight: 1.25, color: INK }}>
            <strong>Important:</strong> This is an item receipt, not a payment receipt. Payment is due at pickup. Items not claimed within 90 days may be subject to storage fees.
          </Typography>
          {showReviewQr && (
            <Typography sx={{ fontSize: '0.36rem', color: MUTED, lineHeight: 1.25, mt: 0.25 }}>
              Leave us a review by scanning the QR code.
            </Typography>
          )}
          {!showReviewQr && (
            <Typography variant="body2" sx={{ fontSize: '0.42rem', color: MUTED }}>
              Thank you for trusting us with your jewelry
            </Typography>
          )}
        </Box>
        {showReviewQr && (
          <img
            src={reviewQrSrc}
            alt="Leave a review QR code"
            style={{ width: REVIEW_QR_SIZE, height: REVIEW_QR_SIZE, display: 'block', border: '1px solid #d1d5db', flexShrink: 0 }}
          />
        )}
      </Box>

      {!showReviewQr && (
        <Box
          sx={{
            textAlign: 'center',
            marginTop: '1px',
            height: 18,
            overflow: 'hidden',
            flexShrink: 0,
            '& svg': {
              maxWidth: '100%',
              height: '18px !important',
              display: 'block',
              margin: '0 auto'
            }
          }}
        >
          <Barcode
            value={repair.repairID}
            width={BARCODE_WIDTH}
            height={BARCODE_HEIGHT}
            displayValue={false}
            font={'monospace'}
            format={'CODE39'}
            fontSize={BARCODE_FONT_SIZE}
            margin={0}
          />
        </Box>
      )}
    </Box>
  );
};

export default RepairReceiptComponent;
