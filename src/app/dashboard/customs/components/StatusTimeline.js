import React from 'react';
import { Box, Stepper, Step, StepLabel, FormControl, InputLabel, Select, MenuItem, Stack, Typography } from '@mui/material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

// Customs lifecycle (cancelled is off-track and handled separately).
const LIFECYCLE = ['pending', 'consultation', 'design', 'quote', 'deposit', 'in_production', 'qc', 'completed', 'delivered'];
const META = {
  pending: { label: 'Pending', icon: '🕓', desc: 'New request awaiting review.' },
  consultation: { label: 'Consultation', icon: '💬', desc: 'Discussing the design with the client.' },
  design: { label: 'Design', icon: '✏️', desc: 'CAD design in progress (STL → QC).' },
  quote: { label: 'Quote', icon: '🧾', desc: 'Quote prepared / sent for approval.' },
  deposit: { label: 'Deposit', icon: '💳', desc: 'Awaiting deposit to start production.' },
  in_production: { label: 'Production', icon: '🔨', desc: 'On the bench — casting, setting, finishing.' },
  qc: { label: 'QC', icon: '🔍', desc: 'Quality check before completion.' },
  completed: { label: 'Completed', icon: '✅', desc: 'Finished — awaiting delivery/pickup.' },
  delivered: { label: 'Delivered', icon: '📦', desc: 'Delivered to the client.' },
  cancelled: { label: 'Cancelled', icon: '✖️', desc: 'Order cancelled.' },
};
const LABEL = Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v.label]));
const ALL_STATUSES = [...LIFECYCLE, 'cancelled'];

export default function StatusTimeline({ order, busy, onChange }) {
  const current = order.status;
  const activeStep = LIFECYCLE.indexOf(current);

  return (
    <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 2, mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        {current === 'cancelled' ? (
          <Typography sx={{ color: '#EF5350', fontWeight: 600 }}>This order is cancelled.</Typography>
        ) : (
          <Stepper activeStep={activeStep} alternativeLabel sx={{
            flex: 1, minWidth: 0,
            '& .MuiStepLabel-label': { color: REPAIRS_UI.textMuted, fontSize: '0.7rem', mt: 0.5 },
            '& .MuiStepLabel-label.Mui-active': { color: REPAIRS_UI.accent },
            '& .MuiStepLabel-label.Mui-completed': { color: REPAIRS_UI.textSecondary },
            '& .MuiStepIcon-root': { color: REPAIRS_UI.bgTertiary },
            '& .MuiStepIcon-root.Mui-active': { color: REPAIRS_UI.accent },
            '& .MuiStepIcon-root.Mui-completed': { color: REPAIRS_UI.accent },
          }}>
            {LIFECYCLE.map((s) => <Step key={s}><StepLabel icon={<span style={{ fontSize: 16 }}>{META[s].icon}</span>}>{META[s].label}</StepLabel></Step>)}
          </Stepper>
        )}
        <FormControl size="small" sx={{ minWidth: 200 }} disabled={busy}>
          <InputLabel>Change status</InputLabel>
          <Select value={current} label="Change status" MenuProps={repairsMenuProps} onChange={(e) => onChange(e.target.value)}>
            {ALL_STATUSES.map((s) => <MenuItem key={s} value={s}>{META[s].icon} {META[s].label}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
      {META[current] && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: REPAIRS_UI.textSecondary }}>
          {META[current].icon} {META[current].desc}
        </Typography>
      )}
    </Box>
  );
}
