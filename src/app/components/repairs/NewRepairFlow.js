'use client';

/**
 * NewRepairFlow — the stepped, mobile-first intake presentation.
 *
 * Steps and parity: INTAKE.md. Controls: INTAKE-CONTROLS.md — the rule is
 * "if the options are already narrow, show them and let people tap":
 * ChoiceList/ChoiceRow for small option sets, Segmented for 2–3 exclusive
 * options, QtyStepper for quantities, SearchField + ChoiceList for catalogs,
 * ActionBar with ONE gold button per screen. No MUI size="small" anywhere
 * (below the 44px touch minimum) and every text input at 16px so iOS Safari
 * does not zoom on focus.
 *
 * Two deliberate departures from the mock, both from INTAKE-CONTROLS.md:
 * there is no Retail/Wholesale toggle — the store list IS the account choice
 * (each row carries its pricing mode) — and on step 2 the sentence comes
 * first with the camera as a secondary action beneath it.
 *
 * Renders from the SAME useNewRepairForm hook as the classic form; no
 * business logic lives here. Reached behind ?ui=next on /dashboard/repairs/new.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

import { taskAllowsMetal } from '@/services/repairs/metalTaskFilter';
import { RING_SIZES } from '@/services/repairs/smartIntakeExtractors';
import CameraCapture from '@/components/shared/CameraCapture';
import PromiseDateSuggestion from '@/app/components/repairs/PromiseDateSuggestion';
import { METAL_TYPES, GOLD_COLORS } from '@/constants/customRequest.constants';
import useNewRepairForm, {
  toNumber,
  resolveMaterialRetailPrice,
  resolveMaterialWholesalePrice,
} from '@/hooks/repairs/useNewRepairForm';
import { TotalCostCard } from '@/app/components/repairs/NewRepairForm';
import {
  SurfaceCard,
  SectionLabel,
  StatusChip,
  ChoiceList,
  ChoiceRow,
  Segmented,
  QtyStepper,
  SearchField,
  FilterPill,
  GoldButton,
  QuietButton,
  IconButton as TapIconButton,
  ActionBar,
  facelift,
} from '@/components/facelift';

const STEPS = [
  { key: 'who', title: "Who it's for", next: 'Next — the piece' },
  { key: 'piece', title: 'The piece', next: 'Next — the work' },
  { key: 'work', title: 'Work items', next: 'Next — review' },
  { key: 'review', title: 'Review & save', next: null },
];

const initials = (name = '') =>
  String(name).trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
       style={{ marginRight: 5, flexShrink: 0 }}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

const TrashGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

function StepProgress({ step }) {
  return (
    <Box>
      <SectionLabel>
        Step {step + 1} of {STEPS.length} — {STEPS[step].title}
      </SectionLabel>
      <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
        {STEPS.map((s, i) => (
          <Box
            key={s.key}
            sx={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              backgroundColor: i <= step ? facelift.gold : 'rgba(255,255,255,0.14)',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

/** Segmented for 2–3 options, tap-list for more. Never a dropdown. */
function OptionPicker({ options, value, onChange, ariaLabel }) {
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  if (norm.length <= 3) {
    return <Segmented options={norm} value={value} onChange={onChange} aria-label={ariaLabel} />;
  }
  return (
    <ChoiceList aria-label={ariaLabel}>
      {norm.map((o) => (
        <ChoiceRow key={o.value} title={o.label} selected={o.value === value} onClick={() => onChange(o.value)} />
      ))}
    </ChoiceList>
  );
}

