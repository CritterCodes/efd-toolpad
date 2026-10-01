import { Box, Stack, Typography, Button } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { Storefront as StoreIcon, Refresh as RefreshIcon, AutoAwesome as AiIcon, Link as LinkIcon, Email as EmailIcon, Send as SendIcon, Map as MapIcon, Add as AddIcon } from '@mui/icons-material';

export function AcquisitionHeader({ actionLoading, activeLeadIds, handleMatchCurrentAccounts, handleRescoreActive, handleRescoreSelected, handleScoreUnscored, handleSelectActiveLeads, importRunning, loadLeads, loading, rescoreRunning, selectedLeadIds, setBulkOpen, setGoogleOpen, setManualOpen, setTemplatesOpen, viewCounts }) {
  return (
    <>
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
            <Typography component="h1" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
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
    </>
  );
}
