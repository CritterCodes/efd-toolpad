import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

function UserSummary({ title, user }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="body2">{user.businessName || `${user.firstName} ${user.lastName}`.trim() || 'Unknown'}</Typography>
      <Typography variant="caption" color="text.secondary">{user.email || 'No email'}</Typography>
      {user.userID && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace' }}>
          {user.userID}
        </Typography>
      )}
    </Box>
  );
}

function EmptyState({ message }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  );
}

export default function ReconciliationList({ reconciliation, onAction, loading }) {
  const legacyWholesalers = reconciliation?.legacyWholesalers || [];
  const safeMatches = reconciliation?.safeMatches || [];
  const ambiguousMatches = reconciliation?.ambiguousMatches || [];

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Reconciliation uses exact normalized email matches first. Legacy wholesalers can be backfilled without creating a new wholesale identity.
      </Alert>

      <Box>
        <Typography variant="h6" gutterBottom>Legacy Wholesalers Missing Canonical Profile</Typography>
        {legacyWholesalers.length === 0 ? (
          <EmptyState message="No legacy wholesalers need profile backfill." />
        ) : (
          <Grid container spacing={2}>
            {legacyWholesalers.map((item) => (
              <Grid item xs={12} md={6} key={item.wholesaler.id}>
                <Card variant="outlined">
                  <CardContent>
                    <UserSummary title="Active Wholesaler" user={item.wholesaler} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                      Missing `wholesaleApplication`; account settings are currently falling back to legacy user fields.
                    </Typography>
                    <Button
                      sx={{ mt: 2 }}
                      variant="contained"
                      disabled={loading}
                      onClick={() => onAction({ action: 'backfill-legacy', targetUserId: item.wholesaler.id })}
                    >
                      Backfill Canonical Profile
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>Safe Applicant Matches</Typography>
        {safeMatches.length === 0 ? (
          <EmptyState message="No one-to-one applicant matches found." />
        ) : (
          <Grid container spacing={2}>
            {safeMatches.map((item) => {
              const candidate = item.candidates[0];
              return (
                <Grid item xs={12} key={item.applicationId}>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={5}>
                          <UserSummary title="Applicant" user={item.applicant} />
                        </Grid>
                        <Grid item xs={12} md={5}>
                          <UserSummary title="Matched Wholesaler" user={candidate} />
                          {candidate.conflictFields?.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {candidate.conflictFields.map((field) => (
                                <Chip key={field} label={field} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                              ))}
                            </Box>
                          )}
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Stack spacing={1}>
                            <Button
                              variant="contained"
                              disabled={loading}
                              onClick={() => onAction({
                                action: 'merge-application',
                                applicationId: item.applicationId,
                                targetUserId: candidate.id,
                              })}
                            >
                              Link + Merge
                            </Button>
                            <Button
                              variant="outlined"
                              disabled={loading}
                              onClick={() => onAction({
                                action: 'dismiss-match',
                                applicationId: item.applicationId,
                                dismissedUserIds: [candidate.userID || candidate.id],
                              })}
                            >
                              Keep Separate
                            </Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>Ambiguous Matches Requiring Review</Typography>
        {ambiguousMatches.length === 0 ? (
          <EmptyState message="No ambiguous applicant matches found." />
        ) : (
          <Grid container spacing={2}>
            {ambiguousMatches.map((item) => (
              <Grid item xs={12} key={item.applicationId}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <UserSummary title="Applicant" user={item.applicant} />
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <Typography variant="subtitle2" gutterBottom>Possible Wholesale Accounts</Typography>
                        <Stack spacing={1.5}>
                          {item.candidates.map((candidate) => (
                            <Box
                              key={candidate.id}
                              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
                            >
                              <Box>
                                <Typography variant="body2">{candidate.businessName || `${candidate.firstName} ${candidate.lastName}`.trim() || 'Unknown'}</Typography>
                                <Typography variant="caption" color="text.secondary">{candidate.email || 'No email'}</Typography>
                                {candidate.conflictFields?.length > 0 && (
                                  <Box sx={{ mt: 0.5 }}>
                                    {candidate.conflictFields.map((field) => (
                                      <Chip key={field} label={field} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Button
                                variant="contained"
                                disabled={loading}
                                onClick={() => onAction({
                                  action: 'merge-application',
                                  applicationId: item.applicationId,
                                  targetUserId: candidate.id,
                                })}
                              >
                                Merge Into This Account
                              </Button>
                            </Box>
                          ))}
                        </Stack>
                        <Button
                          sx={{ mt: 2 }}
                          variant="outlined"
                          disabled={loading}
                          onClick={() => onAction({
                            action: 'dismiss-match',
                            applicationId: item.applicationId,
                            dismissedUserIds: item.candidates.map((candidate) => candidate.userID || candidate.id),
                          })}
                        >
                          Keep Separate / Dismiss Suggestions
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Stack>
  );
}
