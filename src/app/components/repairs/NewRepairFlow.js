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
 *     opens full-screen add sheets (task / material / labor / charge)
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
  useTheme,
  InputAdornment
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

import { taskAllowsMetal } from '@/services/repairs/metalTaskFilter';
import { isCustomLaborTask, calculatedCustomLaborPrice, buildCustomLaborTask } from '@/services/repairs/customLabor';
import { RING_SIZES } from '@/services/repairs/smartIntakeExtractors';
import CameraCapture from '@/components/shared/CameraCapture';
import SmartIntakeMic from '@/app/components/repairs/SmartIntakeMic';
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
function StepHeader({ step, title, onBack, onCancel }) {
  const isFirst = step === 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* ‹ goes back a step; ✕ always leaves the intake (a jeweler shouldn't need three backs to get out). */}
      <TapIconButton aria-label={isFirst ? 'Cancel new repair' : 'Back a step'} onClick={isFirst ? onCancel : onBack}>
        <span style={{ fontSize: 18, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>{isFirst ? '✕' : '‹'}</span>
      </TapIconButton>
      <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.016em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title || STEPS[step].title}
      </Typography>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
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
        {!isFirst && (
          <TapIconButton aria-label="Cancel new repair" onClick={onCancel} style={{ marginLeft: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1, color: 'rgba(255,255,255,0.6)' }}>✕</span>
          </TapIconButton>
        )}
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
function TicketRow({ kind, hue, item, title, fromSentence, onQuantityChange, onPriceChange, priceEditable, extraFields, beforePrice, onRemove }) {
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
      {title !== undefined ? (
        <Box sx={{ mt: 0.75 }}>{title}</Box>
      ) : (
        <Typography sx={{ mt: 0.75, fontWeight: 600, fontSize: '0.9375rem' }}>
          {item.title || item.displayName || item.name || 'Custom line'}
        </Typography>
      )}
      {title === undefined && item.description && (item.title || item.displayName || item.name) !== item.description && (
        <Typography variant="caption" sx={{ color: facelift.text2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description}
        </Typography>
      )}
      {item.isStullerItem && item.stullerData && (
        <Typography variant="caption" sx={{ color: facelift.gold, display: 'block', fontFamily: facelift.mono, fontSize: '0.6875rem' }}>
          SKU {item.stullerData.itemNumber} · Stuller cost ${toNumber(item.stullerData.originalPrice).toFixed(2)}{item.stullerData.pricedAs ? ` · priced ${item.stullerData.pricedAs}` : ''}
        </Typography>
      )}
      {extraFields}
      <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <QtyStepper value={item.quantity || 1} min={1} onChange={onQuantityChange} label={`${item.title || item.description || 'item'} quantity`} />
        {beforePrice}
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

/** A line's description edited in place, styled as the row title — one row, not a title plus a field. */
function InlineTitleField({ value, onChange, placeholder, ariaLabel }) {
  return (
    <TextField
      fullWidth
      variant="standard"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': ariaLabel, style: { fontSize: 16, fontWeight: 600, padding: '2px 0' } }}
      InputProps={{ disableUnderline: true }}
      sx={{ '& .MuiInputBase-root': { fontSize: '0.9375rem' } }}
    />
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
function ReviewRow({ label, value, valueColor, editor, defaultOpen = false, autoCollapse = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const touched = useRef(false);
  // Opened by default while waiting on a value (e.g. the promise-date suggestion) → fold shut
  // when it arrives, unless the jeweler opened it themselves.
  useEffect(() => {
    if (autoCollapse && open && !touched.current) setOpen(false);
  }, [autoCollapse]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Box sx={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
      <Box
        component={editor ? 'button' : 'div'}
        type={editor ? 'button' : undefined}
        onClick={editor ? () => { touched.current = true; setOpen((o) => !o); } : undefined}
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
  const { isWholesale, submitMode = 'create', submitLabel = '', isQuote = false, onCancel, onPrintChoice } = props;

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
    addTask, addMaterial, addCustomLineItem, addCustomLaborTask, patchCustomLaborTask, removeItem, updateItem,
    handleSubmit, handleAddNewClient, handleGenerateDescriptionFromImage, handleAnalyzeSmartIntake
  } = useNewRepairForm(props);

  const [step, setStep] = useState(0);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [storeQuery, setStoreQuery] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [addSheet, setAddSheet] = useState(null); // 'task' | 'material' | 'labor' | 'custom' | null
  const [taskQuery, setTaskQuery] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');
  const [customDraft, setCustomDraft] = useState({ description: '', quantity: 1, price: 0 });
  // Custom LABOR is a task priced from hours (services/repairs/customLabor.js); `price` stays ''
  // until the jeweler types over the calculated number, which then becomes a remembered override.
  const EMPTY_LABOR = { description: '', laborHours: 0, quantity: 1, price: '' };
  const [laborDraft, setLaborDraft] = useState(EMPTY_LABOR);
  const [reviewTotal, setReviewTotal] = useState(null);
  // Voice input for the sentence: each finished phrase is appended; when the jeweler taps the
  // mic to STOP (not when the engine times out), the sentence is analyzed for them.
  const [dictation, setDictation] = useState({ listening: false, interim: '', error: '', endedByUser: false });
  const analyzeAfterDictationRef = useRef(false);
  const appendDictated = (text) => {
    setSmartIntakeError('');
    setFormData((prev) => ({ ...prev, smartIntakeInput: [String(prev.smartIntakeInput || '').trim(), text].filter(Boolean).join(' ') }));
  };
  const onDictationStatus = (status) => {
    if (status.endedByUser) analyzeAfterDictationRef.current = true;
    setDictation((prev) => ({ ...prev, ...status }));
  };
  useEffect(() => {
    if (!analyzeAfterDictationRef.current || dictation.listening) return;
    analyzeAfterDictationRef.current = false;
    if (String(formData.smartIntakeInput || '').trim()) handleAnalyzeSmartIntake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.listening, formData.smartIntakeInput]);

  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  // Request Quote (wholesale): the store can't price the job. Chosen on the Work items step (where
  // they're staring at an empty ticket) or on Review; the repair is created with NO tasks and EFD is
  // asked to quote it (services/repairs/quoteRequest.js). `quoteIntent` carries the choice from
  // Work items to Review, where the primary button becomes "Request quote".
  const [quoteIntent, setQuoteIntent] = useState(false);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  // What stops "Next" on this step — surfaced under the button instead of as a thrown error four
  // screens later. Mirrors the hook's submit validation (client name, description).
  const stepBlocker = step === 0 && !String(formData.clientName || '').trim()
    ? 'Pick a client to continue'
    : step === 1 && !String(formData.description || '').trim()
      ? 'Add a description to continue'
      : null;

  // A submit error is shown next to the buttons that caused it, and scrolled into view.
  const submitErrorRef = useRef(null);
  useEffect(() => {
    if (errors.submit && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors.submit]);
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
  // The account switcher makes the picker wholesale-only: Retail IS Engel
  // Fine Design, so the list only ever chooses between wholesale stores.
  const wholesaleStores = stores.filter((store) => store.isWholesale);
  const filteredStores = (storeQuery
    ? wholesaleStores.filter((store) => String(store.name || '').toLowerCase().includes(storeQuery.toLowerCase()))
    : wholesaleStores);

  // Search-only autocomplete: no rows until the user types, then the best 8.
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

  const canRequestQuote = Boolean(formData.isWholesale) && submitMode === 'create' && !isQuote;
  // A quote request still prints the ticket — the piece travels with paper like any other job; the
  // ticket shows "quote pending" in place of a total (components/print/RepairTicketComponent.js).
  const requestQuote = () => {
    if (onPrintChoice) onPrintChoice(true);
    handleSubmit({ requestQuote: true });
  };

  // What the engine would charge for the drafted hours, in this ticket's pricing context.
  const laborDraftCalculated = calculatedCustomLaborPrice(
    buildCustomLaborTask({ laborHours: laborDraft.laborHours, adminSettings, isWholesale: formData.isWholesale }),
    { isWholesale: formData.isWholesale },
  );
  const laborDraftPrice = laborDraft.price === '' ? laborDraftCalculated : toNumber(laborDraft.price);

  const addLaborFromDraft = () => {
    addCustomLaborTask({
      description: laborDraft.description.trim(),
      laborHours: toNumber(laborDraft.laborHours),
      quantity: Math.max(1, Number(laborDraft.quantity) || 1),
      ...(laborDraft.price === '' ? {} : { price: toNumber(laborDraft.price) }),
    });
    setLaborDraft(EMPTY_LABOR);
    setAddSheet(null);
  };

  const addCustomFromDraft = () => {
    addCustomLineItem({ description: customDraft.description.trim(), quantity: customDraft.quantity, price: customDraft.price });
    setCustomDraft({ description: '', quantity: 1, price: 0 });
    setAddSheet(null);
  };

  return (
    /* Phone-first column; on wide screens it stays a readable column instead of stretching rows and
       the gold button across a 1000px main area. */
    <Box sx={{ pb: { xs: 6, sm: 4 }, maxWidth: 720, mx: 'auto' }}>
      <Stack spacing={2.5}>
        <StepHeader
          step={step}
          title={step === 0 && submitMode === 'edit' ? 'Edit repair' : undefined}
          onBack={goBack}
          onCancel={onCancel || goBack}
        />

        {errors.submit && step !== 3 && <Alert severity="error">{errors.submit}</Alert>}

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
                ) : (
                  <Stack spacing={1.25}>
                    {/* The mock's Retail / Wholesale switcher. Retail IS Engel
                        Fine Design; Wholesale opens the store picker. */}
                    <Segmented
                      options={[
                        { value: 'retail', label: 'Retail' },
                        { value: 'wholesale', label: 'Wholesale' },
                      ]}
                      value={formData.isWholesale ? 'wholesale' : 'retail'}
                      onChange={(value) => {
                        if (value === 'retail') {
                          handleStoreChange('engel-fine-design');
                          setStorePickerOpen(false);
                          setStoreQuery('');
                        } else if (!formData.isWholesale) {
                          // No wholesale store chosen yet — open the picker.
                          setStorePickerOpen(true);
                        }
                      }}
                      aria-label="Account type"
                    />
                    {formData.isWholesale && !storePickerOpen && (
                      <ChoiceRow
                        lead={initials(formData.storeName)}
                        title={formData.storeName || 'Wholesale store'}
                        meta="Wholesale pricing · net terms"
                        trailing={<Typography component="span" sx={{ color: facelift.gold, fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>Change</Typography>}
                        selected
                        aria-expanded={false}
                        onClick={() => setStorePickerOpen(true)}
                      />
                    )}
                    {storePickerOpen && (
                      <>
                        {wholesaleStores.length > 12 && (
                          <SearchField placeholder="Search stores…" value={storeQuery} onChange={(e) => setStoreQuery(e.target.value)} />
                        )}
                        <ChoiceList>
                          {filteredStores.map((store) => (
                            <ChoiceRow
                              key={store.id}
                              lead={initials(store.name)}
                              title={store.name}
                              meta="Wholesale pricing · net terms"
                              trailing={<StatusChip label="Wholesale" hue="#7DD3FC" />}
                              selected={String(store.id) === String(formData.storeId)}
                              onClick={() => { handleStoreChange(store.id); setStorePickerOpen(false); setStoreQuery(''); }}
                            />
                          ))}
                          {wholesaleStores.length === 0 && (
                            <Typography variant="caption" sx={{ color: facelift.text2 }}>
                              No wholesale accounts yet.
                            </Typography>
                          )}
                        </ChoiceList>
                      </>
                    )}
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
                    {(filteredClients.length > 0 || clientQuery.trim()) && (
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
                        {!isWholesale && !formData.isWholesale && clientQuery.trim() && !queryMatchesClient && (
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
                placeholder={dictation.listening ? 'Listening… say what needs doing' : 'Size down 14k white gold ring from 7 to 6.5, retip two prongs'}
                inputProps={{ style: { fontSize: 16 } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                      <SmartIntakeMic onTranscript={appendDictated} onStatus={onDictationStatus} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mt: 1.5 }}
              />
              {dictation.listening && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: facelift.gold }}>
                  Listening{dictation.interim ? `: “${dictation.interim}”` : '…'} Tap the mic again to stop and analyze.
                </Typography>
              )}
              {dictation.error && <Alert severity="warning" sx={{ mt: 1.5 }}>{dictation.error}</Alert>}
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                <GoldButton onClick={handleAnalyzeSmartIntake} disabled={analyzingSmartIntake || dictation.listening} aria-label="Analyze the sentence">
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
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        label={typeof formData.picture === 'string' ? 'Existing photo' : (formData.picture.name || 'Captured photo')}
                        onDelete={() => setFormData((prev) => ({ ...prev, picture: null }))}
                        sx={{ maxWidth: 250, height: 44 }}
                      />
                      <QuietButton
                        onClick={() => handleGenerateDescriptionFromImage()}
                        disabled={generatingImageDescription}
                        aria-label="Rewrite the description from the photo"
                      >
                        {generatingImageDescription ? 'Writing…' : 'Rewrite description from photo'}
                      </QuietButton>
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
                          {task.priceOverridden && calculatedCustomLaborPrice(task, { isWholesale: !!formData.isWholesale }) !== toNumber(task.price)
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
                      priceEditable
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
                    {rushJobInfo.canCreate && rushJobInfo.remainingSlots <= 2 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#F59E0B' }}>
                        {rushJobInfo.remainingSlots} rush job slot{rushJobInfo.remainingSlots === 1 ? '' : 's'} remaining
                      </Typography>
                    )}
                    {formData.isRush && (
                      <Typography variant="caption" sx={{ display: 'block', color: facelift.text2 }}>
                        Rush jobs have {((toNumber(adminSettings.rushMultiplier) - 1) * 100).toFixed(0)}% markup
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
      {/* The sticky containing block must be the tall root, not a wrapper the size of the bar itself
          (position:sticky can't move outside its parent) — so the wrapper IS the sticky element. */}
      <Box sx={{ mt: 2.5, position: 'sticky', bottom: 0, zIndex: 5 }}>
        {STEPS[step].next ? (
          <ActionBar>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              {stepBlocker && (
                /* Solid pill: the bar's gradient is transparent at the top, so plain text here would
                   sit over whatever scrolls under it. */
                <Typography
                  variant="caption"
                  sx={{
                    alignSelf: 'center', color: facelift.text2, mb: 0.75, px: 1.5, py: 0.5, borderRadius: 999,
                    backgroundColor: facelift.ground, border: `1px solid ${facelift.hairline}`,
                  }}
                >
                  {stepBlocker}
                </Typography>
              )}
              <GoldButton onClick={goNext} disabled={Boolean(stepBlocker)} aria-disabled={Boolean(stepBlocker)}>
                {STEPS[step].next}
              </GoldButton>
            </Box>
          </ActionBar>
        ) : (
          /* Sticky like the other steps: the review rows scroll, the actions never leave the screen. */
          <ActionBar>
            <Stack spacing={0.75} sx={{ width: '100%' }}>
              {errors.submit && <Alert ref={submitErrorRef} severity="error" sx={{ py: 0 }}>{errors.submit}</Alert>}
              {quoteIntent && canRequestQuote ? (
                <>
                  <GoldButton onClick={requestQuote} disabled={loading} aria-label="Request quote and print ticket">
                    <PrintGlyph />
                    {loading ? 'Sending…' : 'Request quote & print ticket'}
                  </GoldButton>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <QuietButton onClick={() => setQuoteIntent(false)} disabled={loading} aria-label="Price it myself instead">
                      Price it myself instead
                    </QuietButton>
                  </Box>
                </>
              ) : (
                <>
                  <GoldButton onClick={() => submitWith(true)} disabled={loading} aria-label={submitMode === 'edit' ? 'Save and print ticket' : 'Create and print ticket'}>
                    <PrintGlyph />
                    {loading ? 'Saving…' : (submitLabel || (submitMode === 'edit' ? 'Save & print ticket' : 'Create & print ticket'))}
                  </GoldButton>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <QuietButton onClick={() => submitWith(false)} disabled={loading} aria-label="Save without printing">
                      Save without printing
                    </QuietButton>
                    {/* Stores are pushed to price their own jobs; when they can't, this creates the repair with
                        no tasks and asks EFD to quote it (services/repairs/quoteRequest.js). */}
                    {canRequestQuote && (
                      <QuietButton onClick={requestQuote} disabled={loading} aria-label="Request a quote instead">
                        Request a quote instead
                      </QuietButton>
                    )}
                  </Box>
                </>
              )}
            </Stack>
          </ActionBar>
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

      <AddSheet open={addSheet === 'labor'} title="Custom labor" onClose={() => setAddSheet(null)} isMobile={isMobile}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="What was done"
            value={laborDraft.description}
            onChange={(e) => setLaborDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Laser weld, rebuild prong, re-tip claw…"
            autoFocus={!isMobile}
            inputProps={{ style: { fontSize: 16 } }}
          />
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            <QtyStepper
              value={laborDraft.quantity}
              min={1}
              onChange={(q) => setLaborDraft((prev) => ({ ...prev, quantity: q }))}
              label="Custom labor quantity"
            />
            <TextField
              type="number"
              label="Hours / unit"
              value={laborDraft.laborHours}
              onChange={(e) => setLaborDraft((prev) => ({ ...prev, laborHours: e.target.value, price: '' }))}
              inputProps={{ min: 0, step: 0.05, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
            <TextField
              type="number"
              label="Price / unit"
              value={laborDraft.price === '' ? laborDraftCalculated : laborDraft.price}
              onChange={(e) => setLaborDraft((prev) => ({ ...prev, price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            {laborDraft.price === '' || toNumber(laborDraft.price) === laborDraftCalculated
              ? `${formData.isWholesale ? 'Wholesale' : 'Retail'} price from hours: $${laborDraftCalculated.toFixed(2)} each. Type over it to discount — the hours still credit the jeweler at payroll.`
              : `Calculated $${laborDraftCalculated.toFixed(2)} each, discounted to $${laborDraftPrice.toFixed(2)}. Hours still credit the jeweler in full.`}
          </Typography>
          <GoldButton
            onClick={addLaborFromDraft}
            disabled={!laborDraft.description.trim() || toNumber(laborDraft.laborHours) <= 0}
            aria-label="Add custom labor to ticket"
          >
            Add to ticket · ${(laborDraftPrice * Math.max(1, Number(laborDraft.quantity) || 1)).toFixed(2)}
          </GoldButton>
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
              label="Price"
              value={customDraft.price}
              onChange={(e) => setCustomDraft((prev) => ({ ...prev, price: e.target.value }))}
              inputProps={{ min: 0, step: 0.01, style: { fontSize: 16 } }}
              sx={{ width: 130 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: facelift.text2 }}>
            A non-labor charge: a sourced part, a fee, a pass-through. It carries no hours and never
            enters labor credit. Work you did by hand goes on as Labor instead.
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
