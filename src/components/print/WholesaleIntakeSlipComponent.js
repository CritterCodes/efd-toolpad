import React from 'react';
import { Box, Typography } from '@mui/material';

const FIELD_LINE = '________________________________';
export const WHOLESALE_SLIP_WIDTH = '3.55in';
export const WHOLESALE_SLIP_HEIGHT = '5.2in';

function FieldRow({ label, value, minHeight = '0.42in' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.08, minHeight }}>
      <Typography sx={{ fontSize: '9pt', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '9pt', flex: 1, borderBottom: '1px solid #111', lineHeight: 1.2, minHeight: '0.22in', pl: value ? 0.15 : 0 }}>
        {value || ''}
      </Typography>
    </Box>
  );
}

export default function WholesaleIntakeSlipComponent({ wholesalerName }) {
  return (
    <Box
      className="print-slip"
      sx={{
        width: WHOLESALE_SLIP_WIDTH,
        height: WHOLESALE_SLIP_HEIGHT,
        border: '1px solid #111',
        color: '#111',
        backgroundColor: '#fff',
        p: '0.16in',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.12in',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ borderBottom: '1px solid #111', pb: '0.1in' }}>
        <Typography sx={{ fontSize: '8pt', letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Engel Fine Design
        </Typography>
        <Typography sx={{ fontSize: '13pt', fontWeight: 700, lineHeight: 1.15 }}>
          Wholesale Repair Intake
        </Typography>
      </Box>

      <FieldRow label="Store name" value={wholesalerName} minHeight="0.44in" />
      <FieldRow label="Client name" />
      <FieldRow label="Client number" />

      <Box sx={{ pt: '0.02in' }}>
        <Typography sx={{ fontSize: '9pt', fontWeight: 700, mb: '0.06in' }}>
          Metal type, color, karat
        </Typography>
        <Typography sx={{ fontSize: '9pt', borderBottom: '1px solid #111', minHeight: '0.3in' }}>
          {' '}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, pt: '0.03in' }}>
        <Typography sx={{ fontSize: '9pt', fontWeight: 700, mb: '0.06in' }}>
          Work order request
        </Typography>
        <Box sx={{ display: 'grid', gap: '0.13in' }}>
          {[FIELD_LINE, FIELD_LINE, FIELD_LINE, FIELD_LINE, FIELD_LINE].map((line, index) => (
            <Typography key={index} sx={{ fontSize: '9pt', lineHeight: 1, letterSpacing: 0.3 }}>
              {line}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
