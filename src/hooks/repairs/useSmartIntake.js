import { useCallback } from 'react';
import { stripComputedPrices } from '@/services/pricing/computedFields';
import { keyMatchesContext, SIZEABLE_CATEGORIES, normalizeIsoPromiseDate, inferTasksFromDescription, parsePromiseDateFromDescription, inferMaterialHintsFromSmartIntake, disambiguateSizingTasks } from '@/hooks/repairs/newRepairFormHelpers';
import { normalizeRingSizeValue, extractMetalContextFromDescription, extractRingSizesFromDescription } from '@/services/repairs/smartIntakeExtractors';
import { alignTasksToMetal } from '@/services/repairs/metalTaskFilter';
import { normalizeSpokenIntake } from '@/services/repairs/spokenIntake';

/**
 * Smart intake for the repair form (useNewRepairForm): read the typed sentence with the AI (or the rule-based fallback) and turn it into tasks, materials, metal, sizes and a promise date. Each AI call's log id is kept for the smart-intake log (Q13). A hook, called where the code used to sit.
 */
export function useSmartIntake({ availableMaterials, availableTasks, formData, setAnalyzingSmartIntake, setFormData, setSmartIntakeError, smartIntakeLogIDsRef }) {
  const buildTaskItemsFromInferred = useCallback((tasks = []) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    return tasks.map((task, index) => ({
      ...stripComputedPrices(task),
      id: Date.now() + index,
      // Per-unit tasks (per prong / per stone) arrive from smart intake with a
      // counted quantity; everything else defaults to 1 exactly as before.
      quantity: Math.max(1, Math.round(Number(task.__aiQuantity) || 1)),
    }));
  }, []);

  const buildMaterialItemsFromInferred = useCallback((materialHints = [], previousForm) => {
    if (!Array.isArray(materialHints) || materialHints.length === 0 || !Array.isArray(availableMaterials) || availableMaterials.length === 0) {
      return [];
    }

    const nextMetalType = previousForm?.metalType || '';
    const nextKarat = previousForm?.karat || '';
    const nextGoldColor = previousForm?.goldColor || '';

    const scoreMaterialForHint = (material, hintType) => {
      const searchText = [
        material?.name,
        material?.displayName,
        material?.description,
        material?.category,
        material?.metalType,
        material?.karat,
        material?.sku,
        ...(Array.isArray(material?.stullerProducts)
          ? material.stullerProducts.flatMap((product) => [
              product?.description,
              product?.metalType,
              product?.karat,
              product?.itemNumber
            ])
          : [])
      ].filter(Boolean).join(' ').toLowerCase();

      let score = 0;

      if (hintType === 'sizing_material') {
        if (String(material?.category || '').toLowerCase() === 'sizing_material') score += 100;
        if (searchText.includes('sizing stock')) score += 60;
        if (searchText.includes('sizing')) score += 25;
        if (searchText.includes('stock')) score += 10;
      }

      const context = keyMatchesContext(searchText, nextMetalType, nextKarat, nextGoldColor);
      if (context.hasMetal) score += 20;
      if (context.hasKarat) score += 10;
      if (context.hasExactContext) score += 25;

      return score;
    };

    return materialHints.map((hint, index) => {
      const normalizedHintType = String(hint?.type || '').trim().toLowerCase();
      const quantity = Math.max(Number(hint?.quantity || 0), 0);
      if (!normalizedHintType || quantity <= 0) return null;

      const matchedMaterial = [...availableMaterials]
        .map((material) => ({ material, score: scoreMaterialForHint(material, normalizedHintType) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.material;

      if (!matchedMaterial) return null;

      return {
        ...stripComputedPrices(matchedMaterial),
        id: Date.now() + index,
        quantity,
        _smartIntakeHintType: normalizedHintType,
        _smartIntakeReason: hint?.reason || ''
      };
    }).filter(Boolean);
  }, [availableMaterials]);

  const applySmartIntakeResults = useCallback((results = {}) => {
    setFormData((prev) => {
      const updates = {};
      const isRing = typeof results.isRing === 'boolean'
        ? results.isRing
        : SIZEABLE_CATEGORIES.some((cat) => String(results.inputText || '').toLowerCase().includes(cat) || String(results.inputText || '').toLowerCase().includes('ring'));

      if (typeof isRing === 'boolean' && prev.isRing !== isRing) {
        updates.isRing = isRing;
      }

      if (results.metalType && !String(prev.metalType || '').trim()) {
        updates.metalType = results.metalType;
      }

      if ((results.metalType === 'gold' || prev.metalType === 'gold') && results.goldColor && !String(prev.goldColor || '').trim()) {
        updates.goldColor = results.goldColor;
      }

      if (results.karat && !String(prev.karat || '').trim()) {
        updates.karat = results.karat;
      } else if ((updates.metalType || prev.metalType) === 'platinum' && !results.karat && !String(prev.karat || '').trim()) {
        // Platinum without a stated purity defaults to 950 — the form's primary
        // platinum option and the key the material variants price under. Without
        // this, the pricing context is null and platinum tasks price at base.
        updates.karat = '950';
      }

      if (isRing && results.currentRingSize) {
        updates.currentRingSize = normalizeRingSizeValue(results.currentRingSize);
      }

      if (isRing && results.desiredRingSize) {
        updates.desiredRingSize = normalizeRingSizeValue(results.desiredRingSize);
      }

      if (results.promiseDate && !String(prev.promiseDate || '').trim()) {
        const normalizedPromiseDate = normalizeIsoPromiseDate(results.promiseDate);
        if (normalizedPromiseDate) {
          updates.promiseDate = normalizedPromiseDate;
        }
      }

      if (Array.isArray(results.inferredTasks) && results.inferredTasks.length > 0 && (!prev.tasks || prev.tasks.length === 0)) {
        const inferredTaskItems = buildTaskItemsFromInferred(results.inferredTasks);
        if (inferredTaskItems.length > 0) {
          updates.tasks = inferredTaskItems;
        }
      }

      if (Array.isArray(results.materialHints) && results.materialHints.length > 0) {
        const inferredMaterialItems = buildMaterialItemsFromInferred(results.materialHints, {
          ...prev,
          ...updates
        });

        if (inferredMaterialItems.length > 0) {
          const mergedMaterials = [...(prev.materials || [])];

          inferredMaterialItems.forEach((item) => {
            const matchIndex = mergedMaterials.findIndex((existing) => {
              const sameId = existing?._id && item?._id && String(existing._id) === String(item._id);
              const sameName = String(existing?.name || existing?.displayName || '').trim().toLowerCase()
                === String(item?.name || item?.displayName || '').trim().toLowerCase();
              return sameId || sameName;
            });

            if (matchIndex >= 0) {
              const existing = mergedMaterials[matchIndex];
              mergedMaterials[matchIndex] = {
                ...existing,
                quantity: Math.max(Number(existing.quantity || 0), Number(item.quantity || 0)),
                _smartIntakeHintType: existing._smartIntakeHintType || item._smartIntakeHintType,
                _smartIntakeReason: existing._smartIntakeReason || item._smartIntakeReason
              };
              return;
            }

            mergedMaterials.push(item);
          });

          updates.materials = mergedMaterials;
        }
      }

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [buildMaterialItemsFromInferred, buildTaskItemsFromInferred]);

  const runRuleBasedSmartIntake = useCallback((inputText = '') => {
    const parsingText = String(inputText || '').trim();
    if (!parsingText) {
      return;
    }

    const detectedMetalContext = extractMetalContextFromDescription(parsingText) || {};
    const detectedRingSizes = extractRingSizesFromDescription(parsingText);
    const inferredTasks = alignTasksToMetal(
      inferTasksFromDescription(parsingText, availableTasks),
      detectedMetalContext.metalType || '',
      availableTasks
    );
    const isRingCategory = SIZEABLE_CATEGORIES.some((cat) => parsingText.toLowerCase().includes(cat) || parsingText.toLowerCase().includes('ring'));
    const promiseDate = parsePromiseDateFromDescription(parsingText);
    const materialHints = inferMaterialHintsFromSmartIntake({
      inputText: parsingText,
      isRing: isRingCategory,
      currentRingSize: detectedRingSizes.currentRingSize,
      desiredRingSize: detectedRingSizes.desiredRingSize
    });

    applySmartIntakeResults({
      inputText: parsingText,
      isRing: isRingCategory,
      metalType: detectedMetalContext.metalType || '',
      karat: detectedMetalContext.karat || '',
      goldColor: detectedMetalContext.goldColor || '',
      currentRingSize: detectedRingSizes.currentRingSize,
      desiredRingSize: detectedRingSizes.desiredRingSize,
      promiseDate,
      materialHints,
      inferredTasks
    });
  }, [availableTasks, applySmartIntakeResults]);

  const handleAnalyzeSmartIntake = useCallback(async () => {
    // Dictated forms ("14 karat", "7 and a half") folded into what the extractors match.
    const parsingText = normalizeSpokenIntake(String(formData.smartIntakeInput || '').trim());
    if (!parsingText) {
      setSmartIntakeError('Enter intake details first.');
      return;
    }

    setAnalyzingSmartIntake(true);
    setSmartIntakeError('');

    try {
      const strippedTasks = availableTasks.map((t) => ({
        id: String(t._id || ''),
        title: t.title || t.displayName || t.name || '',
        description: t.description || '',
        symptoms: t.aiMeta?.symptoms || [],
        whenToUse: t.aiMeta?.whenToUse || '',
        neverUseWhen: t.aiMeta?.neverUseWhen || '',
        metals: Array.isArray(t.metals) && t.metals.length ? t.metals : undefined,
      })).filter((t) => t.id);

      const response = await fetch('/api/ai/parse-smart-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText: parsingText,
          description: String(formData.description || '').trim(),
          tasks: strippedTasks
        })
      });

      // A gateway timeout (504) returns Vercel's HTML error page, not JSON —
      // parse defensively so the fallback banner names the failure instead of
      // showing a JSON.parse token error.
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `AI request failed (HTTP ${response.status})`);
      }

      const parsed = payload?.data?.parsed || {};
      // The smart-intake log entry for this suggestion; the save tells it what the ticket became (Q13).
      if (payload?.data?.intakeLogID) smartIntakeLogIDsRef.current.push(payload.data.intakeLogID);
      // matchedTasks carries per-task quantity ("retip 14 prongs" = retip x14);
      // matchedTaskIds is the legacy shape and implies quantity 1.
      const matchedPairs = Array.isArray(parsed.matchedTasks) && parsed.matchedTasks.length > 0
        ? parsed.matchedTasks
        : (Array.isArray(parsed.matchedTaskIds) ? parsed.matchedTaskIds : []).map((id) => ({ id, quantity: 1 }));
      const quantityByTaskId = new Map(
        matchedPairs.map((p) => [String(p.id), Math.max(1, Number(p.quantity) || 1)])
      );

      let aiMatchedTasks = [];
      if (matchedPairs.length > 0) {
        aiMatchedTasks = matchedPairs
          .map((p) => availableTasks.find((t) => String(t._id) === String(p.id)))
          .filter(Boolean);
      }

      if (aiMatchedTasks.length === 0) {
        aiMatchedTasks = inferTasksFromDescription(parsingText, availableTasks);
      }

      aiMatchedTasks = disambiguateSizingTasks(
        aiMatchedTasks, parsingText,
        parsed.currentRingSize || '', parsed.desiredRingSize || ''
      );

      // Metal is the recipe: a platinum job swaps generic matches for the
      // laser-welded platinum tasks, and a platinum task never lands on a gold
      // job. Deterministic — the AI prompt only hints, this decides. Aligned
      // one at a time so each task's quantity survives an identity swap.
      aiMatchedTasks = aiMatchedTasks
        .map((task) => {
          const [aligned] = alignTasksToMetal([task], parsed.metalType || '', availableTasks);
          if (!aligned) return null;
          return { ...aligned, __aiQuantity: quantityByTaskId.get(String(task._id)) || 1 };
        })
        .filter(Boolean);

      applySmartIntakeResults({
        inputText: parsingText,
        isRing: typeof parsed.isRing === 'boolean' ? parsed.isRing : null,
        metalType: parsed.metalType || '',
        karat: parsed.karat || '',
        goldColor: parsed.goldColor || '',
        currentRingSize: parsed.currentRingSize || '',
        desiredRingSize: parsed.desiredRingSize || '',
        promiseDate: parsed.promiseDate || parsePromiseDateFromDescription(parsingText),
        materialHints: Array.isArray(parsed.materialHints) && parsed.materialHints.length > 0
          ? parsed.materialHints
          : inferMaterialHintsFromSmartIntake({
              inputText: parsingText,
              isRing: typeof parsed.isRing === 'boolean' ? parsed.isRing : false,
              currentRingSize: parsed.currentRingSize || '',
              desiredRingSize: parsed.desiredRingSize || ''
            }),
        inferredTasks: aiMatchedTasks
      });
    } catch (error) {
      runRuleBasedSmartIntake(parsingText);
      setSmartIntakeError(`AI parse unavailable, used fallback rules. ${error.message || ''}`.trim());
    } finally {
      setAnalyzingSmartIntake(false);
    }
  }, [formData.smartIntakeInput, formData.description, availableTasks, applySmartIntakeResults, runRuleBasedSmartIntake]);

  return {
    buildTaskItemsFromInferred,
    buildMaterialItemsFromInferred,
    applySmartIntakeResults,
    runRuleBasedSmartIntake,
    handleAnalyzeSmartIntake,
  };
}
