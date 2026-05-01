import React from 'react';
import { Box, Typography } from '@mui/material';

const FIELD_LINE = '________________________________';

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
        width: '3.6in',
        height: '5.5in',
        border: '1px solid #111',
        color: '#111',
        backgroundColor: '#fff',
        p: '0.18in',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.14in',
      }}
    >
      <Box sx={{ borderBottom: '1px solid #111', pb: '0.12in' }}>
        <Typography sx={{ fontSize: '8pt', letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Engel Fine Design
        </Typography>
        <Typography sx={{ fontSize: '14pt', fontWeight: 700, lineHeight: 1.15 }}>
          Wholesale Repair Intake
        </Typography>
      </Box>

      <FieldRow label="Store name" value={wholesalerName} minHeight="0.48in" />
      <FieldRow label="Client name" />
      <FieldRow label="Client number" />

      <Box sx={{ pt: '0.02in' }}>
        <Typography sx={{ fontSize: '9pt', fontWeight: 700, mb: '0.06in' }}>
          Metal type, color, karat
        </Typography>
        <Typography sx={{ fontSize: '9pt', borderBottom: '1px solid #111', minHeight: '0.34in' }}>
          {' '}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, pt: '0.04in' }}>
        <Typography sx={{ fontSize: '9pt', fontWeight: 700, mb: '0.06in' }}>
          Work order request
        </Typography>
        <Box sx={{ display: 'grid', gap: '0.16in' }}>
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
