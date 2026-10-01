'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import IntakeLogEntry from './IntakeLogEntry';
import { missRanking } from './intakeLogFormat';

/**
 * Admin → Smart intake log (owner, 2026-10-01, OPEN-QUESTIONS Q13): every smart-intake AI suggestion, what was
 * typed or photographed, and what the ticket was saved as, so we can see where the AI goes wrong.
 */
function Stat({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 600 }}>{value}</Typography>
    </Paper>
  );
}

export default function SmartIntakeLogPage() {
  const [kind, setKind] = React.useState('');
  const [surface, setSurface] = React.useState('');
  const [onlyChanged, setOnlyChanged] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (kind) params.set('kind', kind);
    if (surface) params.set('surface', surface);
    setError('');
    fetch(`/api/admin/smart-intake-logs?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.success) throw new Error(json?.error || 'Failed to load the smart intake log');
        setData(json.data);
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [kind, surface]);

  const summary = data?.summary || { logged: 0, saved: 0, changed: 0, byField: {} };
  const ranking = missRanking(summary.byField);
  const entries = (data?.entries || []).filter((e) => !onlyChanged || e.changes?.length);

  return (
    <Box sx={{ pb: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600 }}>Smart intake log</Typography>
        <Typography color="text.secondary">
          Every time smart intake reads a sentence or a photo: what went in, what the AI said, and what the ticket was saved as.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))', gap: 1.5 }}>
        <Stat label="Suggestions" value={summary.logged} />
        <Stat label="Saved to a ticket" value={summary.saved} />
        <Stat label="Changed before saving" value={summary.changed} />
        <Stat label="Saved as suggested" value={summary.saved - summary.changed} />
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="caption" color="text.secondary">Where it goes wrong, by field (saved tickets)</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
          {ranking.length
            ? ranking.map((r) => <Chip key={r.field} label={`${r.label}: ${r.count}`} variant="outlined" />)
            : <Typography variant="body2" color="text.secondary">No changes recorded yet.</Typography>}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <ToggleButtonGroup size="small" exclusive value={kind} onChange={(_, v) => setKind(v ?? '')} aria-label="Kind">
          <ToggleButton value="">All</ToggleButton>
          <ToggleButton value="text">Sentence</ToggleButton>
          <ToggleButton value="photo">Photo</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={surface} onChange={(_, v) => setSurface(v ?? '')} aria-label="Where">
          <ToggleButton value="">Everywhere</ToggleButton>
          <ToggleButton value="store">Stores</ToggleButton>
          <ToggleButton value="counter">Counter</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel control={<Switch checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />} label="Only changed" />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}
      {data && !entries.length && (
        <Typography color="text.secondary">
          {onlyChanged ? 'No suggestions were changed before saving.' : 'Nothing logged yet. Entries appear as people use smart intake.'}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {entries.map((e) => <IntakeLogEntry key={e.logID} entry={e} />)}
      </Box>
    </Box>
  );
}
