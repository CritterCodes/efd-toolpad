import { Alert, Stack, Typography, Box, Button, LinearProgress } from '@mui/material';
import { Block as BlockIcon } from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { METERS_PER_MILE } from './leadHelpers';
export function ImportJobPanel({ job, onCancel, cancelling }) {
  if (!job) return null;
  const running = ['queued', 'running'].includes(job.status);
  const progress = job.progress || {};
  const maxCandidates = Number(job.options?.maxCandidates || 0);
  const processed = Number(progress.processedCandidates || 0);
  const percent = maxCandidates ? Math.min(100, Math.round((processed / maxCandidates) * 100)) : 0;
  const statusColor = job.status === 'failed' ? 'error' : job.status === 'completed' ? 'success' : job.status === 'cancelled' ? 'warning' : 'info';
  const radiusMiles = job.options?.radiusMeters ? Math.round((Number(job.options.radiusMeters) / METERS_PER_MILE) * 10) / 10 : null;
  const savedTotal = Number(progress.saved || 0);
  const archived = Number(progress.rejected || 0);
  const activeSaved = Math.max(0, savedTotal - archived);
  const scoreFailures = Number(progress.scoringErrors || 0);
  const detailFailures = Number(progress.detailErrors || 0);
  const knownStores = Number(progress.duplicates || 0);
  const outsideRadius = Number(progress.outOfRadius || 0);
  const accountedFor = savedTotal + knownStores + detailFailures + outsideRadius;

  return (
    <Alert severity={statusColor} sx={{ mb: 2 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontWeight: 700 }}>
            Import {job.status}: {job.phase || 'starting'}
          </Typography>
          <Typography variant="caption">
            Checked {processed}{maxCandidates ? ` of ${maxCandidates}` : ''} candidates
          </Typography>
        </Stack>
        {running ? (
          <Box>
            <Button size="small" variant="outlined" color="warning" startIcon={<BlockIcon />} onClick={onCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Import'}
            </Button>
          </Box>
        ) : null}
        {running && <LinearProgress variant={maxCandidates ? 'determinate' : 'indeterminate'} value={percent} />}
        <Typography variant="body2">
          Saved {savedTotal} total ({activeSaved} active, {archived} archived not fit), found {progress.emailDiscoveries || 0} emails, skipped {knownStores} known stores{outsideRadius ? ` and ${outsideRadius} outside radius` : ''}.
        </Typography>
        {(scoreFailures || detailFailures) ? (
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            {scoreFailures ? `${scoreFailures} saved unscored after scoring failed` : ''}
            {scoreFailures && detailFailures ? '; ' : ''}
            {detailFailures ? `${detailFailures} skipped after Google details failed` : ''}
          </Typography>
        ) : null}
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
          Accounted for {accountedFor} of {processed} checked candidates.
        </Typography>
        {radiusMiles ? (
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            Local radius: {radiusMiles.toLocaleString()} miles
          </Typography>
        ) : null}
        {Boolean(progress.searchErrors) && (
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            {progress.searchErrors} Google search {progress.searchErrors === 1 ? 'query was' : 'queries were'} skipped after an API error.
          </Typography>
        )}
        {job.currentCandidate && (
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            Working on: {job.currentCandidate}
          </Typography>
        )}
        {job.error && <Typography variant="body2">{job.error}</Typography>}
      </Stack>
    </Alert>
  );
}

export function RescoreJobPanel({ job }) {
  if (!job) return null;
  const running = ['queued', 'running'].includes(job.status);
  const progress = job.progress || {};
  const total = Number(progress.total || 0);
  const processed = Number(progress.processed || 0);
  const percent = total ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const statusColor = job.status === 'failed' ? 'error' : job.status === 'completed' ? 'success' : 'info';

  return (
    <Alert severity={statusColor} sx={{ mb: 2 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontWeight: 700 }}>
            Rescore {job.status}: {job.phase || 'starting'}
          </Typography>
          <Typography variant="caption">
            Scored {processed}{total ? ` of ${total}` : ''} leads
          </Typography>
        </Stack>
        {running && <LinearProgress variant={total ? 'determinate' : 'indeterminate'} value={percent} />}
        <Typography variant="body2">
          Refreshed {progress.rescored || 0} scores, failed {progress.failed || 0}.
        </Typography>
        {job.currentCandidate && (
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            Working on: {job.currentCandidate}
          </Typography>
        )}
        {job.error && <Typography variant="body2">{job.error}</Typography>}
      </Stack>
    </Alert>
  );
}

export function StatBox({ label, value, icon: Icon }) {
  return (
    <Box sx={{ p: 2, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'grid', placeItems: 'center', backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}` }}>
          <Icon sx={{ fontSize: 18, color: REPAIRS_UI.accent }} />
        </Box>
        <Box>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{value}</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

