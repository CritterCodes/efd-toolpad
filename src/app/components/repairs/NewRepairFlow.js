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
 * business logic lives here. The DEFAULT intake on /dashboard/repairs/new since 2026-09-21
 * (the classic NewRepairForm remains at ?ui=classic as a fallback).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';

import { taskAllowsMetal } from '@/services/repairs/metalTaskFilter';
import { calculatedCustomLaborPrice, buildCustomLaborTask } from '@/services/repairs/customLabor';
import { canSkipIntakeClient, intakeClientSettled } from '@/services/repairs/intakeClientRule';
import useNewRepairForm, { toNumber } from '@/hooks/repairs/useNewRepairForm';
import { STEPS, StepHeader, initials } from './NewRepairFlowParts';
import { NewRepairFlowClientDialog } from './NewRepairFlowClientDialog';
import { NewRepairFlowAddSheets } from './NewRepairFlowAddSheets';
import { NewRepairFlowStepActions } from './NewRepairFlowStepActions';
import { NewRepairFlowReview } from './NewRepairFlowReview';
import { NewRepairFlowWork } from './NewRepairFlowWork';
import { NewRepairFlowPiece } from './NewRepairFlowPiece';
import { NewRepairFlowWho } from './NewRepairFlowWho';
import {
  facelift,
} from '@/components/facelift';

