import { canSkipIntakeClient } from '@/services/repairs/intakeClientRule';
import { ticketSizesRing } from '@/services/repairs/ringSizing';
import RepairsService from '@/services/repairs';

/**
 * Saving the repair intake (useNewRepairForm): create or update through RepairsService, totals from the engine. Moved verbatim; state arrives as deps.
 */
export function intakeSubmitActions({ addRepair, benchJewelers, formData, getJewelerLabel, initialData, isQuote, isWholesale, onSubmit, persistOnSubmit, pricedRepair, pricingError, repairID, rushJobInfo, setErrors, setLoading, smartIntakeLogIDsRef, submitMode, updateRepair, viewerIsWholesaler }) {
  // Handle form submission
  // `opts.requestQuote` — the store can't price it: create the repair with no tasks and ask EFD to
  // quote (services/repairs/quoteRequest.js). The onClick handler passes a click event, not opts.
  const handleSubmit = async (opts = {}) => {
    const requestQuote = opts?.requestQuote === true;
    setLoading(true);
    setErrors({});

    try {
      // Validation.
      //
      // An admin taking in a store's tray may skip the client — the server then keys the repair to the
      // store. services/repairs/intakeClientRule.js owns the rule (and the viewer-vs-ticket trap).
      const skipClient = formData.clientNotProvided === true && canSkipIntakeClient({
        viewerIsWholesaler: viewerIsWholesaler ?? isWholesale,
        ticketIsWholesale: formData.isWholesale,
      });
      if (!skipClient && !formData.clientName.trim()) {
        throw new Error('Client name is required');
      }
      if (!skipClient && formData.isWholesale && !String(formData.userID || '').trim()) {
        throw new Error('Please select a client from your wholesale client list');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (formData.metalType === 'gold' && !formData.goldColor) {
        throw new Error('Gold color is required when metal type is Gold');
      }
      // Promise date is only required for non-wholesale submissions, and never
      // for a quote — see the isQuote prop.
      if (!isQuote && !formData.isWholesale && !formData.promiseDate) {
        throw new Error('Promise date is required');
      }

      // Ring sizes are asked for only when a line on the ticket sizes the ring up or down (owner, 2026-10-01,
      // OPEN-QUESTIONS Q12: "If we're not touching anything revolving around sizing then I don't really care what
      // size it is"). A size on a ring we aren't sizing is welcome, never demanded.
      if (formData.isRing && ticketSizesRing(formData.tasks)) {
        if (!formData.currentRingSize) {
          throw new Error('Current ring size is required when the ring is being sized');
        }
        if (!formData.desiredRingSize) {
          throw new Error('Desired ring size is required when the ring is being sized');
        }
      }

      // Rush job validation
      if (formData.isRush && !rushJobInfo.canCreate) {
        throw new Error(`Cannot create rush job: ${rushJobInfo.currentRushJobs}/${rushJobInfo.maxRushJobs} rush jobs already active`);
      }
      if (formData.whileYouWait && !formData.assignedTo) {
        throw new Error('Choose the artisan who completed the while-you-wait repair');
      }

      // Prices: THE engine's, derived from this form (pricedRepair). Nothing is submitted unpriced — "If it
      // can't be calculated, it doesn't show" (owner, 2026-09-30). A store asking us to quote sends no
      // tasks, so it has nothing to price.
      if (!pricedRepair) {
        throw new Error(pricingError || 'Pricing did not load — this repair cannot be priced. Reload the page.');
      }
      if (!requestQuote && pricedRepair.unpriced.length > 0) {
        const first = pricedRepair.unpriced[0];
        throw new Error(`${first.title}: ${first.message}`);
      }
      const { subtotal, rushFee, deliveryFee, taxRate, taxAmount, total: totalCost } = pricedRepair.totals;

      const selectedWhileYouWaitJeweler = benchJewelers.find((jeweler) => jeweler.userID === formData.assignedTo);
      const whileYouWaitJewelerName = selectedWhileYouWaitJeweler ? getJewelerLabel(selectedWhileYouWaitJeweler) : formData.assignedJeweler;
      const completedNow = new Date().toISOString();
      const submissionData = {
        ...formData,
        // The derived lines — every price on them is the engine's, for this ticket. A saved ticket's
        // unchanged lines keep `ticketPrice: true` so the server knows they hold their written price.
        tasks: pricedRepair.tasks,
        materials: pricedRepair.materials,
        customLineItems: pricedRepair.customLineItems,
        ...(requestQuote ? { quoteRequested: true } : {}),
        // For wholesalers, set a placeholder promise date if none provided (admin will update it)
        promiseDate: isQuote
          ? ''
          : formData.isWholesale && !formData.promiseDate
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
          : formData.promiseDate,
        totalCost,
        // Detailed pricing breakdown
        subtotal,
        rushFee,
        deliveryFee,
        taxAmount,
        taxRate,
        isWholesale: formData.isWholesale,
        includeDelivery: formData.includeDelivery,
        includeTax: formData.includeTax && !formData.isWholesale, // Store actual tax application

        // Store metadata drives pricing mode and downstream assignment.
        businessName: formData.storeName || 'Engel Fine Design',
        storeId: formData.storeId || 'engel-fine-design',
        storeName: formData.storeName || 'Engel Fine Design',

        createdAt: initialData?.createdAt || new Date().toISOString(),
        status: submitMode === 'create' && formData.whileYouWait
          ? 'COMPLETED'
          : submitMode === 'edit'
          ? (formData.status || initialData?.status || 'READY FOR WORK')
          : 'READY FOR WORK',
        ...(submitMode === 'create' && formData.whileYouWait ? {
          benchStatus: null,
          assignedTo: formData.assignedTo,
          assignedJeweler: whileYouWaitJewelerName,
          claimedAt: completedNow,
          completedBy: whileYouWaitJewelerName,
          completedAt: completedNow,
          qcBy: whileYouWaitJewelerName,
          qcDate: completedNow,
          whileYouWaitCompletedAt: completedNow,
          whileYouWaitCompletedBy: whileYouWaitJewelerName
        } : {})
      };

      // Add comprehensive logging for submission

      if (!persistOnSubmit) {
        onSubmit(submissionData);
        setLoading(false);
        return;
      }

      if (requestQuote) submissionData.tasks = [];
      if (submitMode !== 'edit' && smartIntakeLogIDsRef.current.length) {
        submissionData.smartIntakeLogIDs = [...smartIntakeLogIDsRef.current];
      }
      const result = submitMode === 'edit' && repairID
        ? await RepairsService.updateRepair(repairID, submissionData)
        : await RepairsService.createRepair(submissionData);

      if (submitMode === 'edit') {
        const repairToUpdate = result?.repair || result?.newRepair || result;
        if (repairToUpdate?.repairID) {
          updateRepair(repairToUpdate.repairID, repairToUpdate);
        } else if (repairID) {
          console.warn('Update response did not include a repairID; merging submitted data into context:', result);
          updateRepair(repairID, submissionData);
        }
      } else {
        // Add the new repair to the repairs context immediately
        if (result && (result.repairID || result.newRepair?.repairID)) {
          const repairToAdd = result.newRepair || result;
          addRepair(repairToAdd);
        } else {
          console.warn('Could not add repair to context - no repairID found in result:', result);
        }
      }

      onSubmit(result);

    } catch (error) {
      // Coerce to a STRING. A gateway 504 returns { error: { code, message } }; setting that
      // object as errors.submit and rendering it crashed the page (React error #31 —
      // "objects are not valid as a React child").
      const data = error?.response?.data;
      const candidate =
        (typeof data?.error === 'string' && data.error) ||
        (data?.error && typeof data.error === 'object' && (data.error.message || data.error.code)) ||
        (typeof data?.message === 'string' && data.message) ||
        error?.message ||
        'Failed to create repair';
      setErrors({ submit: typeof candidate === 'string' ? candidate : String(candidate) });
    } finally {
      setLoading(false);
    }
  };

  return {
    handleSubmit,
  };
}
