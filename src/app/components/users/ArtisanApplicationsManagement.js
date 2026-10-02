'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  AutoAwesome as ArtisanIcon,
  Cancel as RejectIcon,
  CheckCircle as ApproveIcon,
  DeleteOutline as DeleteIcon,
  Email as EmailIcon,
  Search as SearchIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';
import { useArtisanApplications } from '@/hooks/admin/useArtisanApplications';
import { CardGrid, FaceliftRoot, Field, FieldList, Figure, SectionLabel, StatusChip, SurfaceCard, TabRail, facelift } from '@/components/facelift';

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'];

/**
 * Returns null, not 'N/A', when there is no date: `Field` renders an em dash for an empty value, and a
 * row reading 'N/A' beside three reading '—' is two placeholders for one idea.
 */
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function asList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function getApplicationName(application) {
  return [application.firstName, application.lastName].filter(Boolean).join(' ') || application.email || 'Unnamed applicant';
}

function statusColor(status) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending') return 'warning';
  return 'default';
}

/** The same four states as `statusColor`, in brand tokens, for the kit's tinted chip. */
function statusHue(status) {
  if (status === 'approved') return facelift.success;
  if (status === 'rejected') return facelift.error;
  if (status === 'pending') return facelift.gold;
  return facelift.text3;
}

/**
 * Four counts, and one of them is the reason you opened this page.
 *
 * These were four cards with coloured **left side-stripes** — the decoration DESIGN.md names in its Don't
 * list, and the one `/dashboard` was cleaned of in #260 — each with its number in the stripe's colour. Two
 * of the four stripes were gold, because `primary.main` and `warning.main` are both `#FBBF24` in this
 * theme. Counting the gold selected pill and the gold action button, the screen spent gold four times
 * before the reader reached an applicant.
 *
 * Gold marks the one thing to do next, so it goes to **Pending Review, and only when something is
 * pending**. Nothing waiting means nothing gold: the same conditional shape as `isNext` on the Getting
 * Started card. The rest are counts, and a count is read, not acted on.
 */
export function StatsCards({ stats }) {
  const cards = [
    { label: 'Total Applications', value: stats.total },
    { label: 'Pending Review', value: stats.pending, accentWhenSet: true },
    { label: 'Approved', value: stats.approved },
    { label: 'Rejected', value: stats.rejected },
  ];

  return (
    <FaceliftRoot>
      <Box sx={{ mb: 3 }}>
        <CardGrid min={150}>
          {cards.map((card) => (
            <SurfaceCard key={card.label}>
              <Figure
                label={card.label}
                value={card.value || 0}
                accent={Boolean(card.accentWhenSet && card.value)}
              />
            </SurfaceCard>
          ))}
        </CardGrid>
      </Box>
    </FaceliftRoot>
  );
}

