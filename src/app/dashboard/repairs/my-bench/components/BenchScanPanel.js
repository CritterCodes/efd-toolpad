import React from 'react';
import { Box, Button, Chip, MenuItem, TextField } from '@mui/material';
import { QrCodeScanner as ScanIcon, Close as CloseIcon } from '@mui/icons-material';
import { SurfaceCard, SectionLabel } from '@/components/facelift';
import { scanActionByKey } from '@/services/bench/scanActions';

/**
 * Scan a pile of tickets, then tell the batch what to do with them.
 *
 * Moved out of the My Bench page on 2026-10-02 for max-lines. It is presentational: the page owns the
 * queue and runs the action, because running it refreshes the board and reports the result.
 *
 * The scan-then-decide shape is the point (owner, 2026-09-30): a jeweler holding a stack of tickets
 * scans them all and picks the disposition once, rather than finding each job on screen.
 */
export function BenchScanPanel({
  scanValue, onScanValueChange, onQueueSubmit,
  scanAction, onScanActionChange, scanActions,
  queuedIDs, onRemoveQueued, onRunQueued, onOpenCamera, loading,
}) {
  const actionLabel = scanActionByKey(scanAction)?.label;

  return (
    <SurfaceCard sx={{ mt: 2.5 }}>
      <SectionLabel>Scan tickets</SectionLabel>

      <Box component="form" onSubmit={onQueueSubmit} sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          label="Scan ticket" placeholder="Scan repair ticket barcode" value={scanValue}
          onChange={(e) => onScanValueChange(e.target.value)} autoComplete="off" autoFocus size="small"
          sx={{ minWidth: { xs: '100%', sm: 300 } }}
          helperText="Barcode scan lands here. Press Enter to queue each repair, then pick what happens to them."
        />
        <TextField
          select size="small" label="Then" value={scanAction}
          onChange={(e) => onScanActionChange(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 190 } }}
        >
          {scanActions.map((a) => <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="outlined" startIcon={<ScanIcon />} disabled={loading || !scanValue.trim()}>Queue Scan</Button>
        <Button type="button" variant="outlined" startIcon={<ScanIcon />} disabled={loading} onClick={onOpenCamera}>Camera Scan</Button>
        <Button type="button" variant="contained" disabled={loading || queuedIDs.length === 0} onClick={onRunQueued}>
          {loading ? 'Working…' : `${actionLabel ?? 'Apply'} ${queuedIDs.length}`}
        </Button>
      </Box>

      {queuedIDs.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <SectionLabel sx={{ mb: 1 }}>Queued ({queuedIDs.length}) → {actionLabel}</SectionLabel>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {queuedIDs.map((id) => (
              <Chip key={id} label={id} onDelete={() => onRemoveQueued(id)} deleteIcon={<CloseIcon />} />
            ))}
          </Box>
        </Box>
      )}
    </SurfaceCard>
  );
}
