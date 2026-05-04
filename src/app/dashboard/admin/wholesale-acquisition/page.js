'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AiIcon,
  Block as BlockIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  LocalShipping as ShippingIcon,
  Map as MapIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';
import { wholesaleLeadsClient } from '@/api-clients/wholesaleLeads.client';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUSES = [
  'new',
  'researching',
  'qualified',
  'contacted',
  'follow_up',
  'interested',
  'invited',
  'applied',
  'approved',
  'not_fit',
  'no_response',
];

const DEFAULT_QUERIES = [
  'independent jeweler',
  'jewelry repair',
  'watch repair',
  'pawn shop jewelry',
  'bridal jewelry store',
  'local jewelry store',
];

const DEFAULT_LOCATIONS = [
  'Arkansas',
  'Oklahoma',
  'Missouri',
  'Texas',
  'Tennessee',
  'Kansas',
];

const METERS_PER_MILE = 1609.344;
const DEFAULT_WHOLESALE_APPLICATION_URL = 'https://shop.engelfinedesign.com/wholesale/request';

const FIT_VIEWS = [
  { value: 'all', label: 'Active Leads' },
  { value: 'strong', label: 'Strong Fits' },
  { value: 'possible', label: 'Possible Fits' },
  { value: 'weak', label: 'Weak Fits' },
  { value: 'reached_out', label: 'Reached Out' },
  { value: 'current', label: 'Current Accounts' },
  { value: 'not_fit', label: 'Archived Not Fit' },
  { value: 'unscored', label: 'Unscored' },
];

const BUSINESS_FILTERS = [
  { value: '', label: 'All business types' },
  { value: 'jewelry_business', label: 'Jewelry stores' },
  { value: 'pawn_shop', label: 'Pawn shops' },
  { value: 'watch_or_clock_business', label: 'Watch repair' },
  { value: 'bridal_or_fine_jewelry_store', label: 'Bridal/fine jewelry' },
  { value: 'known_repair', label: 'Mentions repair' },
  { value: 'refurbishment', label: 'Refurb opportunity' },
];

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Highest score' },
  { value: 'proximity', label: 'Closest to EFD' },
  { value: 'newest', label: 'Newest' },
  { value: 'follow_up', label: 'Next follow-up' },
];