function ActionDialog({ open, actionType, application, loading, onClose, onConfirm }) {
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (open) setReviewNotes('');
  }, [open]);

  if (!application) return null;

  const isReject = actionType === 'reject';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isReject ? 'Reject' : 'Approve'} Artisan Application
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <FaceliftRoot>
            <FieldList>
              <Field label="Applicant" value={getApplicationName(application)} strong />
              <Field label="Business" value={application.businessName} />
              <Field label="Email" value={application.email} mono />
            </FieldList>
          </FaceliftRoot>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Review Notes"
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder={isReject ? 'Required: explain why this application is being rejected.' : 'Optional notes about the approval.'}
            sx={{ mt: 1 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color={isReject ? 'error' : 'success'}
          disabled={loading || (isReject && !reviewNotes.trim())}
          onClick={() => onConfirm(application.applicationId, reviewNotes)}
        >
          {loading ? 'Processing...' : isReject ? 'Reject' : 'Approve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DetailDialog({ open, application, onClose }) {
  if (!application) return null;

  const artisanTypes = asList(application.artisanType);
  const specialties = asList(application.specialties);
  const services = asList(application.services);
  const materials = asList(application.materials);
  const techniques = asList(application.techniques);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Artisan Application Details</DialogTitle>
      <DialogContent>
        <FaceliftRoot>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box>
              <SectionLabel>Applicant</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <FieldList>
                  <Field label="Name" value={getApplicationName(application)} strong />
                  <Field label="Email" value={application.email} mono />
                  <Field label="Application ID" value={application.applicationId} mono />
                  <Field label="Submitted" value={formatDate(application.submittedAt)} />
                </FieldList>
              </Box>
            </Box>

            <Box>
              <SectionLabel>Business</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <FieldList>
                  <Field label="Name" value={application.businessName} strong />
                  <Field
                    label="Location"
                    value={[application.businessCity, application.businessState, application.businessCountry].filter(Boolean).join(', ')}
                  />
                  <Field label="Website" value={application.portfolioWebsite} />
                  <Field label="Instagram" value={application.instagramHandle} mono />
                </FieldList>
              </Box>
            </Box>

            <Box>
              <SectionLabel>Craft profile</SectionLabel>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5, mb: 1.5 }}>
                {[...artisanTypes, ...specialties, ...services, ...materials, ...techniques].map((item) => (
                  <Chip key={item} label={item} size="small" variant="outlined" />
                ))}
              </Stack>
              <FieldList>
                <Field label="Experience" value={application.experience || application.yearsExperience} />
              </FieldList>
              {application.about && (
                <Box sx={{ mt: 2 }}>
                  <Field label="About" value={application.about} />
                </Box>
              )}
            </Box>

            <Box>
              <SectionLabel>Status</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <FieldList>
                  <Field label="Status">
                    <StatusChip label={application.status || 'unknown'} hue={statusHue(application.status)} />
                  </Field>
                  <Field label="Reviewed" value={formatDate(application.reviewedAt)} />
                </FieldList>
              </Box>
              {application.reviewNotes && (
                <Box sx={{ mt: 2 }}>
                  <Field label="Review notes" value={application.reviewNotes} />
                </Box>
              )}
            </Box>
          </Box>
        </FaceliftRoot>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ApplicationCard({ application, onOpenDetail, onOpenAction, onDelete }) {
  const artisanTypes = asList(application.artisanType);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <ArtisanIcon />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" noWrap>
              {application.businessName || getApplicationName(application)}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {getApplicationName(application)}{application.email ? ` - ${application.email}` : ''}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip label={application.status || 'unknown'} color={statusColor(application.status)} size="small" />
          {artisanTypes.slice(0, 3).map((type) => (
            <Chip key={type} label={type} size="small" variant="outlined" />
          ))}
        </Stack>

        <FaceliftRoot>
          <FieldList>
            <Field label="Submitted" value={formatDate(application.submittedAt)} />
            <Field
              label="Location"
              value={[application.businessCity, application.businessState].filter(Boolean).join(', ')}
            />
            <Field label="Portfolio" value={application.portfolioWebsite} />
          </FieldList>
        </FaceliftRoot>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => onOpenDetail(application)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
          {application.status === 'pending' && (
            <>
              <Tooltip title="Approve application">
                <IconButton size="small" color="success" onClick={() => onOpenAction(application, 'approve')}>
                  <ApproveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject application">
                <IconButton size="small" color="error" onClick={() => onOpenAction(application, 'reject')}>
                  <RejectIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          {application.email && (
            <Tooltip title="Email applicant">
              <IconButton size="small" href={`mailto:${application.email}`}>
                <EmailIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete application">
            <IconButton size="small" color="error" onClick={() => onDelete(application)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ArtisanApplicationsManagement() {
  const searchParams = useSearchParams();
  const initialStatus = STATUS_TABS.includes(searchParams.get('status')) ? searchParams.get('status') : 'pending';
  const {
    applications,
    stats,
    loading,
    error,
    approveApplication,
    rejectApplication,
    deleteApplication
  } = useArtisanApplications();
  const [statusTab, setStatusTab] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    setStatusTab(initialStatus);
  }, [initialStatus]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus = statusTab === 'all' || application.status === statusTab;
      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        getApplicationName(application),
        application.email,
        application.businessName,
        application.applicationId,
        ...asList(application.artisanType),
        ...asList(application.specialties)
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [applications, search, statusTab]);

  const openActionDialog = (application, action) => {
    setSelectedApplication(application);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const openDetailDialog = (application) => {
    setSelectedApplication(application);
    setDetailDialogOpen(true);
  };

  const confirmAction = async (applicationId, reviewNotes) => {
    if (actionType === 'approve') {
      await approveApplication(applicationId, reviewNotes);
    } else {
      await rejectApplication(applicationId, reviewNotes);
    }
    setActionDialogOpen(false);
  };

  const handleDelete = async (application) => {
    const confirmed = window.confirm(`Delete artisan application for ${getApplicationName(application)}?`);
    if (!confirmed) return;
    await deleteApplication(application.applicationId);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Artisan Applications
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Review new artisan applicants, approve them into active artisan accounts, and manage rejected applications.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StatsCards stats={stats} />

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search name, email, business, application ID, or artisan type"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <TabRail
          ariaLabel="Application states"
          value={statusTab}
          onChange={setStatusTab}
          items={[
            { key: 'pending', label: 'Pending', count: stats.pending || 0 },
            { key: 'approved', label: 'Approved', count: stats.approved || 0 },
            { key: 'rejected', label: 'Rejected', count: stats.rejected || 0 },
            { key: 'all', label: 'All', count: stats.total || applications.length },
          ]}
        />
      </Box>

      {loading && applications.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredApplications.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          No artisan applications found.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filteredApplications.map((application) => (
            <Grid item xs={12} md={6} lg={4} key={application.applicationId || application.userID}>
              <ApplicationCard
                application={application}
                onOpenDetail={openDetailDialog}
                onOpenAction={openActionDialog}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ActionDialog
        open={actionDialogOpen}
        actionType={actionType}
        application={selectedApplication}
        loading={loading}
        onClose={() => setActionDialogOpen(false)}
        onConfirm={confirmAction}
      />

      <DetailDialog
        open={detailDialogOpen}
        application={selectedApplication}
        onClose={() => setDetailDialogOpen(false)}
      />
    </Box>
  );
}
