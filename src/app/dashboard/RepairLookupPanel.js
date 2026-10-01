import React from 'react';
import { SurfaceCard, facelift, StatusChip } from '@/components/facelift';
import { Button, Box, TextField, InputAdornment, Alert, Typography } from '@mui/material';
import { Work as WorkIcon, QrCodeScanner as QrCodeScannerIcon, Search as SearchIcon } from '@mui/icons-material';
import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';
import { OpenLink, PanelHeader, getRepairDisplayName, getRepairSearchText, rowDividerSx, statusHue } from './adminDashboardParts';
export function RepairLookupPanel({ repairs, onNavigate, autoOpenScanner = false }) {
  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState('');
  const [cameraScannerOpen, setCameraScannerOpen] = React.useState(false);
  const autoOpenedScannerRef = React.useRef(false);

  const trimmedQuery = query.trim();
  const matches = React.useMemo(() => {
    if (!trimmedQuery) return [];

    const normalized = trimmedQuery.toLowerCase();
    return repairs
      .filter((repair) => getRepairSearchText(repair).includes(normalized))
      .slice(0, 6);
  }, [repairs, trimmedQuery]);

  const openRepair = (repairID) => {
    if (!repairID) return;
    onNavigate(`/dashboard/repairs/${encodeURIComponent(repairID)}`);
  };

  const findRepair = (value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;

    const exactMatch = repairs.find((repair) => String(repair.repairID || '').toLowerCase() === normalizedValue);
    if (exactMatch) return exactMatch;

    return repairs.find((repair) => getRepairSearchText(repair).includes(normalizedValue)) || null;
  };

  const handleLookup = (value) => {
    setError('');

    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return;

    const target = findRepair(normalizedValue);

    if (target?.repairID) {
      openRepair(target.repairID);
      return;
    }

    setError(`No repair found for "${normalizedValue}".`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleLookup(trimmedQuery);
  };

  const handleCameraScan = (value) => {
    setQuery(value);
    handleLookup(value);
  };

  React.useEffect(() => {
    if (!autoOpenScanner || autoOpenedScannerRef.current) return;
    autoOpenedScannerRef.current = true;
    setCameraScannerOpen(true);
  }, [autoOpenScanner]);

  return (
    <SurfaceCard>
      <PanelHeader
        overline="Repair lookup"
        title="Scan or search repairs"
        action={(
          <Button
            startIcon={<WorkIcon />}
            onClick={() => onNavigate('/dashboard/repairs/my-bench')}
            variant="outlined"
          >
            My Bench
          </Button>
        )}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 2.5,
          display: 'flex',
          gap: 1,
          alignItems: 'stretch',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}
      >
        <TextField
          fullWidth
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (error) setError('');
          }}
          placeholder="Scan a repair ticket barcode or search name, repair ID, business, status"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <QrCodeScannerIcon sx={{ color: facelift.gold }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon sx={{ color: facelift.text3 }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!trimmedQuery}
          startIcon={<SearchIcon />}
          sx={{ px: 2.5, minWidth: { xs: '100%', md: 120 } }}
        >
          Search
        </Button>
        <Button
          type="button"
          variant="outlined"
          startIcon={<QrCodeScannerIcon />}
          onClick={() => setCameraScannerOpen(true)}
          sx={{ px: 2.5, minWidth: { xs: '100%', md: 140 } }}
        >
          Camera Scan
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {trimmedQuery && matches.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {matches.map((repair) => (
            <Box key={repair.repairID} sx={{ ...rowDividerSx, py: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {getRepairDisplayName(repair)}
                </Typography>
                <Typography sx={{ color: facelift.text2, fontSize: '0.8125rem' }}>
                  {repair.repairID} · {repair.repairType || repair.description || 'Repair'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
                <StatusChip label={repair.status || 'No status'} hue={statusHue(repair.status)} />
                <OpenLink onClick={() => openRepair(repair.repairID)} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <ContinuousBarcodeScanner
        open={cameraScannerOpen}
        title="Scan Repair Ticket"
        queuedCount={0}
        actionLabel="Close Scanner"
        onClose={() => setCameraScannerOpen(false)}
        onScan={handleCameraScan}
        onAction={() => setCameraScannerOpen(false)}
      >
        <Typography variant="body2" sx={{ color: facelift.text2 }}>
          Scan a repair ticket QR code or barcode to open the matching repair.
        </Typography>
      </ContinuousBarcodeScanner>
    </SurfaceCard>
  );
}

