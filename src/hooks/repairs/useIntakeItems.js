import { METAL_TYPES } from '@/constants/customRequest.constants';
import { useCallback, useEffect } from 'react';
import { stripComputedPrices } from '@/services/pricing/computedFields';
import { buildCustomLaborTask, updateCustomLaborTask as applyCustomLaborPatch, isCustomLaborTask } from '@/services/repairs/customLabor';
import { releaseTicketPrice } from '@/services/pricing/repairLines';
import wholesaleClientsAPIClient from '@/api-clients/wholesaleClients.client';
import { buildStullerRepairMaterial } from '@/services/pricing/stullerMaterial';

/**
 * The intake's line items (useNewRepairForm): karat options, totals, add/update/remove tasks, materials, custom lines and Stuller parts, store change. A hook (it holds a useCallback and a useEffect), called where the code used to sit so hook order is unchanged.
 */
export function useIntakeItems({ adminUsersRef, availableStores, formData, hydratingPricingContextRef, onWholesaleChange, pricedRepair, pricingContext, pricingContextRef, setAvailableUsers, setFormData, setLoadingStuller, setStullerError, setStullerSku, stullerSku }) {
  // Get karat options based on selected metal
  const getKaratOptions = () => {
    const metalConfig = METAL_TYPES.find(m => m.value === formData.metalType);
    return metalConfig?.karatOptions || [];
  };

  // The ticket's total — THE engine's (priceRepairTotals: rush, delivery and tax from the settings).
  // Async only because the screens await it; it no longer fetches anything. Null when pricing didn't load.
  const calculateTotalCost = useCallback(async () => (
    pricedRepair ? pricedRepair.totals.total : null
  ), [pricedRepair]);

  // Add item handlers. A line is the catalog item and its quantity; the price is derived.
  const addTask = (task) => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...stripComputedPrices(task), id: Date.now(), quantity: 1 }]
    }));
  };

  const addMaterial = (material) => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { ...stripComputedPrices(material), id: Date.now(), quantity: 1 }]
    }));
  };

  // Custom NON-labor charge (a sourced part, a fee). No labor hours — labor is a task.
  // `draft` is optional: the classic form adds a blank row and edits it in place; the stepped
  // flow's Charge sheet passes { description, quantity, price }. A click event is not a draft.
  const addCustomLineItem = (draft) => {
    const d = draft && typeof draft === 'object' && !draft.nativeEvent ? draft : {};
    const newItem = {
      id: Date.now(),
      description: String(d.description || ''),
      quantity: Math.max(1, parseInt(d.quantity, 10) || 1),
      price: Math.max(0, Number(d.price) || 0)
    };
    setFormData(prev => ({
      ...prev,
      customLineItems: [...prev.customLineItems, newItem]
    }));
  };

  // Custom LABOR line: a task priced from hours × wage through the task engine, so it gets
  // sign-off / hand-off / per-jeweler labor credit like any catalog task. Price is editable
  // (bulk discount) and the override survives re-pricing. See services/repairs/customLabor.js.
  // `draft` is optional: the classic form adds a blank line and edits it in place; the stepped
  // flow's Labor sheet passes { description, laborHours, quantity, price? } in one go. A click
  // event (classic onClick) is not a draft.
  const addCustomLaborTask = (draft) => {
    const d = draft && typeof draft === 'object' && !draft.nativeEvent ? draft : {};
    const settings = pricingContext?.settings;
    if (!settings) return; // pricing didn't load — nothing can be priced, and pricingError says so
    let task = buildCustomLaborTask({
      id: Date.now(),
      description: d.description || '',
      laborHours: d.laborHours || 0,
      quantity: d.quantity || 1,
      settings,
      isWholesale: formData.isWholesale,
    });
    if (d.price !== undefined && d.price !== null && d.price !== '') {
      task = applyCustomLaborPatch(task, { price: d.price }, { settings, isWholesale: formData.isWholesale });
    }
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const patchCustomLaborTask = (id, patch) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task) => (
        task.id === id && isCustomLaborTask(task)
          ? releaseTicketPrice(applyCustomLaborPatch(task, patch, { settings: pricingContext?.settings, isWholesale: prev.isWholesale }))
          : task
      ))
    }));
  };

  // Every price is derived from formData, so nothing needs re-pricing by hand. What this does: a saved
  // ticket's lines stop holding the price they were written with (the metal or the store changed).
  // Kept under its old name — the screens call it.
  const releaseAllTicketPrices = (form) => ({
    ...form,
    tasks: (form.tasks || []).map(releaseTicketPrice),
    materials: (form.materials || []).map(releaseTicketPrice),
  });
  const recalculateAllItemPrices = () => {
    setFormData((prev) => releaseAllTicketPrices(prev));
  };

  useEffect(() => {
    const metalContext = `${formData.metalType || ''}|${formData.karat || ''}|${formData.goldColor || ''}`;
    if (hydratingPricingContextRef.current) {
      if (metalContext === hydratingPricingContextRef.current) {
        pricingContextRef.current = metalContext;
        hydratingPricingContextRef.current = null;
      }
      return;
    }

    if (pricingContextRef.current === null) {
      pricingContextRef.current = metalContext;
      return;
    }

    if (pricingContextRef.current === metalContext) {
      return;
    }

    // The metal changed: a saved ticket's lines are re-priced in the new metal.
    pricingContextRef.current = metalContext;
    if (formData.tasks.length > 0 || formData.materials.length > 0) {
      recalculateAllItemPrices();
    }
  }, [formData.metalType, formData.karat, formData.goldColor]);

  // Store selection — lifted verbatim from the Store <Select> onChange in the
  // render (the only inline handler with data fetching). Body unchanged.
  const handleStoreChange = (nextStoreId) => {
    const selectedStore = (availableStores || []).find((store) => String(store.id) === String(nextStoreId));
    const nextIsWholesale = !!selectedStore?.isWholesale;

    setFormData((prev) => releaseAllTicketPrices({
      ...prev,
      storeId: nextStoreId,
      storeName: selectedStore?.name || 'Engel Fine Design',
      isWholesale: nextIsWholesale,
      includeTax: nextIsWholesale ? false : prev.includeTax,
      clientName: '',
      userID: '',
      // A new store means a new client list; "no client given" was about the store you just left.
      clientNotProvided: false
    }));

    // Switch client list based on store type
    if (nextIsWholesale) {
      setAvailableUsers([]); // Clear immediately to avoid showing stale admin clients
      wholesaleClientsAPIClient.fetchClientsByWholesaler(nextStoreId)
        .then((res) => {
          setAvailableUsers(res?.data || []);
        })
        .catch((err) => {
          console.error('Failed to fetch wholesale clients:', err);
          setAvailableUsers([]);
        });
    } else {
      setAvailableUsers(adminUsersRef.current);
    }

    if (onWholesaleChange) {
      onWholesaleChange(nextIsWholesale);
    }
  };

  // Stuller material integration
  const addStullerMaterial = async () => {
    if (!stullerSku.trim()) {
      setStullerError('Please enter a Stuller SKU');
      return;
    }

    setLoadingStuller(true);
    setStullerError('');

    try {
      // Fetch Stuller data
      const response = await fetch('/api/stuller/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNumber: stullerSku.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Stuller data');
      }

      const stullerData = await response.json();

      // The part's line carries its Stuller COST; its price is derived like every other line's (the
      // engine's pricePart — wholesale = cost × wholesale markup, retail = cost × the fee multiplier).
      const settings = pricingContext?.settings;
      if (!settings) throw new Error('Pricing did not load — the part cannot be priced. Reload the page.');
      const newMaterial = buildStullerRepairMaterial({
        item: stullerData, sku: stullerSku, isWholesale: !!formData.isWholesale, settings, category: 'stuller_gemstone',
      });

      // Add to repair materials
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, newMaterial]
      }));

      // Clear the SKU input
      setStullerSku('');

    } catch (error) {
      console.error('Error adding Stuller material:', error);
      setStullerError(error.message);
    } finally {
      setLoadingStuller(false);
    }
  };

  // Remove item handlers
  const removeItem = (type, id) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item.id !== id)
    }));
  };

  // Update item quantity/price
  const updateItem = (type, id, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((item) => {
        if (item.id !== id) return item;
        // A changed line is priced live from here on — including a saved ticket's line, which until
        // now held the price it was written with. (The quantity's volume tier is derived with it.)
        return releaseTicketPrice({ ...item, [field]: value });
      })
    }));
  };

  return {
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
  };
}
