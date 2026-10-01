import { Box, CircularProgress, Typography, Grid, Stack, Pagination } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { LeadCard } from './LeadCard';

export function LeadList({ handleCopy, handleManualNotFit, handleScore, handleToggleLeadSelection, leads, loading, page, pageCount, paginatedLeads, selectedLeadIds, setPage, setSelectedLead, visibleLeads }) {
  return (
    <>
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
    </>
  );
}
