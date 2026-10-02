'use client';

/**
 * useNewRepairForm — the intake form's data seam.
 *
 * Step 2 of the intake redesign (docs: facelift handoff INTAKE.md): every
 * piece of data fetching, derived state, and every handler from
 * NewRepairForm.js, moved here VERBATIM as a pure move — no logic edits, no
 * renames. The one exception by necessity: the Store select's inline
 * onChange body became `handleStoreChange(nextStoreId)` so the render could
 * call it by name; its body is unchanged.
 *
 * The component that renders from this hook is presentational; this hook
 * carries all the parity risk and is NOT redesigned with the UI.
 *
 * Split 2026-10-01 (max-lines burn-down), each piece moved verbatim and called where it used to sit, so
 * hook order is unchanged: useIntakeSetup and useIntakeCatalogs (loading), useSmartIntake, useIntakeItems
 * (line items), intakeSubmitActions (save) and intakeClientPhotoActions (new client, photo description).
 * The pricing derivation (pricedRepair / previewLinePrice / pricedFormData) stays here.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// THE pricing engine. Every price on this form is derived by priceRepairLines from the context the
// server prices with (GET /api/pricing/context) — nothing on a line is trusted as a price.
import { priceRepairLines } from '@/services/pricing/repairLines';
import { stripComputedPrices } from '@/services/pricing/computedFields';

// Context
import { useRepairs } from '@/app/context/repairs.context';

// Hooks
import usePromiseDateEstimate from '@/hooks/repairs/usePromiseDateEstimate';

// The pieces of the intake (see the header).
import { intakeClientPhotoActions } from './intakeClientPhotoActions';
import { intakeSubmitActions } from './intakeSubmitActions';
import { useIntakeItems } from './useIntakeItems';
import { useSmartIntake } from './useSmartIntake';
import { useIntakeCatalogs } from './useIntakeCatalogs';
import { useIntakeSetup } from './useIntakeSetup';
export { toNumber } from './newRepairFormHelpers';

export default function useNewRepairForm({
  onSubmit,
  initialData = null,
  submitMode = 'create',
  persistOnSubmit = true,
  isQuote = false,
  repairID = null,
  clientInfo = null,
  isWholesale = false,
  // Whether the PERSON filling this in is a wholesaler, which `isWholesale` cannot answer: that is
  // also true for an admin who arrived with a store preset. Defaults to the old meaning.
  viewerIsWholesaler = null,
  onWholesaleChange = null,
  wholesalerStoreId = null,
  wholesalerStoreName = null
}) {
  // Repairs context for updating the repairs list
  const { addRepair, updateRepair } = useRepairs();

  // Form state
  const [formData, setFormData] = useState({
    // Client info
    userID: clientInfo?.userID || '',
    clientName: clientInfo?.name || '',
    // The shop took in a wholesale tray and the store gave no end-customer name. Admin intake only;
    // the server keys the ticket to the store and re-stamps this (POST /api/repairs).
    clientNotProvided: false,

    // Repair details
    smartIntakeInput: '',
    description: '',
    promiseDate: '',
    isRush: false,

    // Item details
    metalType: '',
    goldColor: '',
    karat: '',

    // Ring sizing (only shown for rings)
    isRing: false,
    currentRingSize: '',
    desiredRingSize: '',

    // Notes
    notes: '',
    internalNotes: '',

    // Repair items
    tasks: [],
    materials: [],
    customLineItems: [],

    // Pricing
    isWholesale: isWholesale || false, // Set wholesale status from prop
    storeId: 'engel-fine-design',
    storeName: 'Engel Fine Design',
    includeDelivery: false,
    includeTax: true, // Tax enabled by default
    compRepair: false,
    includedWithSale: false,
    whileYouWait: false,
    assignedTo: '',
    assignedJeweler: '',

    // Image
    picture: null
  });

  // Auto-suggested promise date (read-only for wholesalers, see render below).
  const {
    estimate: promiseDateEstimate,
    context: promiseDateContext,
    loading: promiseDateLoading,
    error: promiseDateError,
  } = usePromiseDateEstimate({
    tasks: formData.tasks,
    isRush: formData.isRush,
    isWholesale: formData.isWholesale,
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expandedSection, setExpandedSection] = useState('details');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [analyzingSmartIntake, setAnalyzingSmartIntake] = useState(false);
  const [smartIntakeError, setSmartIntakeError] = useState('');
  const [generatingImageDescription, setGeneratingImageDescription] = useState(false);
  const [imageDescriptionError, setImageDescriptionError] = useState('');

  // Ref to track business name resolved from account settings (avoids race condition)
  const wholesalerBusinessNameRef = useRef(null);
  const pricingContextRef = useRef(null);
  const hydratingPricingContextRef = useRef(null);
  // Smart-intake log ids (sentence + photo suggestions) this ticket started from; sent with the save.
  const smartIntakeLogIDsRef = useRef([]);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'customer' // Default role
  });
  const [newClientLoading, setNewClientLoading] = useState(false);
  // The store's own resale markup — null until it loads (and for EFD's own tickets).
  const [wholesalerPricingSettings, setWholesalerPricingSettings] = useState(null);

  // Data lists
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [benchJewelers, setBenchJewelers] = useState([]);
  const adminUsersRef = useRef([]); // Store admin client list for restoring after wholesale switch
  const [availableStores, setAvailableStores] = useState([
    {
      id: 'engel-fine-design',
      name: 'Engel Fine Design',
      isWholesale: false
    }
  ]);

  // Rush job state
  const [rushJobInfo, setRushJobInfo] = useState({
    canCreate: true,
    currentRushJobs: 0,
    maxRushJobs: 0,
    remainingSlots: 0
  });

  // Stuller integration state
  const [stullerSku, setStullerSku] = useState('');
  const [loadingStuller, setLoadingStuller] = useState(false);
  const [stullerError, setStullerError] = useState('');
  const [picturePreviewUrl, setPicturePreviewUrl] = useState('');

  // What every price on this form is calculated from: the shop's pricing settings and the cost fields of
  // the materials and tools catalogs — loaded from the server's own loadPricingContext, so the browser
  // and the server price from the same numbers. NO DEFAULTS: if the settings don't load, or any is
  // missing, `pricingError` says so and nothing on the form is priced (owner, 2026-09-30: "Intake should
  // never load without our settings, and there should never be a fallback"). This replaced a hard-coded
  // 1.5 wholesale markup, $25 delivery and 8.75% tax that stood in whenever the settings fetch failed.
  const [pricingContext, setPricingContext] = useState(null);
  const [pricingError, setPricingError] = useState('');

  useIntakeSetup({
    clientInfo,
    formData,
    hydratingPricingContextRef,
    initialData,
    isWholesale,
    pricingContextRef,
    setAvailableStores,
    setFormData,
    setPicturePreviewUrl,
    setPricingContext,
    setPricingError,
    setWholesalerPricingSettings,
    submitMode,
    wholesalerBusinessNameRef,
    wholesalerStoreId,
  });

  // EVERY price on this form, derived — by THE engine, from what was chosen. A metal change, a wholesale
  // toggle or a quantity change re-prices because this re-runs, not because a handler remembered to.
  // Null while (or if) pricing hasn't loaded; the screens show pricingError then.
  const pricedRepair = useMemo(() => {
    if (!pricingContext) return null;
    return priceRepairLines(formData, {
      ...pricingContext,
      tasks: availableTasks,
      storeMarkup: wholesalerPricingSettings?.retailMarkupMultiplier ?? null,
    });
  }, [formData, pricingContext, availableTasks, wholesalerPricingSettings]);

  // What a catalog item WOULD cost on this ticket, one of it — for pickers that show a price before the
  // item is added. Priced exactly as the line will be. Null while pricing hasn't loaded.
  const previewLinePrice = useCallback((type, item) => {
    if (!pricingContext || !item) return null;
    const line = { ...stripComputedPrices(item), id: 'preview', quantity: 1 };
    const r = priceRepairLines({
      ...formData,
      tasks: type === 'tasks' ? [line] : [],
      materials: type === 'materials' ? [line] : [],
      customLineItems: [],
    }, {
      ...pricingContext,
      tasks: availableTasks,
      storeMarkup: wholesalerPricingSettings?.retailMarkupMultiplier ?? null,
    });
    const priced = (type === 'tasks' ? r.tasks : r.materials)[0];
    return priced ? { price: priced.price, retailPrice: priced.retailPrice, error: priced.pricingError } : null;
  }, [formData, pricingContext, availableTasks, wholesalerPricingSettings]);

  // The form as the screens see it: the person's choices, with the engine's prices on every line.
  const pricedFormData = useMemo(() => (pricedRepair ? {
    ...formData,
    tasks: pricedRepair.tasks,
    materials: pricedRepair.materials,
    customLineItems: pricedRepair.customLineItems,
  } : formData), [formData, pricedRepair]);

  // Load available items for selection and rush job info
  useIntakeCatalogs({
    adminUsersRef,
    isWholesale,
    setAvailableMaterials,
    setAvailableStores,
    setAvailableTasks,
    setAvailableUsers,
    setBenchJewelers,
    setErrors,
    setFormData,
    setRushJobInfo,
    wholesalerBusinessNameRef,
    wholesalerStoreId,
    wholesalerStoreName,
  });

  const getJewelerLabel = (jeweler) => (
    [jeweler.firstName, jeweler.lastName].filter(Boolean).join(' ').trim()
    || jeweler.name
    || jeweler.email
    || jeweler.userID
  );

  // Smart intake: the typed sentence (AI or rule-based) → tasks, materials, metal, sizes, promise date.
  const { handleAnalyzeSmartIntake } = useSmartIntake({
    availableMaterials,
    availableTasks,
    formData,
    setAnalyzingSmartIntake,
    setFormData,
    setSmartIntakeError,
    smartIntakeLogIDsRef,
  });

  // Sync wholesale status from props and recalculate prices
  const prevWholesaleProp = useRef(isWholesale);
  useEffect(() => {
    // Only update if the prop actually changed, not the form state
    if (prevWholesaleProp.current !== isWholesale) {
      prevWholesaleProp.current = isWholesale;
      // Who the ticket is for changed: a saved ticket's lines are re-priced for it.
      setFormData(prev => releaseAllTicketPrices({
        ...prev,
        isWholesale: isWholesale
      }));
    }
  }, [isWholesale]); // Only depend on the prop, not the form state

  const {
    getKaratOptions,
    calculateTotalCost,
    addTask,
    addMaterial,
    addCustomLineItem,
    addCustomLaborTask,
    patchCustomLaborTask,
    releaseAllTicketPrices,
    recalculateAllItemPrices,
    handleStoreChange,
    addStullerMaterial,
    removeItem,
    updateItem,
  } = useIntakeItems({
    adminUsersRef,
    availableStores,
    formData,
    hydratingPricingContextRef,
    onWholesaleChange,
    pricedRepair,
    pricingContext,
    pricingContextRef,
    setAvailableUsers,
    setFormData,
    setLoadingStuller,
    setStullerError,
    setStullerSku,
    stullerSku,
  });

  const {
    handleSubmit,
  } = intakeSubmitActions({
    addRepair,
    benchJewelers,
    formData,
    getJewelerLabel,
    initialData,
    isQuote,
    isWholesale,
    onSubmit,
    persistOnSubmit,
    pricedRepair,
    pricingError,
    repairID,
    rushJobInfo,
    setErrors,
    setLoading,
    smartIntakeLogIDsRef,
    submitMode,
    updateRepair,
    viewerIsWholesaler,
  });

  const {
    formatPhoneNumber,
    handleAddNewClient,
    handleImageCapture,
    handleGenerateDescriptionFromImage,
  } = intakeClientPhotoActions({
    formData,
    newClientData,
    onWholesaleChange,
    recalculateAllItemPrices,
    setAvailableUsers,
    setFormData,
    setGeneratingImageDescription,
    setImageDescriptionError,
    setNewClientData,
    setNewClientLoading,
    setShowNewClientDialog,
    smartIntakeLogIDsRef,
  });

  return {
    // Form state — with the engine's price on every line (pricedFormData)
    formData: pricedFormData,
    setFormData,

    // UI state
    loading,
    errors,
    expandedSection,
    setExpandedSection,
    showNewClientDialog,
    setShowNewClientDialog,
    analyzingSmartIntake,
    smartIntakeError,
    setSmartIntakeError,
    generatingImageDescription,
    imageDescriptionError,
    setImageDescriptionError,
    newClientData,
    setNewClientData,
    newClientLoading,
    picturePreviewUrl,

    // Data lists
    availableTasks,
    availableMaterials,
    availableUsers,
    benchJewelers,
    availableStores,
    rushJobInfo,
    wholesalerPricingSettings,

    // Pricing — THE engine's, or an error saying why there is none
    pricingSettings: pricingContext?.settings || null,
    pricingError,
    pricingTotals: pricedRepair?.totals || null,
    unpricedLines: pricedRepair?.unpriced || [],
    previewLinePrice,

    // Stuller
    stullerSku,
    setStullerSku,
    loadingStuller,
    stullerError,
    addStullerMaterial,

    // Promise date estimate
    promiseDateEstimate,
    promiseDateContext,
    promiseDateLoading,
    promiseDateError,

    // Derived helpers
    getJewelerLabel,
    getKaratOptions,
    calculateTotalCost,
    formatPhoneNumber,

    // Handlers
    handleStoreChange,
    addTask,
    addMaterial,
    addCustomLineItem,
    addCustomLaborTask,
    patchCustomLaborTask,
    removeItem,
    updateItem,
    recalculateAllItemPrices,
    handleSubmit,
    handleAddNewClient,
    handleImageCapture,
    handleGenerateDescriptionFromImage,
    handleAnalyzeSmartIntake
  };
}