export default function NewRepairFlow(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isWholesale, submitMode = 'create', submitLabel = '', isQuote = false, onCancel, onPrintChoice, storePreset = false, onClearStorePreset } = props;
  // `isWholesale` means the FORM is in wholesale mode, which is also true for an admin who arrived
  // with a store preset ("Another for <store>", a scanned tray) — so it cannot answer "is the person
  // filling this in a wholesaler?". Using it for that took the "no client" option away on exactly the
  // path that needs it most. `viewerIsWholesaler` comes from the session role; it falls back to the
  // old meaning for callers that don't pass it.
  const viewerIsWholesaler = props.viewerIsWholesaler ?? isWholesale;

  const {
    formData, setFormData,
    loading, errors,
    showNewClientDialog, setShowNewClientDialog,
    analyzingSmartIntake, smartIntakeError, setSmartIntakeError,
    generatingImageDescription, imageDescriptionError, setImageDescriptionError,
    newClientData, setNewClientData, newClientLoading,
    picturePreviewUrl,
    availableTasks, availableMaterials, availableUsers, benchJewelers, availableStores,
    rushJobInfo, pricingSettings, pricingError, pricingTotals, previewLinePrice, wholesalerPricingSettings,
    stullerSku, setStullerSku, loadingStuller, stullerError, addStullerMaterial,
    promiseDateEstimate, promiseDateContext, promiseDateLoading, promiseDateError,
    getJewelerLabel, getKaratOptions, formatPhoneNumber,
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
  // An admin taking in a store's tray may skip the client (owner, 2026-09-28): the end customer is the
  // STORE's customer and often never named. services/repairs/intakeClientRule.js owns the rule, so
  // this screen and the submit validation cannot drift apart.
  const ruleInput = {
    viewerIsWholesaler,
    ticketIsWholesale: formData.isWholesale,
    clientName: formData.clientName,
    clientNotProvided: formData.clientNotProvided,
  };
  const canSkipClient = canSkipIntakeClient(ruleInput);
  const clientSettled = intakeClientSettled(ruleInput);
  const stepBlocker = step === 0 && !clientSettled
    ? 'Pick a client to continue'
    : step === 1 && !String(formData.description || '').trim()
      ? 'Add a description to continue'
      : null;

  // Arriving from "Another for <store>" (or a scanned tray): the account step is already answered, so
  // land on the piece instead of making the shop tap through a screen with one decision left on it.
  // The client is not guessed away — the row reads "No client given · Add one" and step 1 is one tap
  // back — but the default for a tray the shop takes in is that there is no customer name.
  const presetJumped = useRef(false);
  useEffect(() => {
    if (presetJumped.current || !storePreset || viewerIsWholesaler) return;
    if (!formData.isWholesale) return; // the store is still resolving
    if (String(formData.clientName || '').trim()) return;
    presetJumped.current = true;
    setFormData((prev) => ({ ...prev, clientNotProvided: true }));
    setStep((s) => (s === 0 ? 1 : s));
  }, [storePreset, viewerIsWholesaler, formData.isWholesale, formData.clientName, setFormData]);

  // A submit error is shown next to the buttons that caused it, and scrolled into view.
  const submitErrorRef = useRef(null);
  useEffect(() => {
    if (errors.submit && submitErrorRef.current) {
      submitErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors.submit]);
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // The gold Total on the review step — THE engine's (the same totals the classic form's card shows).
  const reviewTotal = pricingTotals ? pricingTotals.total : null;

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
  // The customer's userID FIRST — never the Mongo _id (EFD-DEFECTS C1: 75 repairs were filed under it).
  const clientId = (option) => option.userID || option.clientID || option._id || option.id || '';

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
  // What a material would cost on this ticket, priced exactly as its line will be — or why it can't be.
  const materialPriceLabel = (option) => {
    const preview = previewLinePrice('materials', option);
    if (!preview) return '';
    return preview.price == null ? (preview.error || "Can't price") : `$${preview.price.toFixed(2)}`;
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

  const clientPill = (formData.clientName || formData.clientNotProvided) && (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.875, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', alignSelf: 'flex-start', maxWidth: '100%' }}>
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(251,191,36,0.14)', color: facelift.gold, fontWeight: 600, fontSize: '0.5625rem' }}>
        {formData.clientName ? initials(formData.clientName) : '—'}
      </Box>
      <Typography sx={{ fontFamily: facelift.mono, fontSize: '0.6875rem', color: facelift.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formData.clientName || 'No client given'} · {formData.storeName}
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
  // Null until there are hours to price (or if pricing didn't load).
  const laborDraftCalculated = pricingSettings
    ? calculatedCustomLaborPrice(
        buildCustomLaborTask({ laborHours: laborDraft.laborHours, settings: pricingSettings, isWholesale: formData.isWholesale }),
        { isWholesale: formData.isWholesale },
      )
    : null;
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

  // Everything the step sections read, passed whole to each (each section takes only the names it uses).
  const flow = {
    addCustomFromDraft, addLaborFromDraft, addMaterial, addSheet, addStullerMaterial, addTask,
    analyzingSmartIntake, appendDictated, benchJewelers, canRequestQuote, canSkipClient, clientId, clientLabel,
    clientPickerOpen, clientPill, clientQuery, commonTasks, customDraft, dictation, errors, extractedChips,
    filteredClients, filteredStores, formData, formatPhoneNumber, generatingImageDescription, getJewelerLabel,
    goNext, handleAddNewClient, handleAnalyzeSmartIntake, handleGenerateDescriptionFromImage,
    handleStoreChange, imageDescriptionError, isComped, isMobile, isQuote, isWholesale, itemCount,
    itemsSubtotal, karatOptions, laborDraft, laborDraftCalculated, laborDraftPrice, loading, loadingStuller,
    materialPriceLabel, materialQuery, materialResults, metalAllowedTasks, metalSummary, newClientData,
    newClientLoading, onClearStorePreset, onDictationStatus, patchCustomLaborTask, picturePreviewUrl,
    pricingSettings, pricingTotals, promiseDateContext, promiseDateError, promiseDateEstimate,
    promiseDateLoading, queryMatchesClient, quoteIntent, removeItem, requestQuote, reviewTotal, rushJobInfo,
    setAddSheet, setClientPickerOpen, setClientQuery, setCustomDraft, setFormData, setImageDescriptionError,
    setLaborDraft, setMaterialQuery, setNewClientData, setQuoteIntent, setShowFullBreakdown,
    setShowNewClientDialog, setSmartIntakeError, setStep, setStorePickerOpen, setStoreQuery, setStullerSku,
    setTaskQuery, showFullBreakdown, showNewClientDialog, smartIntakeError, step, stepBlocker, storePickerOpen,
    storePreset, storeQuery, stullerError, stullerSku, submitErrorRef, submitLabel, submitMode, submitWith,
    taskQuery, taskResults, updateItem, users, wholesaleStores, wholesalerPricingSettings,
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

        {/* No settings, no prices — and the form says so instead of pricing from defaults. */}
        {pricingError && <Alert severity="error">{pricingError}</Alert>}
        {errors.submit && step !== 3 && <Alert severity="error">{errors.submit}</Alert>}

        <NewRepairFlowWho {...flow} />

        <NewRepairFlowPiece {...flow} />

        <NewRepairFlowWork {...flow} />

        <NewRepairFlowReview {...flow} />
      </Stack>

      <NewRepairFlowStepActions {...flow} />

      <NewRepairFlowAddSheets {...flow} />

      <NewRepairFlowClientDialog {...flow} />
    </Box>
  );
}
