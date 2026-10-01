import { useState, useEffect } from 'react';
import { Drawer, Stack, Box, Typography, Tooltip, IconButton, Chip, Button, Divider, Alert, Grid, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, Paper } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { Close as CloseIcon, AutoAwesome as AiIcon, Block as BlockIcon, Email as EmailIcon, Link as LinkIcon, OpenInNew as OpenIcon, LocalShipping as ShippingIcon, ContentCopy as CopyIcon, Send as SendIcon } from '@mui/icons-material';
import { ScoreChip, ScoreDetailPanel } from './scorePanels';
import { STATUSES, formatDate, statusLabel } from './leadHelpers';
export function LeadDrawer({ lead, open, onClose, onSave, onScore, onOutreach, onFindEmail, onMarkKnownCustomer, onManualNotFit, onLink, onCopy, onSendOutreach, actionLoading }) {
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
                    &quot;{snippet.length > 220 ? `${snippet.slice(0, 220)}...` : snippet}&quot;
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

