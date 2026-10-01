import { Chip, Stack, Typography, Box, Alert, Grid } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { hasScore, tierLabel } from './leadHelpers';
export const ScoreChip = ({ score, source, sourceType }) => {
  if (sourceType === 'customer' && !hasScore(score)) return <Chip size="small" color="primary" variant="outlined" label="Customer seed" />;
  if (!hasScore(score)) return <Chip size="small" color="default" label="Unscored" />;
  const numeric = Number(score);
  const label = `${Math.round(numeric)}`;
  const color = numeric >= 75 ? 'success' : numeric >= 50 ? 'warning' : numeric > 0 ? 'error' : 'default';
  return <Chip size="small" color={color} label={`${label}${source ? ` ${source}` : ''}`} />;
};

export const formatScoreValue = (value) => (hasScore(value) ? Math.round(Number(value)) : 'N/A');
export const formatSignedValue = (value) => {
  if (!Number.isFinite(Number(value))) return '0';
  const numeric = Math.round(Number(value));
  return `${numeric >= 0 ? '+' : ''}${numeric}`;
};
export const formatSimilarity = (value) => {
  if (!Number.isFinite(Number(value))) return 'N/A';
  const numeric = Number(value);
  return numeric <= 1 ? `${Math.round(numeric * 100)}%` : `${Math.round(numeric)}%`;
};

