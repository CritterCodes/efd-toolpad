'use client';

/**
 * NewRepairFlow — the stepped, mobile-first intake presentation.
 *
 * Steps and parity: INTAKE.md. Controls: INTAKE-CONTROLS.md. Screen shape:
 * the Admin Facelift mock itself (Admin Facelift.dc.html, frames 1/2/3/3a/3b/
 * 3c/4), which this file now follows closely:
 *   - one header row per step: ✕ (cancel) or ‹ (back) + step title + dot bars
 *   - step 2 carries a client-context pill and marks sentence-extracted values
 *   - step 3 is SHORT: ticket + gold subtotal + an "Add to ticket" strip that
 *     opens full-screen add sheets (task / material / custom)
 *   - step 4 is a SUMMARY — label/value rows that expand to edit on tap, a
 *     gold Total, and two actions: Create & print / Save without printing
 *
 * Renders from the SAME useNewRepairForm hook as the classic form; no
 * business logic lives here. Reached behind ?ui=next on /dashboard/repairs/new.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  { key: 'who', title: 'New repair', next: 'Next — the piece' },
  { key: 'piece', title: 'The piece', next: 'Next — the work' },
  { key: 'work', title: 'Work items', next: 'Next — review' },
  { key: 'review', title: 'Review', next: null },
];

const initials = (name = '') =>
  String(name).trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const CheckGlyph = ({ size = 11 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
       style={{ marginRight: 5, flexShrink: 0 }}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

const TrashGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const PrintGlyph = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
       style={{ marginRight: 7, flexShrink: 0 }}>
    <rect x="6" y="3" width="12" height="6" rx="1.5" />
    <path d="M6 14H4v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3h-2" />
    <rect x="6" y="13" width="12" height="8" rx="1.5" />
  </svg>
);

/**
 * The mock's per-step header: ✕ (cancel) on step 1, ‹ (back) after, the step
 * title, and right-aligned dot bars — past dim gold, current gold, rest grey.
 */
