import React from 'react';
import { Box, Typography } from '@mui/material';

const INK = '#111111';
const MUTED = '#4b5563';
const ACCENT = '#d32f2f';
export const WHOLESALE_SLIP_WIDTH = '3.75in';
export const WHOLESALE_SLIP_HEIGHT = '5.5in';
const QR_SIZE = 54;

const getQrSrc = (value) => `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&margin=0&data=${encodeURIComponent(value || '')}`;

function FieldRow({ label, value, minHeight = '0.4in' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.05, minHeight }}>
      <Typography sx={{ fontSize: '8.4pt', fontWeight: 700, whiteSpace: 'nowrap', color: MUTED }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '8.8pt',
          flex: 1,
          borderBottom: `1px solid ${INK}`,
          lineHeight: 1.2,
          minHeight: '0.2in',
          pl: value ? 0.08 : 0,
          color: INK,
        }}
      >
        {value || ''}
      </Typography>
    </Box>
  );
}

export default function WholesaleIntakeSlipComponent({
  wholesalerName,
  qrValue = '',
  borderTop = true,
  borderRight = true,
  borderBottom = true,
  borderLeft = true,
}) {
  return (
    <Box
      className="print-slip"
      sx={{
        width: WHOLESALE_SLIP_WIDTH,
        height: WHOLESALE_SLIP_HEIGHT,
        borderTop: borderTop ? `1px solid ${INK}` : 'none',
        borderRight: borderRight ? `1px solid ${INK}` : 'none',
        borderBottom: borderBottom ? `1px solid ${INK}` : 'none',
        borderLeft: borderLeft ? `1px solid ${INK}` : 'none',
        color: INK,
        backgroundColor: '#fff',
        p: '0.14in',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.1in',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: '0.08in', borderBottom: `1px solid ${INK}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <Box component="img" src="/logos/[efd]LogoBlack.png" alt="EFD logo" sx={{ width: '0.82in', height: '0.34in', objectFit: 'contain', mr: '0.08in' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '6.8pt', letterSpacing: 0.45, textTransform: 'uppercase', color: MUTED, lineHeight: 1 }}>
              Engel Fine Design
            </Typography>
            <Typography sx={{ fontSize: '12.5pt', fontWeight: 700, lineHeight: 1.05, color: ACCENT }}>
              Repair Intake
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '7pt', color: MUTED, textAlign: 'right', maxWidth: '1.05in', lineHeight: 1.15 }}>
          Wholesale
        </Typography>
      </Box>

      <FieldRow label="Store name" value={wholesalerName} minHeight="0.4in" />
      <FieldRow label="Client name" />
      <FieldRow label="Client number" />

      <Box sx={{ pt: '0.02in' }}>
        <Typography sx={{ fontSize: '8.4pt', fontWeight: 700, mb: '0.04in', color: MUTED }}>
          Metal type, color, karat
        </Typography>
        <Typography sx={{ fontSize: '8.8pt', borderBottom: `1px solid ${INK}`, minHeight: '0.26in' }}>
          {' '}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, pt: '0.01in' }}>
        <Typography sx={{ fontSize: '8.4pt', fontWeight: 700, mb: '0.04in', color: MUTED }}>
          Work order request
        </Typography>
        <Box sx={{ display: 'grid', gap: '0.12in' }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Box key={index} sx={{ borderBottom: `1px solid ${INK}`, minHeight: '0.16in' }} />
          ))}
        </Box>
      </Box>

      <Box sx={{ pt: '0.05in', borderTop: `1px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.08in' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '7pt', fontWeight: 700, color: INK, lineHeight: 1.15 }}>
            Scan to create repair
          </Typography>
          <Typography sx={{ fontSize: '6.6pt', color: MUTED, lineHeight: 1.15 }}>
            Opens intake preset for this store
          </Typography>
        </Box>
        {qrValue ? (
          <Box component="img" src={getQrSrc(qrValue)} alt={`QR for ${wholesalerName || 'store'}`} sx={{ width: QR_SIZE, height: QR_SIZE, flexShrink: 0 }} />
        ) : null}
      </Box>
    </Box>
  );
}
