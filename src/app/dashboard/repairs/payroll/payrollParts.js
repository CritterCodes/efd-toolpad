import { Card, CardContent, Typography, Stack, Chip, Box } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { payrollTotal, splitBatchPay } from '@/services/payrollUtils';
export function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

// Payroll weeks run Sunday–Saturday (services/payrollUtils.getPayrollWeekStart).
export function getMondayOfWeek(date = new Date()) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getRepairChargeTotal(repair = {}) {
  const taskTotal = (repair.tasks || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.retailPrice) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);
  const materialTotal = (repair.materials || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.unitCost ?? item?.costPerPortion) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);
  const customTotal = (repair.customLineItems || []).reduce((sum, item) => (
    sum + ((Number(item?.price) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);

  const computedTotal = taskTotal + materialTotal + customTotal;
  return Number(repair.totalCost || 0) > 0 ? Number(repair.totalCost || 0) : computedTotal;
}

export function getWorkItemLabels(repair = {}) {
  return [
    ...(repair.tasks || []).map((item) => item.name || item.title || item.description),
    ...(repair.processes || []).map((item) => item.name || item.title || item.description),
    ...(repair.materials || []).map((item) => item.name || item.description || item.itemNumber),
    ...(repair.customLineItems || []).map((item) => item.description),
  ].filter(Boolean);
}

export function QueueCard({ candidate, onOpen }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(candidate)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(candidate);
        }
      }}
      sx={{
        bgcolor: REPAIRS_UI.bgPanel,
        border: `1px solid ${REPAIRS_UI.border}`,
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'border-color 120ms ease, transform 120ms ease',
        '&:hover, &:focus-visible': {
          borderColor: REPAIRS_UI.accent,
          transform: 'translateY(-1px)',
          outline: 'none',
        },
      }}
    >
      <CardContent>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
          {candidate.userName}
        </Typography>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
          Week of {new Date(candidate.weekStart).toLocaleDateString()}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {candidate.isOwnerOperator && <Chip label="Owner / Operator" size="small" color="secondary" />}
          <Chip label={`Hours ${Number(candidate.laborHours || 0).toFixed(2)}`} size="small" />
          <Chip label={`Repairs ${candidate.repairsWorked || 0}`} size="small" />
          <Chip label={`Pay ${formatMoney(payrollTotal(candidate))}`} size="small" />
          {Number(candidate.salePay || 0) > 0 && <Chip label={`Labor ${formatMoney(splitBatchPay(candidate).laborPay)} · Sales ${formatMoney(candidate.salePay)}`} size="small" color="success" />}
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
          {candidate.entryCount || 0} unbatched payout entr{candidate.entryCount === 1 ? 'y' : 'ies'}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function HistoryCard({ batch, onOpen }) {
  const statusColor = batch.status === 'paid' ? 'success' : batch.status === 'void' ? 'default' : 'warning';
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(batch)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(batch);
        }
      }}
      sx={{
        bgcolor: REPAIRS_UI.bgPanel,
        border: `1px solid ${REPAIRS_UI.border}`,
        borderRadius: 3,
        cursor: 'pointer',
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
              {batch.userName}
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              {batch.cadence === 'daily' ? 'Day' : 'Week'} of {new Date(batch.weekStart).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip label={batch.status} size="small" color={statusColor} />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {batch.isOwnerOperator && <Chip label="Owner / Operator" size="small" color="secondary" />}
          <Chip label={`Hours ${Number(batch.laborHours || 0).toFixed(2)}`} size="small" />
          <Chip label={`Repairs ${batch.repairsWorked || 0}`} size="small" />
          <Chip label={`Pay ${formatMoney(payrollTotal(batch))}`} size="small" />
          {Number(batch.salePay || 0) > 0 && <Chip label={`Labor ${formatMoney(splitBatchPay(batch).laborPay)} · Sales ${formatMoney(batch.salePay)}`} size="small" color="success" />}
        </Stack>
        {batch.paidAt && (
          <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
            Paid {new Date(batch.paidAt).toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function OwnerDrawCard({ draw, onOpen }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(draw)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(draw);
        }
      }}
      sx={{
        bgcolor: REPAIRS_UI.bgPanel,
        border: `1px solid ${REPAIRS_UI.border}`,
        borderRadius: 3,
        cursor: 'pointer',
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
              {draw.userName}
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              {new Date(draw.drawDate).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip
            label={draw.status}
            size="small"
            color={draw.status === 'void' ? 'default' : 'secondary'}
          />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Chip label={formatMoney(draw.amount)} size="small" />
          {draw.paymentMethod && <Chip label={draw.paymentMethod} size="small" />}
        </Stack>
        {draw.notes && (
          <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
            {draw.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

