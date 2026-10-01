import { Paper, Stack, Checkbox, Box, Typography, Chip, Tooltip, IconButton } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { Email as EmailIcon, Block as BlockIcon, AutoAwesome as AiIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { CompactScoreBreakdown, ScoreChip } from './scorePanels';
import { formatDate, statusLabel } from './leadHelpers';
export function LeadCard({ lead, selected, onSelect, onOpen, onScore, onCopyInvite, onManualNotFit }) {
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

