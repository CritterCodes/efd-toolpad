'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { FIELD_LABELS, suggestionLines, formatWhen } from './intakeLogFormat';

const label = (field) => FIELD_LABELS[field] || field;

function ChangesTable({ changes }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(min(110px, 100%), auto) 1fr 1fr', gap: 0.5, fontSize: 13 }}>
      <Typography variant="caption" color="text.secondary">Field</Typography>
      <Typography variant="caption" color="text.secondary">AI said</Typography>
      <Typography variant="caption" color="text.secondary">Saved as</Typography>
      {changes.map((c) => [
        <Typography key={`${c.field}-f`} variant="body2" sx={{ fontWeight: 600 }}>{label(c.field)}</Typography>,
        <Typography key={`${c.field}-a`} variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary', overflowWrap: 'anywhere' }}>{c.ai}</Typography>,
        <Typography key={`${c.field}-b`} variant="body2" sx={{ overflowWrap: 'anywhere' }}>{c.final}</Typography>,
      ])}
    </Box>
  );
}

/** One AI suggestion: what was typed, what the AI said, and what the ticket became. */
export default function IntakeLogEntry({ entry }) {
  const isPhoto = entry.kind === 'photo';
  const lines = suggestionLines(entry);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Chip size="small" label={isPhoto ? 'Photo' : 'Sentence'} />
        <Chip size="small" variant="outlined" label={entry.surface === 'store' ? 'Store intake' : 'Counter'} />
        <Typography variant="body2" color="text.secondary">
          {formatWhen(entry.createdAt)} · {entry.userName || entry.userID || 'Unknown'}
          {entry.ms ? ` · ${(entry.ms / 1000).toFixed(1)}s` : ''}
        </Typography>
        {entry.repairID && (
          <Link href={`/dashboard/repairs/${entry.repairID}`} variant="body2" sx={{ ml: { sm: 'auto' } }}>{entry.repairID}</Link>
        )}
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">{isPhoto ? 'Photo' : 'Typed'}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {isPhoto
            ? `${entry.input?.mimeType || 'image'}${entry.input?.bytes ? `, ${Math.round(entry.input.bytes / 1024)} KB` : ''}`
            : entry.input?.text || '—'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">AI said</Typography>
        {lines.length ? lines.map((l) => (
          <Typography key={l.field} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            <Box component="span" sx={{ color: 'text.secondary' }}>{label(l.field)}: </Box>{l.value}
          </Typography>
        )) : <Typography variant="body2" color="text.secondary">Nothing</Typography>}
      </Box>

      {!entry.outcome && (
        <Typography variant="body2" color="text.secondary">Not saved yet: the ticket was abandoned or is still open.</Typography>
      )}
      {entry.outcome && !entry.changes?.length && (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Saved as the AI suggested.</Typography>
      )}
      {entry.outcome && entry.changes?.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Changed before saving ({entry.changes.length})
          </Typography>
          <ChangesTable changes={entry.changes} />
        </Box>
      )}
    </Paper>
  );
}
