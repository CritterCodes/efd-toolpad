import { Dialog, DialogTitle, Typography, IconButton, DialogContent, Box, CircularProgress, Stack, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Chip, Divider, Button, DialogActions } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import CloseIcon from '@mui/icons-material/Close';
import { formatMoney, getWorkItemLabels, getRepairChargeTotal } from './payrollParts';
import { payrollTotal, splitBatchPay } from '@/services/payrollUtils';
import ConnectPayoutCard from '@/components/payroll/ConnectPayoutCard';

export function PayrollDialog({ actionLoading, closeDialog, createBatch, dialogLoading, notes, ownerDrawAmount, ownerDrawDate, ownerDrawUserID, ownerOperators, paidAt, paymentMethod, paymentReference, router, saveOwnerDraw, selectedDetail, selectedMode, setNotes, setOwnerDrawAmount, setOwnerDrawDate, setOwnerDrawUserID, setPaidAt, setPaymentMethod, setPaymentReference, toggleOwnerOperator, updateBatch, voidOwnerDraw }) {
  return (
    <>
      <Dialog
        open={Boolean(selectedMode)}
        onClose={closeDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: REPAIRS_UI.bgPanel,
            color: REPAIRS_UI.textPrimary,
            border: `1px solid ${REPAIRS_UI.border}`,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pr: 7 }}>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
            {selectedMode === 'candidate'
              ? 'Payroll Candidate'
              : selectedMode === 'owner_draw'
                ? 'Owner Draw'
                : 'Payroll Batch'}
          </Typography>
          <IconButton onClick={closeDialog} sx={{ position: 'absolute', right: 12, top: 12, color: REPAIRS_UI.textSecondary }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: REPAIRS_UI.border }}>
          {dialogLoading || (selectedMode !== 'owner_draw' && !selectedDetail) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
          ) : selectedMode === 'owner_draw' ? (
            <Stack spacing={2}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Owner / Operator</InputLabel>
                    <Select
                      value={ownerDrawUserID}
                      label="Owner / Operator"
                      onChange={(e) => setOwnerDrawUserID(e.target.value)}
                    >
                      {ownerOperators.map((user) => (
                        <MenuItem key={user.userID} value={user.userID}>{user.userName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Amount"
                    size="small"
                    type="number"
                    fullWidth
                    value={ownerDrawAmount}
                    onChange={(e) => setOwnerDrawAmount(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Draw Date"
                    size="small"
                    type="datetime-local"
                    fullWidth
                    value={ownerDrawDate}
                    onChange={(e) => setOwnerDrawDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Payment Method"
                    size="small"
                    fullWidth
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder="Cash, Zelle, Check"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Reference"
                    size="small"
                    fullWidth
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Notes"
                size="small"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={3}
              />

              {selectedDetail?.status && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={selectedDetail.userName || 'Owner / Operator'} />
                  <Chip label={selectedDetail.status} />
                </Stack>
              )}
            </Stack>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                <Chip label={selectedDetail.userName || 'Jeweler'} />
                {selectedDetail.isOwnerOperator && <Chip label="Owner / Operator" color="secondary" />}
                <Chip label={`${selectedDetail.cadence === 'daily' ? 'Day' : 'Week'} of ${new Date(selectedDetail.weekStart).toLocaleDateString()}`} />
                <Chip label={`Hours ${Number(selectedDetail.laborHours || 0).toFixed(2)}`} />
                <Chip label={`Pay ${formatMoney(payrollTotal(selectedDetail))}`} />
                {Number(selectedDetail.salePay || 0) > 0 && <Chip label={`Labor ${formatMoney(splitBatchPay(selectedDetail).laborPay)} · Sales ${formatMoney(selectedDetail.salePay)}`} color="success" />}
                <Chip label={`Repairs ${selectedDetail.repairsWorked || 0}`} />
                {selectedDetail.status && <Chip label={selectedDetail.status} />}
              </Stack>

              {selectedMode === 'batch' && (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    label="Notes"
                    size="small"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    minRows={2}
                  />
                  {(selectedDetail.status === 'finalized' || selectedDetail.status === 'paid') && (
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Paid At"
                          size="small"
                          type="datetime-local"
                          fullWidth
                          value={paidAt}
                          onChange={(e) => setPaidAt(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          select
                          label="Payment Method"
                          size="small"
                          fullWidth
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          helperText="Required to record a payment made by hand"
                        >
                          {['cash', 'check', 'transfer', 'other'].map((m) => (
                            <MenuItem key={m} value={m}>{m}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Reference"
                          size="small"
                          fullWidth
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Stack>
              )}

              <Stack spacing={1.5}>
                {(selectedDetail.salePayouts || []).map((payout) => (
                  <Box
                    key={payout.payoutID}
                    sx={{
                      border: `1px solid ${REPAIRS_UI.border}`,
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: REPAIRS_UI.bgPrimary,
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                          Sale payout · {payout.invoiceID}
                        </Typography>
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                          {payout.saleDescription || 'Jewelry sale'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                          {formatMoney(payout.payoutAmount)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                          Gross {formatMoney(payout.grossSale)} · Consignment -{formatMoney(payout.consignmentAmount)}
                        </Typography>
                        {Number(payout.actualLaborDeduction || 0) > 0 && (
                          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
                            Labor deduction -{formatMoney(payout.actualLaborDeduction)}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      <Chip size="small" label="Consignment sale" color="success" />
                      {(payout.linkedRepairIDs || []).map((repairID) => <Chip key={repairID} size="small" label={repairID} />)}
                    </Stack>
                  </Box>
                ))}
                {(selectedDetail.logs || []).map((log) => {
                  const workItems = getWorkItemLabels(log.repair);
                  const repairChargeTotal = getRepairChargeTotal(log.repair);
                  const exceedsTicketValue = repairChargeTotal > 0 && Number(log.creditedValue || 0) > repairChargeTotal;
                  return (
                    <Box
                      key={log.logID}
                      sx={{
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 2,
                        p: 1.5,
                        bgcolor: REPAIRS_UI.bgPrimary,
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                            {log.repair?.clientName || log.repair?.businessName || 'Repair'} · {log.repairID}
                          </Typography>
                          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                            {log.repair?.description || 'No repair description saved.'}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                            {formatMoney(log.creditedValue)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                            {Number(log.creditedLaborHours || 0).toFixed(2)}h @ {formatMoney(log.laborRateSnapshot)}/hr
                          </Typography>
                          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
                            Ticket {formatMoney(repairChargeTotal)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {log.repair?.status && <Chip size="small" label={log.repair.status} />}
                        {exceedsTicketValue && <Chip size="small" color="warning" label="Pay exceeds ticket" />}
                      </Stack>
                      {workItems.length > 0 && (
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
                          Work: {workItems.slice(0, 5).join(', ')}
                          {workItems.length > 5 ? ` +${workItems.length - 5} more` : ''}
                        </Typography>
                      )}
                      {log.notes && (
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5 }}>
                          Notes: {log.notes}
                        </Typography>
                      )}
                      <Divider sx={{ borderColor: REPAIRS_UI.border, my: 1 }} />
                      <Button
                        size="small"
                        onClick={() => router.push(`/dashboard/repairs/${log.repairID}`)}
                        sx={{ color: REPAIRS_UI.accent, px: 0 }}
                      >
                        Open Repair
                      </Button>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
          {selectedMode === 'batch' && selectedDetail?.userID && (
            <Box sx={{ mt: 2 }}>
              <ConnectPayoutCard adminFor={selectedDetail.userID} sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}` }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog} disabled={actionLoading}>Close</Button>
          {selectedMode !== 'owner_draw' && selectedDetail?.userID && (
            <Button onClick={toggleOwnerOperator} disabled={actionLoading} color="inherit">
              {actionLoading
                ? 'Saving...'
                : selectedDetail.isOwnerOperator
                  ? 'Remove Owner / Operator'
                  : 'Mark Owner / Operator'}
            </Button>
          )}
          {selectedMode === 'owner_draw' && (
            <>
              {selectedDetail?.drawID && selectedDetail?.status !== 'void' && (
                <Button onClick={voidOwnerDraw} disabled={actionLoading} color="inherit">
                  {actionLoading ? 'Saving...' : 'Void Draw'}
                </Button>
              )}
              <Button
                variant="contained"
                onClick={saveOwnerDraw}
                disabled={actionLoading || ownerOperators.length === 0}
                sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#FFCF4D' } }}
              >
                {actionLoading ? 'Saving...' : selectedDetail?.drawID ? 'Save Draw' : 'Record Draw'}
              </Button>
            </>
          )}
          {selectedMode === 'candidate' && selectedDetail && (
            <Button
              variant="contained"
              onClick={createBatch}
              disabled={actionLoading}
              sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#FFCF4D' } }}
            >
              {actionLoading ? 'Creating...' : 'Create Batch'}
            </Button>
          )}
          {selectedMode === 'batch' && selectedDetail?.status === 'draft' && (
            <>
              <Button onClick={() => updateBatch('void')} disabled={actionLoading} color="inherit">
                {actionLoading ? 'Saving...' : 'Void Batch'}
              </Button>
              <Button
                variant="contained"
                onClick={() => updateBatch('finalize')}
                disabled={actionLoading}
                sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#FFCF4D' } }}
              >
                {actionLoading ? 'Saving...' : 'Finalize Batch'}
              </Button>
            </>
          )}
          {selectedMode === 'batch' && selectedDetail?.status === 'finalized' && (
            <>
              <Button onClick={() => updateBatch('void')} disabled={actionLoading} color="inherit">
                {actionLoading ? 'Saving...' : 'Void Batch'}
              </Button>
              {/* Paid by hand — cash, a check, a bank transfer. Needs a method, which is what keeps
                  this from becoming the silent ledger settlement it replaced (owner, 2026-09-29). */}
              <Button
                onClick={() => updateBatch('mark_paid')}
                disabled={actionLoading || !paymentMethod}
                sx={{ color: REPAIRS_UI.textSecondary }}
              >
                {actionLoading ? 'Saving...' : paymentMethod ? `Record ${paymentMethod} payment` : 'Record payment'}
              </Button>
              <Button
                variant="contained"
                onClick={() => updateBatch('pay_stripe')}
                disabled={actionLoading}
                sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#FFCF4D' } }}
              >
                {actionLoading ? 'Paying...' : 'Pay now via Stripe'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
