import { Card, CardContent, Typography, Stack, Chip, Box } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export function PayrollDiagnostics({ diagnostics }) {
  return (
    <>
      {diagnostics && (
        <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, mb: 1.5 }}>
              Payroll Diagnostics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              {(diagnostics.reviewedSummary || []).map((item) => (
                <Chip
                  key={`review-${String(item._id)}`}
                  label={`${item._id ? 'Pending Review' : 'Reviewed'} ${item.count}`}
                  size="small"
                />
              ))}
              {(diagnostics.payrollSummary || []).map((item) => (
                <Chip
                  key={`payroll-${String(item._id)}`}
                  label={`${item._id || 'unbatched'} ${item.count}`}
                  size="small"
                />
              ))}
            </Stack>
            {(diagnostics.repairsSentToQcWithoutLogs || []).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <WarningAmberIcon sx={{ color: REPAIRS_UI.accent, fontSize: 18 }} />
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                    Repairs sent to QC this week with no labor log
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  {diagnostics.repairsSentToQcWithoutLogs.slice(0, 6).map((repair) => (
                    <Typography key={repair.repairID} variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
                      {repair.repairID} · {repair.clientName || repair.businessName || 'Unknown client'}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