export function CompactScoreBreakdown({ lead }) {
  const breakdown = lead.scoreBreakdown || {};
  const adjustment = breakdown.lookalikeAdjustment ?? lead.lookalikeDetails?.adjustment;
  const reasons = Array.isArray(lead.scoreReasons) ? lead.scoreReasons.slice(0, 2) : [];
  const customerSimilarity = Number(lead.lookalikeDetails?.customerSimilarity || 0);
  const notFitSimilarity = Number(lead.lookalikeDetails?.notFitSimilarity || 0);
  const lookalikeConfidence = Number(lead.lookalikeConfidence ?? lead.lookalikeDetails?.confidence ?? 0);
  const hasBreakdown = breakdown.opportunityScore !== undefined
    || breakdown.frictionScore !== undefined
    || lead.lookalikeScore !== undefined
    || breakdown.geminiFallback
    || breakdown.hardNotFit
    || reasons.length;

  if (!hasBreakdown) return null;

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {breakdown.opportunityScore !== undefined && (
          <Chip size="small" variant="outlined" label={`Opp ${formatScoreValue(breakdown.opportunityScore)}`} />
        )}
        {breakdown.frictionScore !== undefined && (
          <Chip size="small" variant="outlined" label={`Friction ${formatScoreValue(breakdown.frictionScore)}`} />
        )}
        {lead.lookalikeScore !== undefined && lead.lookalikeScore !== null && (
          <Chip
            size="small"
            variant="outlined"
            label={`Lookalike ${lead.lookalikeScore}${adjustment !== undefined ? ` (${formatSignedValue(adjustment)})` : ''}`}
          />
        )}
        {lookalikeConfidence >= 0.35 && customerSimilarity >= 0.7 && (
          <Chip size="small" color="success" variant="outlined" label="High Customer Match" />
        )}
        {lookalikeConfidence >= 0.35 && notFitSimilarity >= 0.65 && (
          <Chip size="small" color="warning" variant="outlined" label="Similar to Not Fit" />
        )}
        {lead.lookalikeScore !== undefined && lead.lookalikeScore !== null && (
          <Chip size="small" variant="outlined" label={`Lookalike confidence ${Math.round(lookalikeConfidence * 100)}%`} />
        )}
        {breakdown.geminiFallback && <Chip size="small" color="warning" variant="outlined" label="Fallback score" />}
        {breakdown.hardNotFit && <Chip size="small" color="error" variant="outlined" label="Hard not fit" />}
      </Stack>
      {reasons.length ? (
        <Stack spacing={0.35}>
          {reasons.map((reason) => (
            <Typography key={reason} variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
              Why: {reason}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

export function ScoreMetric({ label, value, helper, color }) {
  return (
    <Box sx={{ p: 1.5, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5, backgroundColor: REPAIRS_UI.bgCard, minHeight: 88 }}>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
        {label}
      </Typography>
      <Typography sx={{ color: color || REPAIRS_UI.textHeader, fontWeight: 800, fontSize: 24, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {helper && (
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block', mt: 0.25 }}>
          {helper}
        </Typography>
      )}
    </Box>
  );
}

export function ScoreDetailPanel({ lead }) {
  const breakdown = lead.scoreBreakdown || {};
  const lookalikeDetails = lead.lookalikeDetails || {};
  const adjustment = breakdown.lookalikeAdjustment ?? lookalikeDetails.adjustment;
  const lookalikeConfidence = Number(lead.lookalikeConfidence ?? lookalikeDetails.confidence ?? 0);
  const isCustomerSeed = lead.sourceType === 'customer' && !hasScore(lead.fitScore);
  const finalScoreColor = hasScore(lead.fitScore)
    ? Number(lead.fitScore) >= 75
      ? 'success.main'
      : Number(lead.fitScore) >= 50
        ? 'warning.main'
        : 'error.main'
    : REPAIRS_UI.textHeader;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2">Scoring Results</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            Gemini extracts signals, rules compute the score, and lookalike similarity adjusts it.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {lead.leadTier && <Chip size="small" color="primary" label={tierLabel(lead.leadTier)} />}
          {lead.scoreSource && <Chip size="small" variant="outlined" label={lead.scoreSource} />}
          {breakdown.model && <Chip size="small" variant="outlined" label={breakdown.model} />}
          {isCustomerSeed && <Chip size="small" color="primary" variant="outlined" label="Customer training seed" />}
        </Stack>
      </Stack>

      {breakdown.geminiFallback || lead.scoreError ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Gemini scoring fell back to deterministic signals{lead.scoreError ? `: ${lead.scoreError}` : '.'}
        </Alert>
      ) : null}
      {breakdown.hardNotFit ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          Hard not-fit rule triggered before normal tiering.
        </Alert>
      ) : null}

      <Grid container spacing={1.25}>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Final Score" value={isCustomerSeed ? 'Seed' : formatScoreValue(lead.fitScore)} helper="Stored fit score" color={finalScoreColor} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Base Score" value={formatScoreValue(lead.baseScore ?? breakdown.baseScore)} helper="Before lookalike blend" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Opportunity" value={formatScoreValue(breakdown.opportunityScore)} helper="Revenue and repair demand" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Friction" value={formatScoreValue(breakdown.frictionScore)} helper="Close difficulty" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Lookalike" value={lead.lookalikeScore ?? 'N/A'} helper={`Adjustment ${formatSignedValue(adjustment)}`} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Confidence" value={`${Math.round(lookalikeConfidence * 100)}%`} helper={`Blend weight ${Math.round(Number(lookalikeDetails.effectiveWeight || breakdown.lookalikeEffectiveWeight || 0) * 100)}%`} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Customer Match" value={formatSimilarity(lookalikeDetails.customerSimilarity)} helper={`${lookalikeDetails.customerEligibleSampleSize ?? lookalikeDetails.customerSampleSize ?? 0}/${lookalikeDetails.customerSampleSize || 0} eligible seeds`} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <ScoreMetric label="Not-Fit Match" value={formatSimilarity(lookalikeDetails.notFitSimilarity)} helper={`${lookalikeDetails.notFitEligibleSampleSize ?? lookalikeDetails.notFitSampleSize ?? 0}/${lookalikeDetails.notFitSampleSize || 0} eligible examples`} />
        </Grid>
      </Grid>

      <Typography sx={{ color: REPAIRS_UI.textSecondary, mt: 1.5 }}>
        {lead.aiSummary || 'No scoring summary saved yet.'}
      </Typography>
      {lead.likelyRepairNeed && <Typography sx={{ mt: 1 }}>Likely need: {lead.likelyRepairNeed}</Typography>}
      {lead.recommendedOutreachAngle && <Typography sx={{ mt: 1 }}>Angle: {lead.recommendedOutreachAngle}</Typography>}

      {lead.scoreReasons?.length ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Why this score</Typography>
          <Stack spacing={0.75}>
            {lead.scoreReasons.map((reason) => (
              <Typography key={reason} variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                - {reason}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      {lead.lookalikeReasons?.length ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Lookalike reasons</Typography>
          <Stack spacing={0.75}>
            {lead.lookalikeReasons.map((reason) => (
              <Typography key={reason} variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                - {reason}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      {(lead.truthSignals || lead.signalBreakdown) ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Truth signals</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {lead.truthSignals?.strongInHouse && <Chip size="small" color="error" variant="outlined" label="Strong in-house" />}
            {lead.truthSignals?.outsourcingEvidence && <Chip size="small" color="success" variant="outlined" label="Outsourcing evidence" />}
            {lead.truthSignals?.turnaroundComplaints && <Chip size="small" color="success" variant="outlined" label="Turnaround complaints" />}
            {lead.truthSignals?.repeatIssues && <Chip size="small" color="warning" variant="outlined" label="Repeat issues" />}
            {lead.truthSignals?.mentionsSpecificRepairs && <Chip size="small" variant="outlined" label="Specific repairs in reviews" />}
            <Chip size="small" variant="outlined" label={`Review repair volume ${Math.round(Number(lead.truthSignals?.repairVolume || lead.signalBreakdown?.reviewRepairVolume || 0) * 100)}%`} />
            <Chip size="small" variant="outlined" label={`In-house strength ${Math.round(Number(lead.signalBreakdown?.inHouseRepairStrength || 0) * 100)}%`} />
          </Stack>
        </Box>
      ) : null}

      {lead.aiConcerns?.length ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Concerns</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {lead.aiConcerns.map((concern) => <Chip key={concern} size="small" variant="outlined" label={concern} />)}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}