/** Collapsed value row that expands into a searchable tap-list of ring sizes. */
function RingSizePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sizes = RING_SIZES.filter((size) => !query || String(size).startsWith(query.trim()));
  return (
    <Box>
      <ChoiceRow
        title={value ? `${label}: ${value}` : `${label} — tap to pick`}
        selected={!!value}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Box sx={{ mt: 1 }}>
          <SearchField placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Box sx={{ mt: 1, maxHeight: 240, overflowY: 'auto' }}>
            <ChoiceList>
              {sizes.map((size) => (
                <ChoiceRow
                  key={size}
                  title={String(size)}
                  selected={String(value) === String(size)}
                  onClick={() => { onChange(size); setOpen(false); setQuery(''); }}
                />
              ))}
            </ChoiceList>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** A work-item row: stepper for qty, 44px delete, price per the item kind. */
function TicketRow({ kind, hue, item, onQuantityChange, onPriceChange, priceEditable, extraFields, onRemove }) {
  const unitPrice = toNumber(item.price);
  const lineTotal = unitPrice * (item.quantity || 1);
  return (
    <SurfaceCard sx={{ p: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <StatusChip label={kind} hue={hue} />
          <Typography sx={{ mt: 0.75, fontWeight: 600, fontSize: '0.9375rem' }}>
            {item.title || item.displayName || item.name || 'Custom line'}
          </Typography>
          {item.description && (item.title || item.displayName || item.name) !== item.description && (
            <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.description}
            </Typography>
          )}
        </Box>
        <TapIconButton aria-label={`Remove ${item.title || item.displayName || item.name || 'line'}`} onClick={onRemove}>
          <TrashGlyph />
        </TapIconButton>
      </Box>
      {extraFields}
      <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <QtyStepper value={item.quantity || 1} min={1} onChange={onQuantityChange} label={`${item.title || 'item'} quantity`} />
        {priceEditable ? (
          <TextField
            type="number"
            label="Price"
            value={item.price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
            sx={{ width: 120 }}
          />
        ) : (
          <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.8125rem', color: facelift.text2 }}>
            ${unitPrice.toFixed(2)} each
          </Typography>
        )}
        <Typography sx={{ ml: 'auto', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          ${lineTotal.toFixed(2)}
        </Typography>
      </Box>
    </SurfaceCard>
  );
}

export default function NewRepairFlow(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isWholesale, submitMode = 'create', submitLabel = '' } = props;

  const {
    formData, setFormData,
    loading, errors,
    showNewClientDialog, setShowNewClientDialog,
    analyzingSmartIntake, smartIntakeError, setSmartIntakeError,
    generatingImageDescription, imageDescriptionError, setImageDescriptionError,
    newClientData, setNewClientData, newClientLoading,
    picturePreviewUrl,
    availableTasks, availableMaterials, availableUsers, benchJewelers, availableStores,
    rushJobInfo, adminSettings,
    stullerSku, setStullerSku, loadingStuller, stullerError, addStullerMaterial,
    promiseDateEstimate, promiseDateContext, promiseDateLoading, promiseDateError,
    getJewelerLabel, getKaratOptions, calculateTotalCost, formatPhoneNumber,
    handleStoreChange,
    addTask, addMaterial, addCustomLineItem, removeItem, updateItem,
    handleSubmit, handleAddNewClient, handleGenerateDescriptionFromImage, handleAnalyzeSmartIntake
  } = useNewRepairForm(props);

  const [step, setStep] = useState(0);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [storeQuery, setStoreQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goReview = () => setStep(3);

  const users = Array.isArray(availableUsers) ? availableUsers : [];
  const clientLabel = (option) => {
    if (typeof option === 'string') return option;
    if (option && typeof option === 'object') {
      return option.name || option.fullName || `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.email || '';
    }
    return '';
  };
  const clientId = (option) => option._id || option.id || option.userID || option.clientID || '';

  const stores = availableStores || [];
  const filteredStores = storeQuery
    ? stores.filter((store) => String(store.name || '').toLowerCase().includes(storeQuery.toLowerCase()))
    : stores;

  const filteredClients = (clientQuery
    ? users.filter((opt) => {
        const inputText = clientQuery.toLowerCase().trim();
        const name = clientLabel(opt).toLowerCase();
        const email = (opt.email || '').toLowerCase();
        const phone = (opt.phone || opt.phoneNumber || '').toLowerCase();
        const business = (opt.business || '').toLowerCase();
        return name.includes(inputText) || email.includes(inputText) || phone.includes(inputText) || business.includes(inputText);
      })
    : users
  ).slice(0, 12);
  const queryMatchesClient = users.some((opt) => clientLabel(opt).toLowerCase() === clientQuery.toLowerCase().trim());

  const metalAllowedTasks = [...availableTasks]
    .filter((t) => taskAllowsMetal(t, formData.metalType))
    .sort((a, b) => {
      const aRestricted = Array.isArray(a.metals) && a.metals.length ? 0 : 1;
      const bRestricted = Array.isArray(b.metals) && b.metals.length ? 0 : 1;
      return aRestricted - bRestricted || String(a.title).localeCompare(String(b.title));
    });
  const commonTasks = metalAllowedTasks.slice(0, 6);
  const taskResults = taskQuery
    ? metalAllowedTasks.filter((t) => `${t.title || ''} ${t.displayName || ''} ${t.description || ''}`.toLowerCase().includes(taskQuery.toLowerCase())).slice(0, 8)
    : [];
  const materialResults = materialQuery
    ? availableMaterials.filter((m) => `${m.displayName || ''} ${m.name || ''} ${m.description || ''}`.toLowerCase().includes(materialQuery.toLowerCase())).slice(0, 8)
    : [];
  const materialPrice = (option) => {
    const retail = resolveMaterialRetailPrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
    const wholesale = resolveMaterialWholesalePrice(option, formData.metalType, formData.karat, formData.goldColor, adminSettings);
    return formData.isWholesale && wholesale > 0 ? wholesale : retail;
  };

  const itemCount = formData.tasks.length + formData.materials.length + formData.customLineItems.length;
  const itemsSubtotal = [
    ...formData.tasks.map((t) => toNumber(t.price) * (t.quantity || 1)),
    ...formData.materials.map((m) => toNumber(m.price) * (m.quantity || 1)),
    ...formData.customLineItems.map((c) => toNumber(c.price) * (c.quantity || 1)),
  ].reduce((sum, v) => sum + v, 0);

  const extractedChips = [
    formData.karat && String(formData.karat),
    formData.metalType === 'gold' && formData.goldColor && `${formData.goldColor} gold`,
    formData.metalType && formData.metalType !== 'gold' && formData.metalType,
    formData.isRing && 'Ring',
    formData.currentRingSize && formData.desiredRingSize && `${formData.currentRingSize} → ${formData.desiredRingSize}`,
  ].filter(Boolean);

  const karatOptions = getKaratOptions();

  return (
    /* Bottom padding clears the global FAB, which floats over the content. */
    <Box sx={{ pb: { xs: 14, sm: 4 } }}>
      <Stack spacing={2.5}>
        <StepProgress step={step} />

        {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

        {/* ── Step 1 — Who it's for ─────────────────────────────────────── */}
        {step === 0 && (
          <Stack spacing={2.5}>
            <SurfaceCard>
              <SectionLabel>Account</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                {isWholesale ? (
                  <ChoiceRow
                    lead={initials(formData.storeName)}
                    title={formData.storeName || 'My Wholesale Store'}
                    meta="Your store — fixed by your sign-in"
                    trailing={<StatusChip label="Wholesale" hue="#7DD3FC" />}
                    selected
                    disabled
                    sx={{ cursor: 'default' }}
                  />
                ) : !storePickerOpen ? (
                  /* Collapsed, per the mock: the chosen store with a Change
                     affordance. The full list only appears on demand. */
                  <ChoiceRow
                    lead={initials(formData.storeName)}
                    title={formData.storeName || 'Engel Fine Design'}
                    meta={formData.isWholesale ? 'Wholesale pricing · net terms' : 'Retail pricing'}
                    trailing={<Typography component="span" sx={{ color: facelift.gold, fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>Change</Typography>}
                    selected
                    aria-expanded={false}
                    onClick={() => setStorePickerOpen(true)}
                  />
                ) : (
                  <Stack spacing={1.25}>
                    {stores.length > 12 && (
                      <SearchField placeholder="Search stores…" value={storeQuery} onChange={(e) => setStoreQuery(e.target.value)} />
                    )}
                    <ChoiceList>
                      {filteredStores.map((store) => (
                        <ChoiceRow
                          key={store.id}
                          lead={initials(store.name)}
                          title={store.name}
                          meta={store.isWholesale ? 'Wholesale pricing · net terms' : 'Retail pricing'}
                          trailing={<StatusChip label={store.isWholesale ? 'Wholesale' : 'Retail'} hue={store.isWholesale ? '#7DD3FC' : facelift.gold} />}
                          selected={String(store.id) === String(formData.storeId)}
                          onClick={() => { handleStoreChange(store.id); setStorePickerOpen(false); setStoreQuery(''); }}
                        />
                      ))}
                    </ChoiceList>
                  </Stack>
                )}
              </Box>
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Client at this store</SectionLabel>
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                {formData.clientName && (
                  <Box>
                    <StatusChip label={`Client: ${formData.clientName}`} hue="#34D399" />
                  </Box>
                )}
                {users.length > 12 && (
                  <SearchField placeholder="Name, phone, or email…" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
                )}
                <ChoiceList>
                  {filteredClients.map((opt) => (
                    <ChoiceRow
                      key={clientId(opt) || clientLabel(opt)}
                      lead={initials(clientLabel(opt))}
                      title={clientLabel(opt)}
                      meta={[opt.phone || opt.phoneNumber, opt.email].filter(Boolean).join(' · ')}
                      selected={formData.userID ? clientId(opt) === formData.userID : clientLabel(opt) === formData.clientName}
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        clientName: clientLabel(opt),
                        userID: clientId(opt)
                      }))}
                    />
                  ))}
                  {!isWholesale && !formData.isWholesale && clientQuery.trim() && !queryMatchesClient && (
                    <ChoiceRow
                      lead="+"
                      title={`Use “${clientQuery.trim()}” as the client name`}
                      meta="Walk-in — no account yet"
                      onClick={() => setFormData((prev) => ({ ...prev, clientName: clientQuery.trim(), userID: '' }))}
                    />
                  )}
                  <ChoiceRow add title="New client at this store" onClick={() => setShowNewClientDialog(true)} />
                </ChoiceList>
              </Stack>
            </SurfaceCard>
          </Stack>
        )}

        {/* ── Step 2 — The piece ────────────────────────────────────────── */}
        {step === 1 && (
          <Stack spacing={2.5}>
            <SurfaceCard>
              <SectionLabel>What needs doing?</SectionLabel>
              <TextField
                fullWidth
                multiline
                rows={3}
                autoFocus
                value={formData.smartIntakeInput}
                onChange={(e) => {
                  setSmartIntakeError('');
                  setFormData((prev) => ({ ...prev, smartIntakeInput: e.target.value }));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleAnalyzeSmartIntake();
                  }
                }}
                placeholder="Size down 14k white gold ring from 7 to 6.5, retip two prongs"
                inputProps={{ style: { fontSize: 16 } }}
                sx={{ mt: 1.5 }}
              />
              <Box sx={{ mt: 1.5 }}>
                <GoldButton onClick={handleAnalyzeSmartIntake} disabled={analyzingSmartIntake} aria-label="Analyze the sentence">
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                  {analyzingSmartIntake ? 'Reading the sentence…' : 'Analyze the sentence'}
                </GoldButton>
              </Box>
              {smartIntakeError && <Alert severity="warning" sx={{ mt: 1.5 }}>{smartIntakeError}</Alert>}

              {extractedChips.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontFamily: facelift.mono, color: facelift.text3 }}>
                    Picked up from that sentence — tap one to edit it on review
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {extractedChips.map((label) => (
                      <Box
                        key={label}
                        component="button"
                        type="button"
                        onClick={goReview}
                        aria-label={`Edit ${label} on the review step`}
                        sx={{ all: 'unset', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <StatusChip label={<><CheckGlyph />{label}</>} hue="#34D399" />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Photo of the piece</SectionLabel>
              <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mt: 0.5 }}>
                Optional — a photo also writes the customer-facing description for you.
              </Typography>
              <Stack spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
                <CameraCapture
                  onCapture={(file) => {
                    setImageDescriptionError('');
                    setFormData((prev) => ({ ...prev, picture: file }));
                    handleGenerateDescriptionFromImage(file);
                  }}
                />
                {formData.picture && (
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <img
                      src={picturePreviewUrl}
                      alt="Captured item"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, objectFit: 'contain', border: `1px solid ${facelift.border}` }}
                    />
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={typeof formData.picture === 'string' ? 'Existing photo' : (formData.picture.name || 'Captured photo')}
                        onDelete={() => setFormData((prev) => ({ ...prev, picture: null }))}
                        sx={{ maxWidth: 250, height: 44 }}
                      />
                    </Box>
                  </Box>
                )}
                {imageDescriptionError && <Alert severity="error" sx={{ width: '100%' }}>{imageDescriptionError}</Alert>}
                {generatingImageDescription && (
                  <Typography variant="caption" sx={{ color: facelift.text2 }}>
                    Writing a description from the photo…
                  </Typography>
                )}
              </Stack>
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Customer-facing description</SectionLabel>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                required
                placeholder="What the ticket says. Filled from the photo when one is taken."
                inputProps={{ style: { fontSize: 16 } }}
                sx={{ mt: 1.5 }}
              />
            </SurfaceCard>
          </Stack>
        )}

        {/* ── Step 3 — Work items ───────────────────────────────────────── */}
        {step === 2 && (
          <Stack spacing={2.5}>
            {itemCount > 0 && (
              <Box>
                <SectionLabel>On this ticket ({itemCount})</SectionLabel>
                <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                  {formData.tasks.map((task) => (
                    <TicketRow
                      key={task.id}
                      kind="Task"
                      hue={facelift.gold}
                      item={task}
                      onQuantityChange={(qty) => updateItem('tasks', task.id, 'quantity', qty)}
                      onPriceChange={(price) => updateItem('tasks', task.id, 'price', price)}
                      priceEditable={false}
                      onRemove={() => removeItem('tasks', task.id)}
                    />
                  ))}
                  {formData.materials.map((material) => (
                    <TicketRow
                      key={material.id}
                      kind="Material"
                      hue="#7DD3FC"
                      item={material}
                      onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
                      onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
                      priceEditable
                      onRemove={() => removeItem('materials', material.id)}
                    />
                  ))}
                  {formData.customLineItems.map((item) => (
                    <TicketRow
                      key={item.id}
                      kind="Custom"
                      hue="#C4B5FD"
                      item={item}
                      onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
                      onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
                      priceEditable
                      onRemove={() => removeItem('customLineItems', item.id)}
                      extraFields={(
                        <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                          <TextField
                            fullWidth
                            label="Description"
                            value={item.description}
                            onChange={(e) => updateItem('customLineItems', item.id, 'description', e.target.value)}
                            placeholder="Custom work description…"
                            inputProps={{ style: { fontSize: 16 } }}
                          />
                          <TextField
                            type="number"
                            label="Labor Hrs"
                            value={item.laborHours ?? 0}
                            onChange={(e) => updateItem('customLineItems', item.id, 'laborHours', parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 0.1, style: { fontSize: 16 } }}
                            helperText="Hours feed the jeweler's credited pay; price is what the client is billed."
                            sx={{ width: 160 }}
                          />
                        </Stack>
                      )}
                    />
                  ))}
                </Stack>
                <Box
                  sx={{
                    mt: 1.5,
                    py: 1.25,
                    px: 1.75,
                    border: `1px solid ${facelift.border}`,
                    borderRadius: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <SectionLabel>Items subtotal</SectionLabel>
                  <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ${itemsSubtotal.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}

            <SurfaceCard>
              <SectionLabel>Add a task</SectionLabel>
              <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mt: 0.5 }}>
                Filtered to {formData.metalType ? `${formData.metalType} work` : 'the selected metal'} — a task restricted to another metal never appears.
              </Typography>
              {commonTasks.length > 0 && !taskQuery && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                  {commonTasks.map((t) => (
                    <FilterPill key={t._id || t.title} onClick={() => addTask(t)}>
                      + {t.title}
                    </FilterPill>
                  ))}
                </Box>
              )}
              <Box sx={{ mt: 1.5 }}>
                <SearchField
                  placeholder={`Search all ${metalAllowedTasks.length} tasks…`}
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                />
              </Box>
              {taskResults.length > 0 && (
                <Box sx={{ mt: 1.25 }}>
                  <ChoiceList>
                    {taskResults.map((t) => (
                      <ChoiceRow
                        key={t._id || t.title}
                        title={t.title}
                        meta={t.description}
                        onClick={() => { addTask(t); setTaskQuery(''); }}
                      />
                    ))}
                  </ChoiceList>
                </Box>
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Add a material</SectionLabel>
              <Box sx={{ mt: 1.5 }}>
                <SearchField
                  placeholder="Search the material catalog…"
                  value={materialQuery}
                  onChange={(e) => setMaterialQuery(e.target.value)}
                />
              </Box>
              {materialResults.length > 0 && (
                <Box sx={{ mt: 1.25 }}>
                  <ChoiceList>
                    {materialResults.map((m) => (
                      <ChoiceRow
                        key={m._id || m.name}
                        title={m.displayName || m.name || 'Material'}
                        meta={`$${materialPrice(m).toFixed(2)}`}
                        onClick={() => { addMaterial(m); setMaterialQuery(''); }}
                      />
                    ))}
                  </ChoiceList>
                </Box>
              )}
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${facelift.hairline}` }}>
                <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mb: 1 }}>
                  Or look one up by Stuller SKU — added with markup applied.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <TextField
                    label="Stuller SKU"
                    value={stullerSku}
                    onChange={(e) => setStullerSku(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
                    placeholder="Enter Stuller item number…"
                    fullWidth
                    error={!!stullerError}
                    helperText={stullerError}
                    inputProps={{ style: { fontSize: 16 } }}
                  />
                  <QuietButton onClick={addStullerMaterial} disabled={!stullerSku.trim() || loadingStuller} aria-label="Look up Stuller SKU">
                    {loadingStuller ? 'Looking up…' : 'Look up'}
                  </QuietButton>
                </Stack>
              </Box>
            </SurfaceCard>

            <ChoiceList>
              <ChoiceRow add title="Add a custom line" onClick={addCustomLineItem} />
            </ChoiceList>
          </Stack>
        )}

        {/* ── Step 4 — Review & save ────────────────────────────────────── */}
        {step === 3 && (
          <Stack spacing={2.5}>
            <SurfaceCard>
              <SectionLabel>The piece — confirm</SectionLabel>
              <Stack spacing={2} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mb: 1 }}>Metal</Typography>
                  <OptionPicker
                    options={METAL_TYPES}
                    value={formData.metalType}
                    onChange={(value) => setFormData((prev) => ({ ...prev, metalType: value, goldColor: '', karat: '' }))}
                    ariaLabel="Metal type"
                  />
                </Box>
                {karatOptions.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mb: 1 }}>Karat / purity</Typography>
                    <OptionPicker
                      options={karatOptions}
                      value={formData.karat}
                      onChange={(value) => setFormData((prev) => ({ ...prev, karat: value }))}
                      ariaLabel="Karat or purity"
                    />
                  </Box>
                )}
                {formData.metalType === 'gold' && (
                  <Box>
                    <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mb: 1 }}>Gold color</Typography>
                    <OptionPicker
                      options={GOLD_COLORS}
                      value={formData.goldColor}
                      onChange={(value) => setFormData((prev) => ({ ...prev, goldColor: value }))}
                      ariaLabel="Gold color"
                    />
                  </Box>
                )}
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
                  label="This item is a ring (enable sizing fields)"
                />
                {formData.isRing && (
                  <Stack spacing={1.25}>
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
                  </Stack>
                )}
              </Stack>
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Timing</SectionLabel>
              {!isWholesale ? (
                <TextField
                  fullWidth
                  label="Promise Date"
                  type="date"
                  value={formData.promiseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, promiseDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  inputProps={{ style: { fontSize: 16 } }}
                  sx={{ mt: 1.5 }}
                />
              ) : (
                <Box sx={{ mt: 1.5 }}>
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
              <FormControlLabel
                sx={{ mt: 1, minHeight: 44 }}
                control={
                  <Switch
                    checked={formData.isRush}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isRush: e.target.checked }))}
                    disabled={!rushJobInfo.canCreate && !formData.isRush}
                  />
                }
                label={`Rush job${formData.isRush ? ` (x${adminSettings.rushMultiplier})` : ''}`}
              />
              {!rushJobInfo.canCreate && (
                <Typography variant="caption" color="error">
                  Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
                </Typography>
              )}
            </SurfaceCard>

            {!formData.isWholesale && submitMode === 'create' && (
              <SurfaceCard accent={formData.whileYouWait ? facelift.gold : undefined}>
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
                  label="While-you-wait repair"
                />
                <Typography variant="caption" sx={{ color: facelift.text2 }}>
                  Creates this repair as completed and sends it directly to Payment & Pickup closeout.
                </Typography>
                {formData.whileYouWait && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', mb: 1 }}>
                      Artisan who did the work — used for labor attribution.
                    </Typography>
                    <ChoiceList>
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
                  </Box>
                )}
              </SurfaceCard>
            )}

            <SurfaceCard>
              <SectionLabel>Billing options</SectionLabel>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <FormControlLabel
                  sx={{ minHeight: 44 }}
                  control={
                    <Switch
                      checked={Boolean(formData.compRepair || formData.includedWithSale)}
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
                  label={`Include delivery (+$${adminSettings.deliveryFee.toFixed(2)})`}
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
                    label={`Include tax (+${(adminSettings.taxRate * 100).toFixed(2)}%)`}
                  />
                ) : (
                  <Typography variant="caption" sx={{ color: facelift.text2 }}>
                    Your wholesale total is tax exempt. Customer tax is automatically applied from your account settings.
                  </Typography>
                )}
              </Stack>
            </SurfaceCard>

            <SurfaceCard>
              <SectionLabel>Notes</SectionLabel>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={isMobile ? 2 : 3}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Customer notes, special instructions…"
                inputProps={{ style: { fontSize: 16 } }}
                sx={{ mt: 1.5 }}
              />
              <TextField
                fullWidth
                label="Internal Notes"
                multiline
                rows={isMobile ? 2 : 3}
                value={formData.internalNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))}
                placeholder="Internal team notes, not visible to customer…"
                inputProps={{ style: { fontSize: 16 } }}
                sx={{ mt: 1.5 }}
              />
            </SurfaceCard>

            <TotalCostCard
              formData={formData}
              calculateTotalCost={calculateTotalCost}
              adminSettings={adminSettings}
              viewerIsWholesaler={isWholesale}
            />
          </Stack>
        )}
      </Stack>

      {/* ── Step actions — sticky, primary under the thumb ─────────────── */}
      <Box sx={{ mt: 2.5, mr: { xs: 9, sm: 0 } }}>
        <ActionBar>
          {step > 0 && (
            <QuietButton onClick={goBack} aria-label="Back a step">
              Back
            </QuietButton>
          )}
          {STEPS[step].next ? (
            <GoldButton onClick={goNext}>{STEPS[step].next}</GoldButton>
          ) : (
            <GoldButton onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving…' : (submitLabel || 'Create repair')}
            </GoldButton>
          )}
        </ActionBar>
      </Box>

      {/* New Client Dialog — same fields and handler as the classic form. */}
      <Dialog
        open={showNewClientDialog}
        onClose={newClientLoading ? undefined : () => setShowNewClientDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>New client at this store</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="First Name"
              value={newClientData.firstName}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, firstName: e.target.value }))}
              required
              inputProps={{ style: { fontSize: 16 } }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={newClientData.lastName}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, lastName: e.target.value }))}
              required
              inputProps={{ style: { fontSize: 16 } }}
            />
            <TextField
              fullWidth
              label="Phone"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              placeholder="(555) 123-4567"
              required
              inputProps={{ style: { fontSize: 16 } }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
              helperText="Optional"
              inputProps={{ style: { fontSize: 16 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewClientDialog(false)} disabled={newClientLoading}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleAddNewClient}
            loading={newClientLoading}
            variant="contained"
            disabled={!newClientData.firstName.trim() || !newClientData.lastName.trim() || !newClientData.phone.trim()}
          >
            {newClientLoading ? 'Creating…' : 'Add Client'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
