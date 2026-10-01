import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Stack, TextField, Grid, FormControlLabel, Checkbox, DialogActions, Button, Typography, Alert, Paper, Box, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { ContentCopy as CopyIcon, Storefront as StoreIcon, Email as EmailIcon, Search as SearchIcon, Send as SendIcon, AutoAwesome as AiIcon } from '@mui/icons-material';
import { DEFAULT_LOCATIONS, DEFAULT_QUERIES, DEFAULT_WHOLESALE_APPLICATION_URL, EMAIL_TEMPLATES, METERS_PER_MILE, emptyLeadForm, statusLabel } from './leadHelpers';
import { StatBox } from './jobPanels';
export function LeadFormDialog({ open, onClose, onSubmit, loading }) {
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

export function GoogleImportDialog({ open, onClose, onSubmit, loading }) {
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

export function EmailTemplatesDialog({ open, onClose, onCopy }) {
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

export function BulkOutreachDialog({ open, onClose, leads, onRun, loading }) {
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

export function SendLeadOutreachDialog({ lead, open, onClose, onSend, loading }) {
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

