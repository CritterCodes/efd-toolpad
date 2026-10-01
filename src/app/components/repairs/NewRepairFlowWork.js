import { Stack, Box, TextField, Typography } from '@mui/material';
import { SectionLabel, facelift, SurfaceCard, Segmented, QuietButton } from '@/components/facelift';
import { isCustomLaborTask, calculatedCustomLaborPrice } from '@/services/repairs/customLabor';
import { TicketRow, InlineTitleField } from './NewRepairFlowParts';
import { toNumber } from '@/hooks/repairs/useNewRepairForm';

export function NewRepairFlowWork({ canRequestQuote, formData, itemCount, itemsSubtotal, patchCustomLaborTask, quoteIntent, removeItem, setAddSheet, setQuoteIntent, setStep, step, updateItem }) {
  return (
    <>
      {/* ── Step 3 — Work items (short: ticket + subtotal + add strip) ── */}
      {step === 2 && (
        <Stack spacing={2.5}>
          {itemCount > 0 ? (
            <Box>
              <SectionLabel>On this ticket ({itemCount})</SectionLabel>
              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                {formData.tasks.map((task) => (isCustomLaborTask(task) ? (
                  <TicketRow
                    key={task.id}
                    kind="Labor"
                    hue="#F9A8D4"
                    item={task}
                    title={(
                      <InlineTitleField
                        value={task.description}
                        onChange={(v) => patchCustomLaborTask(task.id, { description: v })}
                        placeholder="What was done"
                        ariaLabel="Custom labor description"
                      />
                    )}
                    onQuantityChange={(qty) => patchCustomLaborTask(task.id, { quantity: qty })}
                    onPriceChange={(price) => patchCustomLaborTask(task.id, { price })}
                    priceEditable
                    onRemove={() => removeItem('tasks', task.id)}
                    beforePrice={(
                      <TextField
                        type="number"
                        label="Hrs"
                        value={task.laborHours ?? 0}
                        onChange={(e) => patchCustomLaborTask(task.id, { laborHours: parseFloat(e.target.value) || 0 })}
                        inputProps={{ min: 0, step: 0.05, style: { fontSize: 16 }, 'aria-label': 'Labor hours per unit' }}
                        sx={{ width: 84 }}
                      />
                    )}
                    extraFields={(
                      <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mt: 0.25 }}>
                        {(toNumber(task.laborHours) * (task.quantity || 1)).toFixed(2)} hrs total ·{' '}
                        {task.priceOverridden && calculatedCustomLaborPrice(task, { isWholesale: !!formData.isWholesale }) != null
                          && calculatedCustomLaborPrice(task, { isWholesale: !!formData.isWholesale }) !== toNumber(task.price)
                          ? `calculated $${calculatedCustomLaborPrice(task, { isWholesale: !!formData.isWholesale }).toFixed(2)}, discounted`
                          : `${formData.isWholesale ? 'wholesale' : 'retail'} price from hours`}
                      </Typography>
                    )}
                  />
                ) : (
                  <TicketRow
                    key={task.id}
                    kind="Task"
                    hue={facelift.gold}
                    item={task}
                    fromSentence={Boolean(task.__aiQuantity)}
                    onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
                    onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
                    priceEditable={false}
                    onRemove={() => removeItem('tasks', task.id)}
                  />
                )))}
                {formData.materials.map((material) => (
                  <TicketRow
                    key={material.id}
                    kind="Material"
                    hue="#7DD3FC"
                    item={material}
                    fromSentence={Boolean(material._smartIntakeHintType)}
                    onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
                    onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
                    priceEditable={false}
                    onRemove={() => removeItem('materials', material.id)}
                  />
                ))}
                {formData.customLineItems.map((item) => (
                  <TicketRow
                    key={item.id}
                    kind="Charge"
                    hue="#C4B5FD"
                    item={item}
                    title={(
                      <InlineTitleField
                        value={item.description}
                        onChange={(v) => updateItem('customLineItems', item.id, 'description', v)}
                        placeholder="What the charge is for"
                        ariaLabel="Custom charge description"
                      />
                    )}
                    onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
                    onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
                    priceEditable
                    onRemove={() => removeItem('customLineItems', item.id)}
                  />
                ))}
              </Stack>
              {/* Gold-tinted subtotal, per the mock. */}
              <Box
                sx={{
                  mt: 1.5,
                  py: 1.25,
                  px: 1.75,
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '13px',
                  backgroundColor: 'rgba(251,191,36,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <SectionLabel sx={{ color: facelift.gold }}>Items subtotal</SectionLabel>
                <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  ${itemsSubtotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          ) : (
            <SurfaceCard sx={{ alignItems: 'center', py: 4 }}>
              <Typography sx={{ fontWeight: 600 }}>Nothing on the ticket yet</Typography>
              <Typography variant="caption" sx={{ color: facelift.text2, mt: 0.5, textAlign: 'center' }}>
                {canRequestQuote
                  ? 'Add the work below — or, if you can’t price this job, ask EFD for a quote.'
                  : 'Add a task, a material, custom labor, or a charge below.'}
              </Typography>
            </SurfaceCard>
          )}

          <Box>
            <SectionLabel>Add to ticket</SectionLabel>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
              <Segmented
                options={[
                  { value: 'task', label: 'Task' },
                  { value: 'material', label: 'Material' },
                  { value: 'labor', label: 'Labor' },
                  { value: 'custom', label: 'Charge' },
                ]}
                value={null}
                onChange={(value) => setAddSheet(value)}
                aria-label="Add to ticket"
              />
            </Box>
          </Box>

          {canRequestQuote && (
            <SurfaceCard sx={{ p: 1.75, borderColor: quoteIntent ? 'rgba(251,191,36,0.45)' : undefined }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {quoteIntent ? 'EFD will quote this job' : 'Can’t price this job?'}
              </Typography>
              <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mt: 0.25 }}>
                {quoteIntent
                  ? 'The repair is created without work items; EFD prices it and notifies you with the number. Send the piece in as usual.'
                  : 'Request a quote instead of pricing it yourself. EFD prices the repair and notifies you; the piece comes in the usual way.'}
              </Typography>
              <Box sx={{ mt: 1.25 }}>
                {quoteIntent ? (
                  <QuietButton onClick={() => setQuoteIntent(false)} aria-label="Price it myself instead">
                    Price it myself instead
                  </QuietButton>
                ) : (
                  <QuietButton onClick={() => { setQuoteIntent(true); setStep(3); }} aria-label="Request a quote from EFD">
                    Request a quote from EFD
                  </QuietButton>
                )}
              </Box>
            </SurfaceCard>
          )}
        </Stack>
      )}
    </>
  );
}
