import { Grid, Card, CardContent, Typography } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { formatMoney } from './payrollParts';

export function PayrollStats({ ownerDrawSummary, ownerLaborPaid, ownerLaborUnpaid }) {
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                Owner Labor Paid
              </Typography>
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, fontSize: 28, mt: 0.5 }}>
                {formatMoney(ownerLaborPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                Owner Labor Unpaid
              </Typography>
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, fontSize: 28, mt: 0.5 }}>
                {formatMoney(ownerLaborUnpaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                Owner Draws Recorded
              </Typography>
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, fontSize: 28, mt: 0.5 }}>
                {formatMoney(ownerDrawSummary.amount)}
              </Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                {ownerDrawSummary.count || 0} draw{ownerDrawSummary.count === 1 ? '' : 's'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
