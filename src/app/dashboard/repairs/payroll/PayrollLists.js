import { Box, CircularProgress, Grid, Card, CardContent, Typography, Button, Alert } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { QueueCard, HistoryCard, OwnerDrawCard } from './payrollParts';

export function PayrollLists({ history, loading, openBatch, openCandidate, openOwnerDraw, ownerDraws, ownerOperators, queue, tab }) {
  return (
    <>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : tab === 'queue' ? (
        <Grid container spacing={2}>
          {queue.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No eligible payroll candidates are available right now.</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : queue.map((candidate) => (
            <Grid item xs={12} md={6} lg={4} key={`${candidate.userID}-${candidate.weekStart}`}>
              <QueueCard candidate={candidate} onOpen={openCandidate} />
            </Grid>
          ))}
        </Grid>
      ) : tab === 'history' ? (
        <Grid container spacing={2}>
          {history.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No payroll batches have been created yet.</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : history.map((batch) => (
            <Grid item xs={12} md={6} lg={4} key={batch.batchID}>
              <HistoryCard batch={batch} onOpen={openBatch} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => openOwnerDraw(null)}
              sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#FFCF4D' } }}
            >
              Record Owner Draw
            </Button>
          </Box>

          {ownerOperators.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No users are marked as owner / operator yet. Enable that flag from the artisan details compensation profile before recording draws.
            </Alert>
          )}

          <Grid container spacing={2}>
            {ownerDraws.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No owner draws have been recorded yet.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : ownerDraws.map((draw) => (
              <Grid item xs={12} md={6} lg={4} key={draw.drawID}>
                <OwnerDrawCard draw={draw} onOpen={openOwnerDraw} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </>
  );
}
