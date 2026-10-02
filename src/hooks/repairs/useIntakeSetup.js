import { useEffect } from 'react';
import { pricingContextFromPayload } from '@/services/pricing/clientContext';
import wholesaleAccountSettingsAPIClient from '@/api-clients/wholesaleAccountSettings.client';
import { normalizeWholesalerPricingSettings } from '@/hooks/repairs/newRepairFormHelpers';
import { asTicketLines } from '@/services/pricing/repairLines';

/**
 * The intake's setup effects (useNewRepairForm): the pricing context from the server (no defaults), the store's resale settings, an existing ticket's data, the photo preview and the client's wholesale status. A hook, called where the effects used to sit so hook order is unchanged.
 */
export function useIntakeSetup({ clientInfo, formData, hydratingPricingContextRef, initialData, isWholesale, pricingContextRef, setAvailableStores, setFormData, setPicturePreviewUrl, setPricingContext, setPricingError, setWholesalerPricingSettings, submitMode, wholesalerBusinessNameRef, wholesalerStoreId }) {
  useEffect(() => {
    let cancelled = false;
    const loadPricingContext = async () => {
      try {
        const response = await fetch('/api/pricing/context');
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || `Pricing did not load (${response.status}).`);
        const ctx = pricingContextFromPayload(body);
        if (!cancelled) { setPricingContext(ctx); setPricingError(''); }
      } catch (error) {
        console.error('[repair intake] pricing did not load:', error);
        if (!cancelled) {
          setPricingContext(null);
          setPricingError(`${error?.message || 'Pricing did not load.'} Repairs can't be priced until it does — reload the page, and tell an admin if it keeps happening.`);
        }
      }
    };
    loadPricingContext();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const loadWholesalerAccountSettings = async () => {
      if (!isWholesale) {
        setWholesalerPricingSettings(null);
        return;
      }

      try {
        const settings = await wholesaleAccountSettingsAPIClient.fetchSettings(wholesalerStoreId);
        setWholesalerPricingSettings(normalizeWholesalerPricingSettings(settings || {}));

        // Use business name from account settings as the store name
        const businessName = settings?.businessProfile?.businessName;
        if (businessName) {
          wholesalerBusinessNameRef.current = businessName;
          setAvailableStores((prev) => prev.map((store) =>
            store.isWholesale ? { ...store, name: businessName } : store
          ));
          setFormData((prev) => ({
            ...prev,
            storeName: businessName
          }));
        }
      } catch (error) {
        // Your receipts then show what you pay us — never a made-up markup.
        console.warn('Failed to load wholesaler markup settings:', error);
        setWholesalerPricingSettings(null);
      }
    };

    loadWholesalerAccountSettings();
  }, [isWholesale, wholesalerStoreId]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      const { processes, ...safeInitialData } = initialData;
      const normalizedMetalType = String(safeInitialData.metalType || '').toLowerCase();
      const inferredMetalType =
        normalizedMetalType.includes('gold') ? 'gold' :
        normalizedMetalType.includes('silver') ? 'silver' :
        normalizedMetalType.includes('platinum') ? 'platinum' :
        safeInitialData.metalType || '';
      const inferredKarat =
        safeInitialData.karat ||
        (normalizedMetalType.match(/\b(10k|14k|18k|22k|925|950|999)\b/) || [])[1] ||
        '';
      const inferredGoldColor =
        safeInitialData.goldColor ||
        (String(safeInitialData.baseMetal || '').includes('yellow') ? 'yellow' :
          String(safeInitialData.baseMetal || '').includes('white') ? 'white' :
          String(safeInitialData.baseMetal || '').includes('rose') ? 'rose' :
          safeInitialData.tasks?.find((task) => String(task?.baseMetal || '').includes('yellow')) ? 'yellow' :
          safeInitialData.tasks?.find((task) => String(task?.baseMetal || '').includes('white')) ? 'white' :
          safeInitialData.tasks?.find((task) => String(task?.baseMetal || '').includes('rose')) ? 'rose' :
          safeInitialData.materials?.flatMap((material) => material?.stullerProducts || []).find((product) => String(product?.metalType || '').includes('yellow')) ? 'yellow' :
          safeInitialData.materials?.flatMap((material) => material?.stullerProducts || []).find((product) => String(product?.metalType || '').includes('white')) ? 'white' :
          safeInitialData.materials?.flatMap((material) => material?.stullerProducts || []).find((product) => String(product?.metalType || '').includes('rose')) ? 'rose' :
          '');
      const inferredStoreId =
        safeInitialData.storeId ||
        (safeInitialData.isWholesale ? (safeInitialData.submittedBy || safeInitialData.createdBy || 'my-wholesale-store') : 'engel-fine-design');
      const inferredStoreName =
        safeInitialData.storeName ||
        safeInitialData.businessName ||
        (safeInitialData.isWholesale ? 'Wholesale Store' : 'Engel Fine Design');
      const initialPricingContext = `${inferredMetalType}|${inferredKarat}|${inferredMetalType === 'gold' ? inferredGoldColor : ''}`;
      pricingContextRef.current = initialPricingContext;
      hydratingPricingContextRef.current = initialPricingContext;

      // Editing a saved ticket: its lines keep the price they were written with until someone changes
      // that line, the metal or the store ("do not wipe the repair tickets … preventative, not changing
      // the past" — owner, 2026-09-30). Anything else seeded from initialData is priced live.
      const ticketLines = submitMode === 'edit'
        ? {
            tasks: asTicketLines(safeInitialData.tasks || []),
            materials: asTicketLines(safeInitialData.materials || []),
          }
        : {};

      setFormData(prev => ({
        ...prev,
        ...safeInitialData,
        ...ticketLines,
        metalType: inferredMetalType,
        karat: inferredKarat,
        goldColor: inferredMetalType === 'gold' ? inferredGoldColor : '',
        storeId: inferredStoreId,
        storeName: inferredStoreName
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (!formData.picture) {
      setPicturePreviewUrl('');
      return undefined;
    }

    if (typeof formData.picture === 'string') {
      setPicturePreviewUrl(formData.picture);
      return undefined;
    }

    if (formData.picture instanceof Blob) {
      const objectUrl = URL.createObjectURL(formData.picture);
      setPicturePreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setPicturePreviewUrl('');
    return undefined;
  }, [formData.picture]);

  // Handle client info and set wholesale status
  useEffect(() => {
    if (clientInfo) {
      const clientName = clientInfo.name || `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim();
      const isClientWholesale = !!formData.isWholesale;

      setFormData(prev => ({
        ...prev,
        clientName,
        // userID FIRST — never the Mongo _id (EFD-DEFECTS C1: 75 repairs were filed under it).
        userID: clientInfo.userID || clientInfo._id || clientInfo.id || '',
        isWholesale: isClientWholesale
      }));
      // No re-price call: every price is derived from formData, so a wholesale change re-prices itself.
    }
  }, [clientInfo, formData.isWholesale]);
}
