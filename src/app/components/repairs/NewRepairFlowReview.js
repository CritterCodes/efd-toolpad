import { Stack, Box, Typography, TextField, FormControlLabel, Switch } from '@mui/material';
import { facelift, QuietButton, ChoiceList, ChoiceRow, SectionLabel } from '@/components/facelift';
import { ReviewRow, OptionPicker, RingSizePicker, initials } from './NewRepairFlowParts';
import { METAL_TYPES, GOLD_COLORS } from '@/constants/customRequest.constants';
import PromiseDateSuggestion from '@/app/components/repairs/PromiseDateSuggestion';
import { TotalCostCard } from '@/app/components/repairs/NewRepairForm';

export function NewRepairFlowReview({ benchJewelers, formData, getJewelerLabel, isComped, isQuote, isWholesale, itemCount, itemsSubtotal, karatOptions, metalSummary, picturePreviewUrl, pricingSettings, pricingTotals, promiseDateContext, promiseDateError, promiseDateEstimate, promiseDateLoading, quoteIntent, reviewTotal, rushJobInfo, setFormData, setShowFullBreakdown, setStep, showFullBreakdown, step, submitMode, wholesalerPricingSettings }) {
  return (
    <>
      {/* ── Step 4 — Review (summary rows, tap to edit) ───────────────── */}
      {step === 3 && (
        <Stack spacing={2.5}>
          {/* Header block: photo thumb + client + the sentence. */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flexShrink: 0, width: 58, height: 58, borderRadius: '11px', border: `1px dashed rgba(255,255,255,0.22)`, backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {picturePreviewUrl
                ? <img src={picturePreviewUrl} alt="Piece" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.5rem', textTransform: 'uppercase', color: facelift.text4 }}>Img</Typography>}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.014em' }}>
                {formData.clientName
                  || (formData.clientNotProvided ? `No client given · ${formData.storeName || 'the store'}` : 'No client yet')}
              </Typography>
              <Typography sx={{ mt: 0.375, fontSize: '0.8125rem', lineHeight: 1.45, color: facelift.text2 }}>
                {formData.smartIntakeInput || formData.description || 'No description yet'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ pt: 1 }}>
            <ReviewRow
              label="Description"
              value={formData.description ? '✓' : 'Required'}
              valueColor={formData.description ? '#34D399' : '#F87171'}
              editor={(
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What the ticket says."
                  inputProps={{ style: { fontSize: 16 } }}
                />
              )}
            />
            <ReviewRow
              label="Metal"
              value={metalSummary}
              editor={(
                <Stack spacing={1.5}>
                  <OptionPicker
                    options={METAL_TYPES}
                    value={formData.metalType}
                    onChange={(value) => setFormData((prev) => ({ ...prev, metalType: value, goldColor: '', karat: '' }))}
                    ariaLabel="Metal type"
                  />
                  {karatOptions.length > 0 && (
                    <OptionPicker
                      options={karatOptions}
                      value={formData.karat}
                      onChange={(value) => setFormData((prev) => ({ ...prev, karat: value }))}
                      ariaLabel="Karat or purity"
                    />
                  )}
                  {formData.metalType === 'gold' && (
                    <OptionPicker
                      options={GOLD_COLORS}
                      value={formData.goldColor}
                      onChange={(value) => setFormData((prev) => ({ ...prev, goldColor: value }))}
                      ariaLabel="Gold color"
                    />
                  )}
                </Stack>
              )}
            />
            <ReviewRow
              label="Ring size"
              value={formData.isRing
                ? (formData.currentRingSize && formData.desiredRingSize ? `${formData.currentRingSize} → ${formData.desiredRingSize}` : 'Sizes required')
                : 'Not a ring'}
              valueColor={formData.isRing && !(formData.currentRingSize && formData.desiredRingSize) ? '#F87171' : undefined}
              editor={(
                <Stack spacing={1.25}>
                  <FormControlLabel
                    sx={{ minHeight: 44 }}
                    control={
                      <Switch
                        checked={formData.isRing}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          isRing: e.target.checked,
                          currentRingSize: e.target.checked ? prev.currentRingSize : '',
                          desiredRingSize: e.target.checked ? prev.desiredRingSize : ''
                        }))}
                      />
                    }
                    label="This item is a ring"
                  />
                  {formData.isRing && (
                    <>
                      <RingSizePicker
                        label="Current ring size"
                        value={formData.currentRingSize}
                        onChange={(value) => setFormData((prev) => ({ ...prev, currentRingSize: value }))}
                      />
                      <RingSizePicker
                        label="Desired ring size"
                        value={formData.desiredRingSize}
                        onChange={(value) => setFormData((prev) => ({ ...prev, desiredRingSize: value }))}
                      />
                    </>
                  )}
                </Stack>
              )}
            />
            <ReviewRow
              label="Work items"
              value={quoteIntent ? 'Quote requested' : `${itemCount} · $${itemsSubtotal.toFixed(2)}`}
              valueColor={quoteIntent ? facelift.gold : undefined}
              editor={(
                <QuietButton onClick={() => setStep(2)} aria-label="Edit work items">
                  Edit on the Work items step
                </QuietButton>
              )}
            />
            {isQuote ? null : !isWholesale ? (
              /* The suggestion component prefills an empty promise date from
                 the shop-workload estimate, but only while mounted — so the
                 editor opens itself while no date is set, and folds shut once
                 the suggestion lands (tap Edit to change it). */
              <ReviewRow
                label="Promise date"
                value={formData.promiseDate
                  || (promiseDateLoading ? 'Calculating…' : promiseDateEstimate?.suggestedDateString ? 'Suggested' : 'Required')}
                valueColor={formData.promiseDate ? undefined : '#F87171'}
                defaultOpen={!formData.promiseDate}
                autoCollapse={Boolean(formData.promiseDate)}
                editor={(
                  <PromiseDateSuggestion
                    estimate={promiseDateEstimate}
                    context={promiseDateContext}
                    loading={promiseDateLoading}
                    error={promiseDateError}
                    value={formData.promiseDate}
                    onChange={(v) => setFormData((prev) => ({ ...prev, promiseDate: v }))}
                    deliveryDays={promiseDateContext?.deliveryDays}
                  />
                )}
              />
            ) : (
              /* Wholesale: the estimate is read-only and mirrors the shop
                 schedule continuously, so it stays mounted, not collapsed. */
              <Box sx={{ py: 1, borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                <Typography sx={{ fontSize: '0.8125rem', color: facelift.text2 }}>Promise date</Typography>
                <PromiseDateSuggestion
                  readOnly
                  estimate={promiseDateEstimate}
                  context={promiseDateContext}
                  loading={promiseDateLoading}
                  error={promiseDateError}
                  value={formData.promiseDate}
                  onChange={(v) => setFormData((prev) => ({ ...prev, promiseDate: v }))}
                  deliveryDays={promiseDateContext?.deliveryDays}
                />
              </Box>
            )}
            <ReviewRow
              label="Rush"
              value={formData.isRush ? `Yes · x${pricingSettings?.rushMultiplier ?? '—'}` : 'No'}
              valueColor={formData.isRush ? facelift.gold : undefined}
              editor={(
                <Box>
                  <FormControlLabel
                    sx={{ minHeight: 44 }}
                    control={
                      <Switch
                        checked={formData.isRush}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isRush: e.target.checked }))}
                        disabled={!rushJobInfo.canCreate && !formData.isRush}
                      />
                    }
                    label={pricingSettings ? `Rush job (x${pricingSettings.rushMultiplier})` : 'Rush job'}
                  />
                  {!rushJobInfo.canCreate && (
                    <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                      Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
                    </Typography>
                  )}
                  {rushJobInfo.canCreate && rushJobInfo.remainingSlots <= 2 && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#F59E0B' }}>
                      {rushJobInfo.remainingSlots} rush job slot{rushJobInfo.remainingSlots === 1 ? '' : 's'} remaining
                    </Typography>
                  )}
                  {formData.isRush && (
                    <Typography variant="caption" sx={{ display: 'block', color: facelift.text2 }}>
                      Rush jobs have {pricingSettings ? ((pricingSettings.rushMultiplier - 1) * 100).toFixed(0) : '—'}% markup
                    </Typography>
                  )}
                </Box>
              )}
            />
            {!formData.isWholesale && submitMode === 'create' && (
              <ReviewRow
                label="While-you-wait"
                value={formData.whileYouWait ? (formData.assignedJeweler || 'Pick artisan') : 'No'}
                valueColor={formData.whileYouWait && !formData.assignedTo ? '#F87171' : formData.whileYouWait ? facelift.gold : undefined}
                editor={(
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      sx={{ minHeight: 44 }}
                      control={
                        <Switch
                          checked={formData.whileYouWait}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setFormData((prev) => ({
                              ...prev,
                              whileYouWait: checked,
                              assignedTo: checked ? prev.assignedTo : '',
                              assignedJeweler: checked ? prev.assignedJeweler : '',
                            }));
                          }}
                        />
                      }
                      label="Done at the counter — goes straight to closeout"
                    />
                    {formData.whileYouWait && (
                      <ChoiceList aria-label="Artisan who did the work">
                        {benchJewelers.map((jeweler) => (
                          <ChoiceRow
                            key={jeweler.userID}
                            lead={initials(getJewelerLabel(jeweler))}
                            title={getJewelerLabel(jeweler)}
                            selected={formData.assignedTo === jeweler.userID}
                            onClick={() => setFormData((prev) => ({
                              ...prev,
                              assignedTo: jeweler.userID,
                              assignedJeweler: getJewelerLabel(jeweler),
                            }))}
                          />
                        ))}
                      </ChoiceList>
                    )}
                  </Stack>
                )}
              />
            )}
            <ReviewRow
              label="Billing"
              value={[
                isComped && 'Comped',
                formData.includeDelivery && 'Delivery',
                formData.isWholesale ? 'Tax exempt' : (formData.includeTax ? 'Tax' : 'No tax'),
              ].filter(Boolean).join(' · ')}
              editor={(
                <Stack spacing={0.5}>
                  <FormControlLabel
                    sx={{ minHeight: 44 }}
                    control={
                      <Switch
                        checked={isComped}
                        onChange={(e) => setFormData((prev) => ({
                          ...prev,
                          compRepair: e.target.checked,
                          includedWithSale: e.target.checked,
                          includeTax: e.target.checked ? false : prev.includeTax,
                        }))}
                      />
                    }
                    label="Comp repair price / included with sale"
                  />
                  <FormControlLabel
                    sx={{ minHeight: 44 }}
                    control={
                      <Switch
                        checked={formData.includeDelivery}
                        onChange={(e) => setFormData((prev) => ({ ...prev, includeDelivery: e.target.checked }))}
                      />
                    }
                    label={pricingSettings ? `Include delivery (+$${pricingSettings.deliveryFee.toFixed(2)})` : 'Include delivery'}
                  />
                  {!formData.isWholesale ? (
                    <FormControlLabel
                      sx={{ minHeight: 44 }}
                      control={
                        <Switch
                          checked={formData.includeTax}
                          onChange={(e) => setFormData((prev) => ({ ...prev, includeTax: e.target.checked }))}
                        />
                      }
                      label={pricingSettings ? `Include tax (+${(pricingSettings.taxRate * 100).toFixed(2)}%)` : 'Include tax'}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: facelift.text2 }}>
                      Your wholesale total is tax exempt. Customer tax is applied from your account settings.
                    </Typography>
                  )}
                </Stack>
              )}
            />
            <ReviewRow
              label="Notes"
              value={(formData.notes || formData.internalNotes) ? '✓' : '—'}
              editor={(
                <Stack spacing={1.25}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Customer notes, special instructions…"
                    inputProps={{ style: { fontSize: 16 } }}
                  />
                  <TextField
                    fullWidth
                    label="Internal Notes"
                    multiline
                    rows={2}
                    value={formData.internalNotes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))}
                    placeholder="Internal team notes, not visible to customer…"
                    inputProps={{ style: { fontSize: 16 } }}
                  />
                </Stack>
              )}
            />
          </Box>

          {/* Gold total, per the mock. */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 1.25,
              p: 1.75,
              border: '1px solid rgba(251,191,36,0.38)',
              borderRadius: '14px',
              backgroundColor: 'rgba(251,191,36,0.1)',
            }}
          >
            <SectionLabel sx={{ flex: 1, color: facelift.gold }}>Total</SectionLabel>
            <Typography sx={{ fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.028em', fontVariantNumeric: 'tabular-nums' }}>
              {isComped ? '$0.00' : reviewTotal === null ? '…' : `$${reviewTotal.toFixed(2)}`}
            </Typography>
          </Box>

          <Box>
            <QuietButton onClick={() => setShowFullBreakdown((v) => !v)} aria-expanded={showFullBreakdown}>
              {showFullBreakdown ? 'Hide pricing breakdown' : 'Full pricing breakdown'}
            </QuietButton>
            {showFullBreakdown && (
              <Box sx={{ mt: 1.5 }}>
                <TotalCostCard
                  formData={formData}
                  pricingTotals={pricingTotals}
                  pricingSettings={pricingSettings}
                  storeTaxRate={wholesalerPricingSettings?.taxRate ?? null}
                  viewerIsWholesaler={isWholesale}
                />
              </Box>
            )}
          </Box>
        </Stack>
      )}
    </>
  );
}