const statusLabel = (status) => String(status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const tierLabel = (tier) => String(tier || '').replace(/^tier_\d_/, 'Tier ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const hasScore = (score) => score !== null && score !== undefined && score !== '' && Number.isFinite(Number(score));

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const inferClientBusinessHints = (lead = {}) => {
  if (lead.businessProfileHints) return lead.businessProfileHints;
  const text = [
    lead.storeName,
    lead.website,
    lead.notes,
    lead.likelyRepairNeed,
    lead.googleReviewSummary,
    lead.googleReviewResearch?.summary,
    ...(Array.isArray(lead.googleReviews) ? lead.googleReviews.map((review) => review.text) : []),
    ...(Array.isArray(lead.googleBusinessTypes) ? lead.googleBusinessTypes : []),
  ].join(' ').toLowerCase();
  const pawnSignal = /\bpawn|pawnshop|pawn shop/.test(text);
  const knownRepairSignal = /\brepair|service|watch repair|jewelry repair|jewellery repair|bench/.test(text);
  const refurbishmentOpportunity = pawnSignal || /\brefurb|restore|restoration|polish|clean|cleaning|pre-owned|preowned|used|estate|resale|secondhand|second-hand|scrap gold|gold buyer|cash for gold/.test(text);
  const jewelrySignal = /\bjewel|jewelry|jewellery|diamond|gold|bridal|engagement|ring/.test(text);
  const watchSignal = /\bwatch|clock/.test(text);
  const bridalSignal = /\bbridal|engagement|wedding/.test(text);
  return {
    likelyBusinessType: pawnSignal
      ? 'pawn_shop'
      : watchSignal
        ? 'watch_or_clock_business'
        : bridalSignal
          ? 'bridal_or_fine_jewelry_store'
          : jewelrySignal
            ? 'jewelry_business'
            : 'unclear',
    knownRepairSignal,
    refurbishmentOpportunity,
  };
};

const matchesBusinessFilter = (lead, filter) => {
  if (!filter) return true;
  const hints = inferClientBusinessHints(lead);
  if (filter === 'known_repair') return Boolean(hints.knownRepairSignal);
  if (filter === 'refurbishment') return Boolean(hints.refurbishmentOpportunity);
  return hints.likelyBusinessType === filter;
};

const emptyLeadForm = {
  storeName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  shippingRequired: false,
};

const EMAIL_TEMPLATES = [
  {
    label: 'Repair outsourcing intro',
    subject: 'Wholesale jewelry repair support',
    body: [
      'Hi {{storeName}},',
      '',
      'I wanted to reach out because Engel Fine Design helps stores add, expand, or organize jewelry repair work without needing to build a full repair operation in-house.',
      '',
      'We can receive repair jobs from your team, keep the work organized, and give your store free access to our repair management software so you are not stuck tracking client repairs with paper envelopes, notes, or a messy manual process.',
      '',
      'If jewelry repair is already part of what you do, this can help with overflow and cleaner tracking. If it is not something you currently offer, it may be a simple way to add repair or refurbishment as another service for your customers.',
      '',
      '{{applicationUrl}}',
      '',
      'No pressure to schedule a call first. If it looks useful, you can get access and see whether the workflow fits your store.',
      '',
      'If you have questions, you can reply here or call me at 479-546-6740.',
      '',
      'Best,',
      'Jake Engel',
    ].join('\n'),
  },
  {
    label: 'Short follow-up',
    subject: 'Repair partner follow-up',
    body: [
      'Hi {{storeName}},',
      '',
      'Following up to see if wholesale repair support would be useful for your business.',
      '',
      'Engel Fine Design can help with outsourced jewelry repair work, whether you already handle repairs manually or want a simple way to offer repair/refurbishment without adding bench capacity. Wholesale partners also get free access to our repair management software for intake and tracking.',
      '',
      'You can apply for free wholesale account access here:',
      '',
      '{{applicationUrl}}',
      '',
      'If you have questions, you can reply here or call me at 479-546-6740.',
      '',
      'Best,',
      'Jake Engel',
    ].join('\n'),
  },
];

const ScoreChip = ({ score, source, sourceType }) => {
  if (sourceType === 'customer' && !hasScore(score)) return <Chip size="small" color="primary" variant="outlined" label="Customer seed" />;
  if (!hasScore(score)) return <Chip size="small" color="default" label="Unscored" />;
  const numeric = Number(score);
  const label = `${Math.round(numeric)}`;
  const color = numeric >= 75 ? 'success' : numeric >= 50 ? 'warning' : numeric > 0 ? 'error' : 'default';
  return <Chip size="small" color={color} label={`${label}${source ? ` ${source}` : ''}`} />;
};

const formatScoreValue = (value) => (hasScore(value) ? Math.round(Number(value)) : 'N/A');
const formatSignedValue = (value) => {
  if (!Number.isFinite(Number(value))) return '0';
  const numeric = Math.round(Number(value));
  return `${numeric >= 0 ? '+' : ''}${numeric}`;
};
const formatSimilarity = (value) => {
  if (!Number.isFinite(Number(value))) return 'N/A';
  const numeric = Number(value);
  return numeric <= 1 ? `${Math.round(numeric * 100)}%` : `${Math.round(numeric)}%`;
};

function CompactScoreBreakdown({ lead }) {
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

function ScoreMetric({ label, value, helper, color }) {
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

function ScoreDetailPanel({ lead }) {
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

function ImportJobPanel({ job, onCancel, cancelling }) {
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

function RescoreJobPanel({ job }) {
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

function StatBox({ label, value, icon: Icon }) {
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

function LeadCard({ lead, selected, onSelect, onOpen, onScore, onCopyInvite, onManualNotFit }) {
  const canSelect = lead.status !== 'not_fit';
  const canManualNotFit = lead.status !== 'not_fit' && lead.sourceType !== 'customer';
  const contact = lead.email || lead.phone || 'No contact yet';
  const location = [lead.city, lead.state].filter(Boolean).join(', ') || lead.address || 'Location unknown';
  const distanceLabel = Number.isFinite(Number(lead.distanceMiles)) ? `${Number(lead.distanceMiles).toLocaleString()} mi` : '';
  const reviewSignals = lead.googleReviewSignals || lead.googleReviewResearch?.signals || {};

  return (
    <Paper
      variant="outlined"
      onClick={onOpen}
      sx={{
        p: 2,
        height: '100%',
        borderColor: selected ? REPAIRS_UI.accent : REPAIRS_UI.border,
        backgroundColor: REPAIRS_UI.bgPanel,
        cursor: 'pointer',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:hover': { borderColor: REPAIRS_UI.accent, transform: 'translateY(-1px)' },
      }}
    >
      <Stack spacing={1.5} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Checkbox
            checked={selected}
            disabled={!canSelect}
            onClick={(event) => event.stopPropagation()}
            onChange={onSelect}
            inputProps={{ 'aria-label': `Select ${lead.storeName}` }}
            sx={{ p: 0.25, mt: 0.25 }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, color: REPAIRS_UI.textHeader, overflowWrap: 'anywhere' }}>
              {lead.storeName}
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.25 }}>
              {location}
            </Typography>
          </Box>
          <ScoreChip score={lead.fitScore} source={lead.scoreSource} sourceType={lead.sourceType} />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip size="small" label={statusLabel(lead.status)} />
          {lead.knownCustomerSignal?.isCurrentWholesaler && <Chip size="small" color="primary" variant="outlined" label="Current account" />}
          {lead.lookalikeScore !== undefined && lead.lookalikeScore !== null && <Chip size="small" variant="outlined" label={`Lookalike ${lead.lookalikeScore}`} />}
          {lead.email && <Chip size="small" variant="outlined" icon={<EmailIcon />} label="Email" />}
          {lead.googleReviewCount ? <Chip size="small" variant="outlined" label={`${lead.googleReviewCount} reviews`} /> : null}
          {reviewSignals.repairMentioned && <Chip size="small" color="success" variant="outlined" label="Review repair signal" />}
          {reviewSignals.ringSizingMentioned && <Chip size="small" color="success" variant="outlined" label="Ring sizing" />}
          {reviewSignals.chainRepairMentioned && <Chip size="small" color="success" variant="outlined" label="Chain repair" />}
          {reviewSignals.ownerJewelerMentioned && <Chip size="small" color="success" variant="outlined" label="Owner jeweler" />}
        </Stack>

        <CompactScoreBreakdown lead={lead} />

        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary, overflowWrap: 'anywhere' }}>
            {contact}
          </Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block', mt: 0.5, overflowWrap: 'anywhere' }}>
            {lead.website || lead.source || ''}
          </Typography>
          {lead.aiSummary && (
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1.25 }}>
              {lead.aiSummary.length > 150 ? `${lead.aiSummary.slice(0, 150)}...` : lead.aiSummary}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
            {distanceLabel ? `${distanceLabel} from EFD` : `Follow-up: ${formatDate(lead.nextFollowUpAt) || '-'}`}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {canManualNotFit && (
              <Tooltip title="Manual not fit">
                <IconButton size="small" onClick={(event) => { event.stopPropagation(); onManualNotFit(); }}>
                  <BlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Score with AI">
              <IconButton size="small" onClick={(event) => { event.stopPropagation(); onScore(); }}>
                <AiIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {lead.outreachDraft?.inviteMessage && (
              <Tooltip title="Copy invite">
                <IconButton size="small" onClick={(event) => { event.stopPropagation(); onCopyInvite(); }}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function LeadFormDialog({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState(emptyLeadForm);

  useEffect(() => {
    if (open) setForm(emptyLeadForm);
  }, [open]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Wholesale Lead</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Store name" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} required />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Contact name" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Website" value={form.website} onChange={(e) => update('website', e.target.value)} />
            </Grid>
          </Grid>
          <TextField label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} />
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="State" value={form.state} onChange={(e) => update('state', e.target.value)} />
            </Grid>
          </Grid>
          <TextField label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} multiline minRows={3} />
          <FormControlLabel
            control={<Checkbox checked={form.shippingRequired} onChange={(e) => update('shippingRequired', e.target.checked)} />}
            label="Shipping likely required"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSubmit(form)} disabled={loading || !form.storeName.trim()}>
          {loading ? 'Adding...' : 'Add Lead'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GoogleImportDialog({ open, onClose, onSubmit, loading }) {
  const [queries, setQueries] = useState(DEFAULT_QUERIES.join('\n'));
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS.join('\n'));
  const [autoScore, setAutoScore] = useState(true);
  const [minImportScore, setMinImportScore] = useState(40);
  const [maxCandidates, setMaxCandidates] = useState(150);
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [useLocalRadius, setUseLocalRadius] = useState(false);
  const [discoverEmails, setDiscoverEmails] = useState(true);

  useEffect(() => {
    if (open) {
      setQueries(DEFAULT_QUERIES.join('\n'));
      setLocations(DEFAULT_LOCATIONS.join('\n'));
      setAutoScore(true);
      setMinImportScore(40);
      setMaxCandidates(150);
      setRadiusMiles(100);
      setUseLocalRadius(false);
      setDiscoverEmails(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import From Google Places</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>
          Search by state, region, or city. Every scored candidate is saved; bad fits are archived so future runs skip known stores instead of scoring them again.
        </Typography>
        <TextField
          label="Search queries"
          value={queries}
          onChange={(e) => setQueries(e.target.value)}
          multiline
          minRows={7}
          fullWidth
        />
        <TextField
          sx={{ mt: 2 }}
          label="Regions, states, or cities"
          value={locations}
          onChange={(e) => setLocations(e.target.value)}
          multiline
          minRows={5}
          fullWidth
          disabled={useLocalRadius}
          helperText={useLocalRadius ? 'Disabled because local radius search is enabled.' : 'One per line for broader regional searches.'}
        />
        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Checkbox checked={useLocalRadius} onChange={(e) => setUseLocalRadius(e.target.checked)} />}
          label="Use local radius around EFD instead of region/state lines"
        />
        <TextField
          sx={{ mt: 2 }}
          label="Local radius around EFD"
          type="number"
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(e.target.value)}
          fullWidth
          size="small"
          inputProps={{ min: 1, max: 500, step: 1 }}
          disabled={!useLocalRadius}
          helperText="Miles. Use region/state lines instead for broader state or national searches."
        />
        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Checkbox checked={autoScore} onChange={(e) => setAutoScore(e.target.checked)} />}
          label="Score candidates with Gemini before saving"
        />
        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Checkbox checked={discoverEmails} onChange={(e) => setDiscoverEmails(e.target.checked)} />}
          label="Try to find email from each saved lead website"
        />
        <TextField
          sx={{ mt: 2 }}
          label="Minimum score to qualify"
          type="number"
          value={minImportScore}
          onChange={(e) => setMinImportScore(e.target.value)}
          disabled={!autoScore}
          fullWidth
          size="small"
          inputProps={{ min: 0, max: 100 }}
        />
        <TextField
          sx={{ mt: 2 }}
          label="Maximum candidates to check"
          type="number"
          value={maxCandidates}
          onChange={(e) => setMaxCandidates(e.target.value)}
          fullWidth
          size="small"
          inputProps={{ min: 1, max: 1000 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit({
            queries: queries.split('\n').map((q) => q.trim()).filter(Boolean),
            searchLocations: useLocalRadius ? [] : locations.split('\n').map((q) => q.trim()).filter(Boolean),
            radiusMeters: Math.round(Math.max(1, Number(radiusMiles) || 100) * METERS_PER_MILE),
            autoScore,
            minImportScore,
            maxCandidates,
            discoverEmails,
          })}
          disabled={loading}
        >
          {loading ? 'Scoring and importing...' : 'Import Leads'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EmailTemplatesDialog({ open, onClose, onCopy }) {
  const configuredApplicationUrl = process.env.NEXT_PUBLIC_WHOLESALE_APPLICATION_URL || DEFAULT_WHOLESALE_APPLICATION_URL;
  const applicationUrl = configuredApplicationUrl.includes('your-efd-shop-domain.com') || configuredApplicationUrl.includes('engelfinedesign.com/wholesale/request')
    ? DEFAULT_WHOLESALE_APPLICATION_URL
    : configuredApplicationUrl;
  const templateText = (template) => [
    `Subject: ${template.subject}`,
    '',
    template.body.replaceAll('{{storeName}}', '[Store Name]').replaceAll('{{applicationUrl}}', applicationUrl),
  ].join('\n');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Email Templates</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Google Places does not provide email addresses. Use import email discovery or the lead drawer email scraper, then review before outreach.
        </Alert>
        <Stack spacing={2}>
          {EMAIL_TEMPLATES.map((template) => (
            <Paper key={template.label} variant="outlined" sx={{ p: 2, borderColor: REPAIRS_UI.border }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{template.label}</Typography>
                <Button size="small" startIcon={<CopyIcon />} onClick={() => onCopy(templateText(template))}>
                  Copy
                </Button>
              </Stack>
              <TextField label="Subject" value={template.subject} InputProps={{ readOnly: true }} size="small" fullWidth sx={{ mb: 1 }} />
              <TextField value={templateText(template).replace(`Subject: ${template.subject}\n\n`, '')} InputProps={{ readOnly: true }} multiline minRows={7} fullWidth />
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function BulkOutreachDialog({ open, onClose, leads, onRun, loading }) {
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setConfirmSend(false);
      setResult(null);
    }
  }, [open]);

  const withEmail = leads.filter((lead) => lead.email && lead.status !== 'not_fit');
  const withoutEmail = leads.filter((lead) => !lead.email && lead.status !== 'not_fit');
  const alreadyReached = leads.filter((lead) => ['contacted', 'follow_up', 'interested', 'invited', 'applied', 'approved'].includes(lead.status));

  const run = async (action) => {
    const response = await onRun(action, { confirmSend });
    if (response) setResult(response);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Outreach</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Drafts are personalized per lead. Sending uses the saved email address and moves sent leads to Reached Out.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}><StatBox label="Selected" value={leads.length} icon={StoreIcon} /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="Can email" value={withEmail.length} icon={EmailIcon} /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="Missing email" value={withoutEmail.length} icon={SearchIcon} /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="Reached before" value={alreadyReached.length} icon={SendIcon} /></Grid>
          </Grid>
          <Box sx={{ maxHeight: 220, overflow: 'auto', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Store</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.storeName}</TableCell>
                    <TableCell>{lead.email || 'No email'}</TableCell>
                    <TableCell>{statusLabel(lead.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={confirmSend} onChange={(event) => setConfirmSend(event.target.checked)} />}
            label={`I reviewed this selection and want to send outreach emails to ${withEmail.length} leads with email addresses.`}
          />
          {result && (
            <Alert severity={result.failed ? 'warning' : 'success'}>
              {result.action === 'send'
                ? `Sent ${result.sent}, skipped ${result.skipped?.length || 0}, failed ${result.failed}.`
                : `Drafted ${result.drafted}, skipped ${result.skipped?.length || 0}, failed ${result.failed}.`}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="outlined" startIcon={<AiIcon />} onClick={() => run('draft')} disabled={loading || !leads.length}>
          Draft Selected
        </Button>
        <Button variant="contained" startIcon={<SendIcon />} onClick={() => run('send')} disabled={loading || !confirmSend || !withEmail.length}>
          Send Emails
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SendLeadOutreachDialog({ lead, open, onClose, onSend, loading }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  if (!lead) return null;
  const outreach = lead.outreachDraft || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Outreach Email</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="warning">
            This will send an email to the lead, mark them as contacted, and record the outreach in activity history.
          </Alert>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{lead.storeName}</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{lead.email || 'No email saved'}</Typography>
          </Box>
          <TextField label="Subject" value={outreach.subject || ''} InputProps={{ readOnly: true }} size="small" fullWidth />
          <TextField label="Email body" value={outreach.emailBody || ''} InputProps={{ readOnly: true }} multiline minRows={6} fullWidth />
          <FormControlLabel
            control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
            label={`I reviewed this draft and want to send it to ${lead.email || 'this lead'}.`}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<SendIcon />} onClick={() => onSend(lead)} disabled={loading || !confirmed || !lead.email || !outreach.subject || !outreach.emailBody}>
          Send Email
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function LeadDrawer({ lead, open, onClose, onSave, onScore, onOutreach, onFindEmail, onMarkKnownCustomer, onManualNotFit, onLink, onCopy, onSendOutreach, actionLoading }) {
  const [form, setForm] = useState({});
  const [applicationInput, setApplicationInput] = useState('');

  useEffect(() => {
    setForm({
      status: lead?.status || 'new',
      contactName: lead?.contactName || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      website: lead?.website || '',
      fitScore: lead?.fitScore ?? '',
      scoreOverrideReason: lead?.scoreOverrideReason || '',
      notes: lead?.notes || '',
      activityNote: '',
      nextFollowUpAt: lead?.nextFollowUpAt ? String(lead.nextFollowUpAt).slice(0, 10) : '',
      lastContactedAt: lead?.lastContactedAt ? String(lead.lastContactedAt).slice(0, 10) : '',
      shippingRequired: Boolean(lead?.shippingRequired),
      preferredCarrier: lead?.preferredCarrier || '',
      shippingNotes: lead?.shippingNotes || '',
      estimatedMonthlyRepairs: lead?.estimatedMonthlyRepairs ?? '',
      invitedApplicationEmail: lead?.invitedApplicationEmail || lead?.email || '',
      inviteSentAt: lead?.inviteSentAt ? String(lead.inviteSentAt).slice(0, 10) : '',
    });
    setApplicationInput(lead?.linkedWholesaleApplicationId || lead?.email || '');
  }, [lead]);

  if (!lead) return null;
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const outreach = lead.outreachDraft || {};
  const canManualNotFit = lead.status !== 'not_fit' && lead.sourceType !== 'customer';

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 620 }, p: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{lead.storeName}</Typography>
              <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{[lead.city, lead.state].filter(Boolean).join(', ') || lead.address}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <ScoreChip score={lead.fitScore} source={lead.scoreSource} />
              <Tooltip title="Close details">
                <IconButton aria-label="Close lead details" onClick={onClose} edge="end">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label={statusLabel(lead.status)} />
            {lead.source && <Chip size="small" variant="outlined" label={lead.source} />}
            {lead.googleReviewCount ? <Chip size="small" variant="outlined" label={`${lead.googleReviewCount} reviews`} /> : null}
            {lead.googleRating ? <Chip size="small" variant="outlined" label={`${lead.googleRating} stars`} /> : null}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={() => onScore(lead)} disabled={actionLoading}>Score</Button>
          <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={() => onOutreach(lead)} disabled={actionLoading}>Draft Outreach</Button>
          {canManualNotFit && (
            <Button size="small" color="error" variant="outlined" startIcon={<BlockIcon />} onClick={() => onManualNotFit(lead)} disabled={actionLoading}>
              Manual Not Fit
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={() => onFindEmail(lead)} disabled={actionLoading || !lead.website}>Find Email</Button>
          <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => onMarkKnownCustomer(lead)} disabled={actionLoading || lead.knownCustomerSignal?.isCurrentWholesaler}>Use as Customer Seed</Button>
          {lead.website && <Button size="small" variant="outlined" endIcon={<OpenIcon />} href={lead.website} target="_blank">Website</Button>}
          {lead.googleUrl && <Button size="small" variant="outlined" endIcon={<OpenIcon />} href={lead.googleUrl} target="_blank">Google</Button>}
        </Stack>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Contact</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Google Places usually returns phone and website, but not email. Add email manually after checking the store website.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Contact name" value={form.contactName || ''} onChange={(e) => update('contactName', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Phone" value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Website" value={form.website || ''} onChange={(e) => update('website', e.target.value)} />
            </Grid>
          </Grid>
          {lead.emailDiscovery?.checkedUrls?.length ? (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: REPAIRS_UI.textSecondary }}>
              Last email search checked {lead.emailDiscovery.checkedUrls.length} page{lead.emailDiscovery.checkedUrls.length === 1 ? '' : 's'}.
            </Typography>
          ) : null}
        </Box>

        <Divider />

        {lead.knownCustomerSignal?.isCurrentWholesaler && (
          <>
            <Alert severity="success">
              Current customer seed for lookalike scoring. Google match confidence: {Math.round(Number(lead.knownCustomerSignal.matchConfidence || 0) * 100)}%.
            </Alert>
            <Divider />
          </>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Lead Fields</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status || 'new'} onChange={(e) => update('status', e.target.value)}>
                  {STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Manual fit score" type="number" value={form.fitScore} onChange={(e) => update('fitScore', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Next follow-up" type="date" value={form.nextFollowUpAt || ''} onChange={(e) => update('nextFollowUpAt', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Last contacted" type="date" value={form.lastContactedAt || ''} onChange={(e) => update('lastContactedAt', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
          <TextField sx={{ mt: 2 }} fullWidth multiline minRows={3} label="Notes" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
          <TextField sx={{ mt: 2 }} fullWidth label="Add activity note" value={form.activityNote || ''} onChange={(e) => update('activityNote', e.target.value)} />
          <Button sx={{ mt: 1 }} variant="contained" onClick={() => onSave(lead, form)} disabled={actionLoading}>Save Lead</Button>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShippingIcon fontSize="small" /> Shipping
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={Boolean(form.shippingRequired)} onChange={(e) => update('shippingRequired', e.target.checked)} />}
            label="Shipping required or likely"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Preferred carrier" value={form.preferredCarrier || ''} onChange={(e) => update('preferredCarrier', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Monthly repairs estimate" type="number" value={form.estimatedMonthlyRepairs} onChange={(e) => update('estimatedMonthlyRepairs', e.target.value)} />
            </Grid>
          </Grid>
          <TextField sx={{ mt: 2 }} fullWidth multiline minRows={2} label="Shipping notes" value={form.shippingNotes || ''} onChange={(e) => update('shippingNotes', e.target.value)} />
        </Box>

        <Divider />

        <ScoreDetailPanel lead={lead} />

        {(lead.websiteSummary || lead.websiteResearch?.summary) && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Website Signals</Typography>
              <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 1.25 }}>
                {lead.websiteSummary || lead.websiteResearch?.summary}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(lead.websiteSignals || lead.websiteResearch?.signals || {})
                  .filter(([, value]) => Boolean(value))
                  .map(([key]) => (
                    <Chip key={key} size="small" variant="outlined" label={key.replace(/([A-Z])/g, ' $1').toLowerCase()} />
                  ))}
              </Stack>
            </Box>
          </>
        )}

        {(lead.googleReviewSummary || lead.googleReviewResearch?.summary || lead.googleReviews?.length) && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Google Review Signals</Typography>
              {(lead.googleReviewSummary || lead.googleReviewResearch?.summary) && (
                <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 1.25 }}>
                  {lead.googleReviewSummary || lead.googleReviewResearch?.summary}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {Object.entries(lead.googleReviewSignals || lead.googleReviewResearch?.signals || {})
                  .filter(([, value]) => Boolean(value))
                  .map(([key]) => (
                    <Chip key={key} size="small" color="success" variant="outlined" label={key.replace(/([A-Z])/g, ' $1').toLowerCase()} />
                  ))}
              </Stack>
              {(lead.googleReviewResearch?.snippets || lead.googleReviews?.map((review) => review.text) || [])
                .filter(Boolean)
                .slice(0, 3)
                .map((snippet, index) => (
                  <Typography key={`${index}-${snippet.slice(0, 24)}`} variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.75 }}>
                    "{snippet.length > 220 ? `${snippet.slice(0, 220)}...` : snippet}"
                  </Typography>
                ))}
            </Box>
          </>
        )}

        <Divider />

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Draft Outreach</Typography>
            <Stack direction="row" spacing={0.5}>
              {outreach.inviteMessage && (
                <Tooltip title="Copy invite message">
                  <IconButton size="small" onClick={() => onCopy(outreach.inviteMessage)}><CopyIcon fontSize="small" /></IconButton>
                </Tooltip>
              )}
              {outreach.subject && outreach.emailBody && (
                <Tooltip title={lead.email ? 'Send outreach email' : 'Add an email before sending'}>
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={() => onSendOutreach(lead)}
                      disabled={actionLoading || !lead.email}
                    >
                      Send Email
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Stack>
          </Stack>
          {outreach.subject ? (
            <Stack spacing={1}>
              <TextField label="Subject" value={outreach.subject} InputProps={{ readOnly: true }} size="small" />
              <TextField label="Email" value={outreach.emailBody || ''} InputProps={{ readOnly: true }} multiline minRows={5} />
              <TextField label="Call opener" value={outreach.callOpener || ''} InputProps={{ readOnly: true }} multiline minRows={3} />
              <TextField label="Invite message" value={outreach.inviteMessage || ''} InputProps={{ readOnly: true }} multiline minRows={3} />
            </Stack>
          ) : (
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Generate outreach to create copyable drafts.</Typography>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Application Link</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={8}>
              <TextField
                size="small"
                fullWidth
                label="Application ID or email"
                value={applicationInput}
                onChange={(e) => setApplicationInput(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button fullWidth variant="outlined" startIcon={<LinkIcon />} onClick={() => onLink(lead, applicationInput)} disabled={actionLoading || !applicationInput.trim()}>
                Link
              </Button>
            </Grid>
          </Grid>
          {lead.linkedWholesaleApplicationId && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Linked to {lead.linkedWholesaleApplicationId}
            </Alert>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Activity</Typography>
          <Stack spacing={1}>
            {(lead.activity || []).slice().reverse().map((item, index) => (
              <Paper key={`${item.createdAt}-${index}`} variant="outlined" sx={{ p: 1.25 }}>
                <Typography sx={{ fontSize: 13 }}>{item.message}</Typography>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                  {item.type} - {formatDate(item.createdAt)} - {item.actor || 'system'}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Box sx={{ pt: 1, pb: 2 }}>
          <Button fullWidth variant="outlined" startIcon={<CloseIcon />} onClick={onClose}>
            Close Details
          </Button>
        </Box>
      </Stack>
    </Drawer>
  );
}

export default function WholesaleAcquisitionPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', minScore: '', city: '', state: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelImportLoading, setCancelImportLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [importJob, setImportJob] = useState(null);
  const [rescoreJob, setRescoreJob] = useState(null);
  const [fitView, setFitView] = useState('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [sendLead, setSendLead] = useState(null);
  const [businessFilter, setBusinessFilter] = useState('');
  const [sortBy, setSortBy] = useState('score_desc');

  const canAccess = session?.user && ['admin', 'dev'].includes(session.user.role);
  const importRunning = ['queued', 'running'].includes(importJob?.status);
  const rescoreRunning = ['queued', 'running'].includes(rescoreJob?.status);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await wholesaleLeadsClient.list(filters);
      setLeads(data);
      setError('');
      if (selectedLead) {
        const refreshed = data.find((lead) => lead.id === selectedLead.id);
        if (refreshed) setSelectedLead(refreshed);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!canAccess) {
      router.push('/dashboard');
      return;
    }
    loadLeads();
    wholesaleLeadsClient.latestImportJob().then((job) => {
      if (job) setImportJob(job);
    }).catch(() => {});
    wholesaleLeadsClient.latestRescoreJob().then((job) => {
      if (job) setRescoreJob(job);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, canAccess]);

  useEffect(() => {
    if (!importRunning || !importJob?.id) return undefined;
    const interval = setInterval(async () => {
      try {
        const job = await wholesaleLeadsClient.importJob(importJob.id);
        setImportJob(job);
        if (['completed', 'failed', 'cancelled'].includes(job.status)) {
          await loadLeads();
          if (job.status === 'completed') {
            setSnackbar({
              open: true,
              severity: job.progress?.scoringErrors || job.progress?.detailErrors ? 'warning' : 'success',
              message: `Import finished: checked ${job.progress?.processedCandidates || 0}, saved ${job.progress?.saved || 0}, archived ${job.progress?.rejected || 0}, found ${job.progress?.emailDiscoveries || 0} emails, skipped ${job.progress?.outOfRadius || 0} outside radius`,
            });
          } else if (job.status === 'cancelled') {
            setSnackbar({ open: true, severity: 'warning', message: 'Import cancelled' });
          } else {
            setSnackbar({ open: true, severity: 'error', message: job.error || 'Import failed' });
          }
        }
      } catch {
        // Leave the last visible status in place if a poll misses.
      }
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importJob?.id, importRunning]);

  useEffect(() => {
    if (!rescoreRunning || !rescoreJob?.id) return undefined;
    const interval = setInterval(async () => {
      try {
        const job = await wholesaleLeadsClient.rescoreJob(rescoreJob.id);
        setRescoreJob(job);
        if (['completed', 'failed'].includes(job.status)) {
          await loadLeads();
          if (job.status === 'completed') {
            setSnackbar({
              open: true,
              severity: job.progress?.failed ? 'warning' : 'success',
              message: `Rescore finished: refreshed ${job.progress?.rescored || 0}, failed ${job.progress?.failed || 0}`,
            });
          } else {
            setSnackbar({ open: true, severity: 'error', message: job.error || 'Rescore failed' });
          }
        }
      } catch {
        // Keep last visible progress if one poll fails.
      }
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescoreJob?.id, rescoreRunning]);

  const viewCounts = useMemo(() => {
    const isCurrentAccount = (lead) => Boolean(lead.knownCustomerSignal?.isCurrentWholesaler || lead.sourceType === 'customer');
    const activeLeads = leads.filter((lead) => lead.status !== 'not_fit' && !isCurrentAccount(lead));
    return {
      all: activeLeads.length,
      strong: activeLeads.filter((lead) => Number(lead.fitScore) >= 70).length,
      possible: activeLeads.filter((lead) => Number(lead.fitScore) >= 40 && Number(lead.fitScore) < 70).length,
      weak: activeLeads.filter((lead) => hasScore(lead.fitScore) && Number(lead.fitScore) < 40).length,
      reached_out: activeLeads.filter((lead) => ['contacted', 'follow_up', 'interested', 'invited', 'applied', 'approved'].includes(lead.status)).length,
      current: leads.filter(isCurrentAccount).length,
      not_fit: leads.filter((lead) => lead.status === 'not_fit').length,
      unscored: leads.filter((lead) => lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !hasScore(lead.fitScore)).length,
    };
  }, [leads]);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const score = Number(lead.fitScore);
    const isCurrentAccount = Boolean(lead.knownCustomerSignal?.isCurrentWholesaler || lead.sourceType === 'customer');
    if (!matchesBusinessFilter(lead, businessFilter)) return false;
    if (fitView === 'strong') return !isCurrentAccount && lead.status !== 'not_fit' && score >= 70;
    if (fitView === 'possible') return !isCurrentAccount && lead.status !== 'not_fit' && score >= 40 && score < 70;
    if (fitView === 'weak') return !isCurrentAccount && lead.status !== 'not_fit' && hasScore(lead.fitScore) && score < 40;
    if (fitView === 'reached_out') return !isCurrentAccount && ['contacted', 'follow_up', 'interested', 'invited', 'applied', 'approved'].includes(lead.status);
    if (fitView === 'current') return isCurrentAccount;
    if (fitView === 'not_fit') return lead.status === 'not_fit';
    if (fitView === 'unscored') return lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !hasScore(lead.fitScore);
    return !isCurrentAccount && lead.status !== 'not_fit';
  }).sort((a, b) => {
    if (sortBy === 'proximity') {
      const aDistance = Number.isFinite(Number(a.distanceMiles)) ? Number(a.distanceMiles) : Infinity;
      const bDistance = Number.isFinite(Number(b.distanceMiles)) ? Number(b.distanceMiles) : Infinity;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return Number(b.fitScore || 0) - Number(a.fitScore || 0);
    }
    if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortBy === 'follow_up') {
      const aDate = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity;
      const bDate = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity;
      return aDate - bDate;
    }
    return Number(b.fitScore || 0) - Number(a.fitScore || 0);
  }), [businessFilter, fitView, leads, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [fitView, filters.search, filters.status, filters.minScore, filters.city, filters.state, pageSize, businessFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visibleLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * pageSize;
    return visibleLeads.slice(start, start + pageSize);
  }, [page, pageCount, pageSize, visibleLeads]);

  const stats = useMemo(() => {
    const activeLeads = leads.filter((lead) => lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !lead.knownCustomerSignal?.isCurrentWholesaler);
    const qualified = activeLeads.filter((lead) => Number(lead.fitScore) >= 70).length;
    const followUps = activeLeads.filter((lead) => lead.nextFollowUpAt).length;
    const invited = leads.filter((lead) => ['invited', 'applied', 'approved'].includes(lead.status)).length;
    return { total: activeLeads.length, qualified, followUps, invited };
  }, [leads]);

  const selectedLeads = useMemo(
    () => selectedLeadIds.map((id) => leads.find((lead) => lead.id === id)).filter(Boolean),
    [leads, selectedLeadIds],
  );

  const visibleSelectableIds = useMemo(
    () => paginatedLeads.filter((lead) => lead.status !== 'not_fit').map((lead) => lead.id),
    [paginatedLeads],
  );

  const allVisibleSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => selectedLeadIds.includes(id));
  const someVisibleSelected = visibleSelectableIds.some((id) => selectedLeadIds.includes(id)) && !allVisibleSelected;
  const activeLeadIds = useMemo(
    () => leads.filter((lead) => lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !lead.knownCustomerSignal?.isCurrentWholesaler).map((lead) => lead.id),
    [leads],
  );

  const runAction = async (fn, successMessage) => {
    setActionLoading(true);
    try {
      const result = await fn();
      setSnackbar({ open: true, message: successMessage, severity: 'success' });
      await loadLeads();
      return result;
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (form) => {
    const created = await runAction(() => wholesaleLeadsClient.create(form), 'Lead added');
    if (created) setManualOpen(false);
  };

  const handleGoogleImport = async (payload) => {
    setActionLoading(true);
    try {
      const job = await wholesaleLeadsClient.googleSearch(payload);
      setImportJob(job);
      setGoogleOpen(false);
      setSnackbar({
        open: true,
        severity: 'info',
        message: 'Import queued. Run the wholesale import worker to process it and keep this page open for progress.',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelImport = async () => {
    if (!importJob?.id || cancelImportLoading) return;
    setCancelImportLoading(true);
    try {
      const job = await wholesaleLeadsClient.cancelImportJob(importJob.id);
      setImportJob(job);
      setSnackbar({ open: true, message: 'Import cancelled', severity: 'warning' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setCancelImportLoading(false);
    }
  };

  const handleScoreUnscored = async () => {
    const unscoredLeads = leads.filter((lead) => !hasScore(lead.fitScore));
    if (!unscoredLeads.length) {
      setSnackbar({ open: true, message: 'No unscored leads to score', severity: 'info' });
      return;
    }

    setActionLoading(true);
    let scored = 0;
    let failed = 0;
    try {
      for (const lead of unscoredLeads) {
        try {
          await wholesaleLeadsClient.score(lead.id);
          scored += 1;
        } catch {
          failed += 1;
        }
      }
      await loadLeads();
      setSnackbar({
        open: true,
        severity: failed ? 'warning' : 'success',
        message: `Scored ${scored} unscored leads${failed ? `; ${failed} failed` : ''}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescoreSelected = async () => {
    if (!selectedLeadIds.length) {
      setSnackbar({ open: true, message: 'Select leads to rescore first', severity: 'info' });
      return;
    }
    setActionLoading(true);
    try {
      const job = await wholesaleLeadsClient.bulkRescore({ leadIds: selectedLeadIds, scope: 'selected' });
      setRescoreJob(job);
      setSnackbar({
        open: true,
        severity: 'info',
        message: 'Rescore started. You can leave this page and come back to check progress.',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescoreActive = async () => {
    setActionLoading(true);
    try {
      const job = await wholesaleLeadsClient.bulkRescore({ scope: 'active' });
      setRescoreJob(job);
      setSnackbar({
        open: true,
        severity: 'info',
        message: 'Active lead rescore started. You can leave this page and come back to check progress.',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMatchCurrentAccounts = async () => {
    setActionLoading(true);
    try {
      const result = await wholesaleLeadsClient.matchCurrentAccounts({ limit: 100 });
      await loadLeads();
      setFitView('current');
      setSnackbar({
        open: true,
        severity: result.failed ? 'warning' : 'success',
        message: `Matched ${result.matched} current accounts (${result.created} created, ${result.updated} updated, ${result.unmatched} unmatched)`,
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (lead, form) => {
    const updated = await runAction(() => wholesaleLeadsClient.update(lead.id, form), 'Lead updated');
    if (updated) setSelectedLead(updated);
  };

  const handleScore = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.score(lead.id), 'AI score saved');
    if (updated) setSelectedLead(updated);
  };

  const handleManualNotFit = async (lead) => {
    const updated = await runAction(
      () => wholesaleLeadsClient.update(lead.id, {
        status: 'not_fit',
        fitScore: 0,
        scoreOverrideReason: 'Manual not fit',
        activityNote: 'Marked manual not fit from local knowledge.',
      }),
      'Lead archived as not fit',
    );
    if (updated) {
      setSelectedLead(updated);
      setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
      setFitView('not_fit');
    }
  };

  const handleOutreach = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.outreach(lead.id), 'Outreach draft generated');
    if (updated) setSelectedLead(updated);
  };

  const handleFindEmail = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.findEmail(lead.id), 'Email search complete');
    if (updated) setSelectedLead(updated);
  };

  const handleMarkKnownCustomer = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.markKnownCustomer(lead.id), 'Marked as current account');
    if (updated) {
      setSelectedLead(updated);
      setFitView('current');
    }
  };

  const handleToggleLeadSelection = (leadId) => {
    setSelectedLeadIds((prev) => (
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    ));
  };

  const handleToggleVisibleSelection = () => {
    setSelectedLeadIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleSelectableIds.includes(id));
      return [...new Set([...prev, ...visibleSelectableIds])];
    });
  };

  const handleSelectActiveLeads = () => {
    setSelectedLeadIds(activeLeadIds);
  };

  const handleBulkOutreach = async (action, options = {}) => {
    setActionLoading(true);
    try {
      const result = await wholesaleLeadsClient.bulkOutreach({
        leadIds: selectedLeadIds,
        action,
        confirmSend: Boolean(options.confirmSend),
      });
      await loadLeads();
      setSnackbar({
        open: true,
        severity: result.failed ? 'warning' : 'success',
        message: action === 'send'
          ? `Sent ${result.sent} outreach emails${result.skipped?.length ? `; skipped ${result.skipped.length}` : ''}`
          : `Drafted ${result.drafted} outreach emails${result.skipped?.length ? `; skipped ${result.skipped.length}` : ''}`,
      });
      if (action === 'send' && result.sent) setFitView('reached_out');
      return result;
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendLeadOutreach = async (lead) => {
    setActionLoading(true);
    try {
      const result = await wholesaleLeadsClient.bulkOutreach({
        leadIds: [lead.id],
        action: 'send',
        confirmSend: true,
      });
      await loadLeads();
      setSendLead(null);
      setFitView('reached_out');
      setSnackbar({
        open: true,
        severity: result.sent ? 'success' : 'warning',
        message: result.sent ? `Outreach sent to ${lead.storeName}` : 'Outreach was not sent',
      });
      return result;
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async (lead, input) => {
    const payload = input.includes('@') ? { email: input } : { applicationId: input };
    const updated = await runAction(() => wholesaleLeadsClient.linkApplication(lead.id, payload), 'Application linked');
    if (updated) setSelectedLead(updated);
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  if (authStatus === 'loading') return null;

  return (
    <Box sx={{ pb: 10 }}>
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box sx={{ maxWidth: 820 }}>
            <Typography
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                mb: 1.5,
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: REPAIRS_UI.textPrimary,
                backgroundColor: REPAIRS_UI.bgCard,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 2,
                textTransform: 'uppercase',
              }}
            >
              <StoreIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Wholesale acquisition
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
              Repair Partner Leads
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Find local stores, score fit, draft outreach, and invite interested prospects into the existing wholesale application flow.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadLeads} disabled={loading || actionLoading}>
              Refresh
            </Button>
            <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={handleScoreUnscored} disabled={loading || actionLoading || !viewCounts.unscored}>
              Score Unscored
            </Button>
            <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={handleRescoreSelected} disabled={loading || actionLoading || rescoreRunning || !selectedLeadIds.length}>
              Rescore Selected
            </Button>
            <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={handleRescoreActive} disabled={loading || actionLoading || rescoreRunning || !activeLeadIds.length}>
              Rescore Active
            </Button>
            <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={handleMatchCurrentAccounts} disabled={loading || actionLoading}>
              Match Current Accounts
            </Button>
            <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={() => setTemplatesOpen(true)}>
              Email Templates
            </Button>
            <Button size="small" variant="outlined" onClick={handleSelectActiveLeads} disabled={!activeLeadIds.length || actionLoading}>
              Select Active Leads
            </Button>
            <Button size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => setBulkOpen(true)} disabled={!selectedLeadIds.length || actionLoading}>
              Bulk Outreach
            </Button>
            <Button size="small" variant="outlined" startIcon={<MapIcon />} onClick={() => setGoogleOpen(true)} disabled={importRunning}>
              Google Import
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setManualOpen(true)}>
              Add Lead
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ImportJobPanel job={importJob} onCancel={handleCancelImport} cancelling={cancelImportLoading} />
      <RescoreJobPanel job={rescoreJob} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><StatBox label="Active leads" value={stats.total} icon={StoreIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Score 70+" value={stats.qualified} icon={AiIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Follow-ups" value={stats.followUps} icon={SearchIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Invited+" value={stats.invited} icon={LinkIcon} /></Grid>
      </Grid>

      <Box sx={{ p: 2, mb: 2, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="Search" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="Min score" type="number" value={filters.minScore} onChange={(e) => setFilters((p) => ({ ...p, minScore: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="City" value={filters.city} onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField fullWidth size="small" label="State" value={filters.state} onChange={(e) => setFilters((p) => ({ ...p, state: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={1}>
            <Button fullWidth variant="outlined" onClick={loadLeads}>Apply</Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Business type</InputLabel>
              <Select label="Business type" value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)}>
                {BUSINESS_FILTERS.map((option) => (
                  <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort</InputLabel>
              <Select label="Sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {Boolean(selectedLeadIds.length) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Typography>{selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? '' : 's'} selected for outreach.</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setSelectedLeadIds([])}>Clear</Button>
              <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => setBulkOpen(true)}>Bulk Outreach</Button>
            </Stack>
          </Stack>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 2, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Tabs
          value={fitView}
          onChange={(event, value) => setFitView(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 700 },
          }}
        >
          {FIT_VIEWS.map((view) => (
            <Tab
              key={view.value}
              value={view.value}
              label={`${view.label} (${viewCounts[view.value] || 0})`}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mb: 2, p: 1.5, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={handleToggleVisibleSelection}
              inputProps={{ 'aria-label': 'Select visible leads' }}
            />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              Showing {loading ? 0 : paginatedLeads.length} of {visibleLeads.length}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Per page</InputLabel>
              <Select label="Per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {[12, 24, 48, 96].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={handleToggleVisibleSelection} disabled={!visibleSelectableIds.length}>
              {allVisibleSelected ? 'Unselect Page' : 'Select Page'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : visibleLeads.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {leads.length ? 'No leads match this fit view.' : 'No wholesale leads yet.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {paginatedLeads.map((lead) => (
              <Grid key={lead.id} item xs={12} sm={6} lg={4} xl={3}>
                <LeadCard
                  lead={lead}
                  selected={selectedLeadIds.includes(lead.id)}
                  onSelect={() => handleToggleLeadSelection(lead.id)}
                  onOpen={() => setSelectedLead(lead)}
                  onScore={() => handleScore(lead)}
                  onCopyInvite={() => handleCopy(lead.outreachDraft.inviteMessage)}
                  onManualNotFit={() => handleManualNotFit(lead)}
                />
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Page {Math.min(page, pageCount)} of {pageCount}
            </Typography>
            <Pagination
              count={pageCount}
              page={Math.min(page, pageCount)}
              onChange={(event, value) => setPage(value)}
              color="primary"
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        </>
      )}

      <LeadDrawer
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onSave={handleSave}
        onScore={handleScore}
        onOutreach={handleOutreach}
        onFindEmail={handleFindEmail}
        onMarkKnownCustomer={handleMarkKnownCustomer}
        onManualNotFit={handleManualNotFit}
        onLink={handleLink}
        onCopy={handleCopy}
        onSendOutreach={setSendLead}
        actionLoading={actionLoading}
      />

      <LeadFormDialog open={manualOpen} onClose={() => setManualOpen(false)} onSubmit={handleCreate} loading={actionLoading} />
      <GoogleImportDialog open={googleOpen} onClose={() => setGoogleOpen(false)} onSubmit={handleGoogleImport} loading={actionLoading || importRunning} />
      <EmailTemplatesDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} onCopy={handleCopy} />
      <BulkOutreachDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        leads={selectedLeads}
        onRun={handleBulkOutreach}
        loading={actionLoading}
      />
      <SendLeadOutreachDialog
        lead={sendLead}
        open={Boolean(sendLead)}
        onClose={() => setSendLead(null)}
        onSend={handleSendLeadOutreach}
        loading={actionLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