function StepHeader({ step, onBack, onCancel }) {
  const isFirst = step === 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TapIconButton
        aria-label={isFirst ? 'Cancel new repair' : 'Back a step'}
        onClick={isFirst ? onCancel : onBack}
      >
        <span style={{ fontSize: 18, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>{isFirst ? '✕' : '‹'}</span>
      </TapIconButton>
      <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.016em' }}>
        {STEPS[step].title}
      </Typography>
      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <Box
            key={s.key}
            sx={{
              width: 16,
              height: 4,
              borderRadius: 999,
              backgroundColor: i < step ? 'rgba(251,191,36,0.45)' : i === step ? facelift.gold : 'rgba(255,255,255,0.16)',
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
function TicketRow({ kind, hue, item, fromSentence, onQuantityChange, onPriceChange, priceEditable, extraFields, onRemove }) {
  const unitPrice = toNumber(item.price);
  const lineTotal = unitPrice * (item.quantity || 1);
  return (
    <SurfaceCard sx={{ p: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusChip label={kind} hue={hue} />
          {item.isStullerItem && <StatusChip label="Stuller" hue="#A1A1AA" />}
          {fromSentence && <StatusChip label={<><CheckGlyph size={10} />from your sentence</>} hue="#34D399" />}
        </Box>
        <TapIconButton aria-label={`Remove ${item.title || item.displayName || item.name || 'line'}`} onClick={onRemove}>
          <TrashGlyph />
        </TapIconButton>
      </Box>
      <Typography sx={{ mt: 0.75, fontWeight: 600, fontSize: '0.9375rem' }}>
        {item.title || item.displayName || item.name || 'Custom line'}
      </Typography>
      {item.description && (item.title || item.displayName || item.name) !== item.description && (
        <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description}
        </Typography>
      )}
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

/** Full-screen add sheet chrome (mock frames 3a/3b/3c). */
function AddSheet({ open, title, onClose, children, isMobile }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
        <TapIconButton aria-label={`Close ${title}`} onClick={onClose}>
          <span style={{ fontSize: 18, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>✕</span>
        </TapIconButton>
        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.016em' }}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>{children}</DialogContent>
    </Dialog>
  );
}

/** A review row: label · value, tap to expand its editor beneath. */
function ReviewRow({ label, value, valueColor, editor, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box sx={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
      <Box
        component={editor ? 'button' : 'div'}
        type={editor ? 'button' : undefined}
        onClick={editor ? () => setOpen((o) => !o) : undefined}
        aria-expanded={editor ? open : undefined}
        sx={{
          all: 'unset',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          width: '100%',
          minHeight: 44,
          py: 0.5,
          cursor: editor ? 'pointer' : 'default',
        }}
      >
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', color: facelift.text2 }}>{label}</Typography>
        <Typography sx={{ flexShrink: 0, fontFamily: facelift.mono, fontSize: '0.8125rem', fontWeight: 500, color: valueColor || '#fff', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          {value}
        </Typography>
        {editor && <Typography component="span" sx={{ color: facelift.gold, fontFamily: facelift.mono, fontSize: '0.6875rem', flexShrink: 0 }}>{open ? 'Done' : 'Edit'}</Typography>}
      </Box>
      {editor && open && <Box sx={{ pb: 1.75 }}>{editor}</Box>}
    </Box>
  );
}

export default function NewRepairFlow(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isWholesale, submitMode = 'create', submitLabel = '', onCancel, onPrintChoice } = props;

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
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [addSheet, setAddSheet] = useState(null); // 'task' | 'material' | 'custom' | null
  const [taskQuery, setTaskQuery] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');
  const [customDraft, setCustomDraft] = useState({ description: '', quantity: 1, laborHours: 0, price: 0 });
  const [reviewTotal, setReviewTotal] = useState(null);
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // The gold Total on the review step, from the same calculation the classic
  // form's card uses.
  useEffect(() => {
    if (step !== 3) return;
    let active = true;
    calculateTotalCost().then((total) => { if (active) setReviewTotal(total); }).catch(() => {});
    return () => { active = false; };
  }, [step, calculateTotalCost]);

  // A material added from the sheet (catalog tap or Stuller lookup) closes it.
  const materialCount = formData.materials.length;
  const prevMaterialCount = useRef(materialCount);
  useEffect(() => {
    if (addSheet === 'material' && materialCount > prevMaterialCount.current) {
      setAddSheet(null);
      setMaterialQuery('');
    }
    prevMaterialCount.current = materialCount;
  }, [materialCount, addSheet]);

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

  // Autocomplete: no rows until the user types, then the best 8 matches.
  const filteredClients = clientQuery.trim()
    ? users.filter((opt) => {
        const inputText = clientQuery.toLowerCase().trim();
        const name = clientLabel(opt).toLowerCase();
        const email = (opt.email || '').toLowerCase();
        const phone = (opt.phone || opt.phoneNumber || '').toLowerCase();
        const business = (opt.business || '').toLowerCase();
        return name.includes(inputText) || email.includes(inputText) || phone.includes(inputText) || business.includes(inputText);
      }).slice(0, 8)
    : [];
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
  const isComped = Boolean(formData.compRepair || formData.includedWithSale);

  const metalSummary = [
    formData.karat,
    formData.metalType === 'gold' ? `${formData.goldColor || ''} gold`.trim() : formData.metalType,
  ].filter(Boolean).join(' ') || 'Not set';

  const clientPill = formData.clientName && (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.875, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', alignSelf: 'flex-start', maxWidth: '100%' }}>
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(251,191,36,0.14)', color: facelift.gold, fontWeight: 600, fontSize: '0.5625rem' }}>
        {initials(formData.clientName)}
      </Box>
      <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.6875rem', color: facelift.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formData.clientName} · {formData.storeName}
      </Typography>
    </Box>
  );

  const submitWith = (print) => {
    if (onPrintChoice) onPrintChoice(print);
    handleSubmit();
  };

  const addCustomFromDraft = () => {
    // Same shape addCustomLineItem creates — plus the sheet's drafted values.
    setFormData((prev) => ({
      ...prev,
      customLineItems: [...prev.customLineItems, {
        id: Date.now(),
        description: customDraft.description,
        quantity: Math.max(1, Number(customDraft.quantity) || 1),
        price: Math.max(0, Number(customDraft.price) || 0),
        laborHours: Math.max(0, Number(customDraft.laborHours) || 0),
      }],
    }));
    setCustomDraft({ description: '', quantity: 1, laborHours: 0, price: 0 });
    setAddSheet(null);
  };

  return (
    /* Bottom padding clears the global FAB, which floats over the content. */
    <Box sx={{ pb: { xs: 14, sm: 4 } }}>
      <Stack spacing={2.5}>
        <StepHeader step={step} onBack={goBack} onCancel={onCancel || goBack} />

        {errors.submit && <Alert severity="error">{errors.submit}</Alert>}

        {/* ── Step 1 — Who it's for ─────────────────────────────────────── */}
        {step === 0 && (
          <Stack spacing={2.5}>
            <Box>
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
            </Box>

            <Box>
              <SectionLabel>Client at this store</SectionLabel>
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                {formData.clientName && !clientPickerOpen ? (
                  <ChoiceRow
                    lead={initials(formData.clientName)}
                    title={formData.clientName}
                    meta={(() => {
                      const rec = users.find((u) => formData.userID && clientId(u) === formData.userID);
                      return rec
                        ? [rec.phone || rec.phoneNumber, rec.email].filter(Boolean).join(' · ')
                        : 'Walk-in — no account yet';
                    })()}
                    trailing={<Typography component="span" sx={{ color: facelift.gold, fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>Change</Typography>}
                    selected
                    aria-expanded={false}
                    onClick={() => { setClientPickerOpen(true); setClientQuery(''); }}
                  />
                ) : (
                  <>
                    <SearchField
                      placeholder="Name, phone, or email…"
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      autoFocus={clientPickerOpen}
                    />
                    {clientQuery.trim() && (
                      <ChoiceList>
                        {filteredClients.map((opt) => (
                          <ChoiceRow
                            key={clientId(opt) || clientLabel(opt)}
                            lead={initials(clientLabel(opt))}
                            title={clientLabel(opt)}
                            meta={[opt.phone || opt.phoneNumber, opt.email].filter(Boolean).join(' · ')}
                            selected={formData.userID ? clientId(opt) === formData.userID : clientLabel(opt) === formData.clientName}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                clientName: clientLabel(opt),
                                userID: clientId(opt)
                              }));
                              setClientPickerOpen(false);
                              setClientQuery('');
                            }}
                          />
                        ))}
                        {!isWholesale && !formData.isWholesale && !queryMatchesClient && (
                          <ChoiceRow
                            lead="+"
                            title={`Use “${clientQuery.trim()}” as the client name`}
                            meta="Walk-in — no account yet"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, clientName: clientQuery.trim(), userID: '' }));
                              setClientPickerOpen(false);
                              setClientQuery('');
                            }}
                          />
                        )}
                      </ChoiceList>
                    )}
                    <ChoiceList>
                      <ChoiceRow add title="New client at this store" onClick={() => setShowNewClientDialog(true)} />
                    </ChoiceList>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ── Step 2 — The piece ────────────────────────────────────────── */}
        {step === 1 && (
          <Stack spacing={2.5}>
            {clientPill}

            <Box>
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
                    Picked up from that sentence — tap to fix on review
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {extractedChips.map((label) => (
                      <Box
                        key={label}
                        component="button"
                        type="button"
                        onClick={() => setStep(3)}
                        aria-label={`Edit ${label} on the review step`}
                        sx={{ all: 'unset', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <StatusChip label={<><CheckGlyph />{label}</>} hue="#34D399" />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Box>
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
            </Box>

            <Box>
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
            </Box>
          </Stack>
        )}

        {/* ── Step 3 — Work items (short: ticket + subtotal + add strip) ── */}
        {step === 2 && (
          <Stack spacing={2.5}>
            {itemCount > 0 ? (
              <Box>
                <SectionLabel>On this ticket ({itemCount})</SectionLabel>
                <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                  {formData.tasks.map((task) => (
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
                  ))}
                  {formData.materials.map((material) => (
                    <TicketRow
                      key={material.id}
                      kind="Material"
                      hue="#7DD3FC"
                      item={material}
                      fromSentence={Boolean(material._smartIntakeHintType)}
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
                            sx={{ width: 160 }}
                          />
                        </Stack>
                      )}
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
                <Typography variant="caption" sx={{ color: facelift.text2, mt: 0.5 }}>
                  Add a task, a material, or a custom charge below.
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
                    { value: 'custom', label: 'Custom' },
                  ]}
                  value={null}
                  onChange={(value) => setAddSheet(value)}
                  aria-label="Add to ticket"
                />
              </Box>
            </Box>
          </Stack>
        )}

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
                  {formData.clientName || 'No client yet'}
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
                value={`${itemCount} · $${itemsSubtotal.toFixed(2)}`}
                editor={(
                  <QuietButton onClick={() => setStep(2)} aria-label="Edit work items">
                    Edit on the Work items step
                  </QuietButton>
                )}
              />
              <ReviewRow
                label="Promise date"
                value={isWholesale ? (formData.promiseDate || 'Suggested below') : (formData.promiseDate || 'Required')}
                valueColor={!isWholesale && !formData.promiseDate ? '#F87171' : undefined}
                editor={!isWholesale ? (
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.promiseDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, promiseDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ style: { fontSize: 16 } }}
                  />
                ) : (
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
                )}
              />
              <ReviewRow
                label="Rush"
                value={formData.isRush ? `Yes · x${adminSettings.rushMultiplier}` : 'No'}
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
                      label={`Rush job (x${adminSettings.rushMultiplier})`}
                    />
                    {!rushJobInfo.canCreate && (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        Rush jobs at capacity ({rushJobInfo.currentRushJobs}/{rushJobInfo.maxRushJobs})
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
                    calculateTotalCost={calculateTotalCost}
                    adminSettings={adminSettings}
                    viewerIsWholesaler={isWholesale}
                  />
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </Stack>

      {/* ── Step actions — sticky, primary under the thumb ─────────────── */}
      <Box sx={{ mt: 2.5, mr: { xs: 9, sm: 0 } }}>
        {STEPS[step].next ? (
          <ActionBar>
            <GoldButton onClick={goNext}>{STEPS[step].next}</GoldButton>
          </ActionBar>
        ) : (
          <Stack spacing={1}>
            <GoldButton onClick={() => submitWith(true)} disabled={loading} aria-label="Create and print ticket">
              <PrintGlyph />
              {loading ? 'Saving…' : (submitLabel || 'Create & print ticket')}
            </GoldButton>
            <QuietButton onClick={() => submitWith(false)} disabled={loading} aria-label="Save without printing">
              Save without printing
            </QuietButton>
          </Stack>
        )}
      </Box>

      {/* ── Add sheets (mock frames 3a / 3b / 3c) ──────────────────────── */}
      <AddSheet open={addSheet === 'task'} title="Add a task" onClose={() => { setAddSheet(null); setTaskQuery(''); }} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <SearchField
            placeholder={`Search all ${metalAllowedTasks.length} tasks…`}
            value={taskQuery}
            onChange={(e) => setTaskQuery(e.target.value)}
            autoFocus={!isMobile}
          />
          {taskResults.length > 0 && (
            <ChoiceList>
              {taskResults.map((t) => (
                <ChoiceRow
                  key={t._id || t.title}
                  title={t.title}
                  meta={t.description}
                  onClick={() => { addTask(t); setTaskQuery(''); setAddSheet(null); }}
                />
              ))}
            </ChoiceList>
          )}
          {!taskQuery && commonTasks.length > 0 && (
            <Box>
              <SectionLabel>Most used at the counter</SectionLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {commonTasks.map((t) => (
                  <FilterPill key={t._id || t.title} onClick={() => { addTask(t); setAddSheet(null); }}>
                    + {t.title}
                  </FilterPill>
                ))}
              </Box>
            </Box>
          )}
          <Alert severity="info">
            Only tasks valid for {formData.metalType ? metalSummary : 'the selected metal'} are shown — the catalog is filtered to the metal picked in step 2.
          </Alert>
        </Stack>
      </AddSheet>

      <AddSheet open={addSheet === 'material'} title="Add a material" onClose={() => { setAddSheet(null); setMaterialQuery(''); }} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <SearchField
            placeholder="Search the material catalog…"
            value={materialQuery}
            onChange={(e) => setMaterialQuery(e.target.value)}
            autoFocus={!isMobile}
          />
          {materialResults.length > 0 && (
            <ChoiceList>
              {materialResults.map((m) => (
                <ChoiceRow
                  key={m._id || m.name}
                  title={m.displayName || m.name || 'Material'}
                  meta={`$${materialPrice(m).toFixed(2)}`}
                  onClick={() => { addMaterial(m); setMaterialQuery(''); setAddSheet(null); }}
                />
              ))}
            </ChoiceList>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.594rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: facelift.text4 }}>or by SKU</Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </Box>
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
            <GoldButton onClick={addStullerMaterial} disabled={!stullerSku.trim() || loadingStuller} aria-label="Look up Stuller SKU">
              {loadingStuller ? 'Looking up…' : 'Look up'}
            </GoldButton>
          </Stack>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            A found SKU is added to the ticket with markup applied.
          </Typography>
        </Stack>
      </AddSheet>

      <AddSheet open={addSheet === 'custom'} title="Custom charge" onClose={() => setAddSheet(null)} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={customDraft.description}
            onChange={(e) => setCustomDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Rebuild unusual bezel — no catalog match"
            autoFocus={!isMobile}
            inputProps={{ style: { fontSize: 16 } }}
          />
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            <QtyStepper
              value={customDraft.quantity}
              min={1}
              onChange={(q) => setCustomDraft((prev) => ({ ...prev, quantity: q }))}
              label="Custom line quantity"
            />
            <TextField
              type="number"
              label="Labor Hrs"
              value={customDraft.laborHours}
              onChange={(e) => setCustomDraft((prev) => ({ ...prev, laborHours: e.target.value }))}
              inputProps={{ min: 0, step: 0.1, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
            <TextField
              type="number"
              label="Price"
              value={customDraft.price}
              onChange={(e) => setCustomDraft((prev) => ({ ...prev, price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            Labor hours feed the jeweler&rsquo;s credited pay at payroll. Price is what the client is
            billed — the two are set independently on a custom line.
          </Typography>
          <GoldButton onClick={addCustomFromDraft} disabled={!customDraft.description.trim()} aria-label="Add custom charge to ticket">
            Add to ticket
          </GoldButton>
        </Stack>
      </AddSheet>

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
