import { useCallback, useRef } from 'react';
import { stripComputedPrices } from '@/services/pricing/computedFields';
import { keyMatchesContext, SIZEABLE_CATEGORIES, normalizeIsoPromiseDate, isSizingStockMaterial } from '@/hooks/repairs/newRepairFormHelpers';
import { normalizeRingSizeValue, extractMetalContextFromDescription, extractRingSizesFromDescription } from '@/services/repairs/smartIntakeExtractors';
import { alignTasksToMetal } from '@/services/repairs/metalTaskFilter';
import { normalizeSpokenIntake } from '@/services/repairs/spokenIntake';

export const EMPTY_INTAKE_NOTES = Object.freeze({ warnings: [], assumed: {}, fallback: false });
export const AI_DOWN_MESSAGE = 'The AI is unavailable right now. The metal and sizes were read from the sentence. Add the work by hand.';

/**
 * The sizing-stock line for a hint: only a material that IS sizing stock, never "the first thing that mentions the
 * metal" (review, 2026-11-09: with no sizing stock in the list, 14k solder x2 was added with a green tick). Among
 * sizing stocks: the one for this metal, and the 3x2 unless the wide task is on the ticket.
 */
export function sizingStockItemsFor(materialHints = [], availableMaterials = [], form = {}, { wide = false, now = Date.now() } = {}) {
  const hint = (materialHints || []).find((h) => String(h?.type || '').toLowerCase() === 'sizing_material' && Number(h?.quantity) > 0);
  if (!hint) return { items: [], missing: false };
  const stocks = (availableMaterials || []).filter(isSizingStockMaterial);
  if (!stocks.length) return { items: [], missing: true };
  const score = (material) => {
    const text = [material?.name, material?.displayName, material?.description, material?.metalType, material?.karat, material?.sku,
      ...(Array.isArray(material?.stullerProducts) ? material.stullerProducts.flatMap((p) => [p?.description, p?.metalType, p?.karat]) : []),
    ].filter(Boolean).join(' ').toLowerCase();
    const context = keyMatchesContext(text, form.metalType || '', form.karat || '', form.goldColor || '');
    return (context.hasExactContext ? 25 : 0) + (context.hasMetal ? 20 : 0) + (context.hasKarat ? 10 : 0)
      + (text.includes(wide ? '5x2' : '3x2') ? 5 : 0);
  };
  const best = stocks.map((material) => ({ material, score: score(material) })).sort((a, b) => b.score - a.score)[0].material;
  return {
    missing: false,
    items: [{
      ...stripComputedPrices(best),
      id: now,
      quantity: Math.ceil(Number(hint.quantity)),
      _smartIntakeHintType: 'sizing_material',
      _smartIntakeReason: hint.reason || '',
    }],
  };
}

/**
 * Smart intake for the repair form (useNewRepairForm): read the typed sentence with the AI and turn the answer into
 * tasks, sizing stock, metal, sizes and a promise date. Each AI call's log id is kept for the smart-intake log (Q13).
 *
 * What this hook owns (the server's `decideIntake` owns which tasks, how many, and how much stock):
 *  - A RE-READ REPLACES what the last read put on the ticket and keeps what was added by hand. Reading a corrected
 *    sentence used to leave the old tasks, stock and metal while the sizes and the green chips changed
 *    (reviews, 2026-11-09).
 *  - The server's warnings, which values were assumed rather than said, and whether the AI was down, go to
 *    `setSmartIntakeNotes` so the screen can say so.
 *  - When the AI call fails, only the metal and the sizes are read from the sentence. The old rule-based guess wrote
 *    a confident ticket with the wrong tasks, no quantities and a promise date made from "1/2 ct".
 */
export function useSmartIntake({ availableMaterials, availableTasks, formData, setAnalyzingSmartIntake, setFormData, setSmartIntakeError, setSmartIntakeNotes = () => {}, smartIntakeLogIDsRef }) {
  // Whether the last read set the ring sizes — so a re-read may clear them.
  const lastReadSetSizesRef = useRef(false);

  const buildTaskItemsFromInferred = useCallback((tasks = []) => {
    if (!Array.isArray(tasks) || tasks.length === 0) return [];
    return tasks.map((task, index) => {
      const { __ruled, ...rest } = task;
      return {
        ...stripComputedPrices(rest),
        id: Date.now() + index,
        // Per-unit tasks (per prong / per stone) arrive with a counted quantity; everything else is 1.
        quantity: Math.max(1, Math.round(Number(task.__aiQuantity) || 1)),
        // Why the rulings put this line here, when the sentence did not ask for it by name.
        ...(__ruled ? { _smartIntakeRuled: __ruled } : {}),
      };
    });
  }, []);

  const applySmartIntakeResults = useCallback((results = {}, { replace = false } = {}) => {
    const hadSizes = lastReadSetSizesRef.current;
    lastReadSetSizesRef.current = Boolean(results.currentRingSize || results.desiredRingSize);

    setFormData((prev) => {
      const updates = {};
      const text = String(results.inputText || '').toLowerCase();
      const isRing = typeof results.isRing === 'boolean'
        ? results.isRing
        : SIZEABLE_CATEGORIES.some((cat) => text.includes(cat) || text.includes('ring'));
      if (prev.isRing !== isRing) updates.isRing = isRing;

      // Metal: what the sentence SAID overwrites; anything else only fills a blank.
      const said = results.said || {};
      const blank = (v) => !String(v || '').trim();
      if (results.metalType && (said.metal || blank(prev.metalType))) updates.metalType = results.metalType;
      const metalType = updates.metalType || prev.metalType;
      // The metal changed (silver on the form, "gold ring" in the corrected sentence): the old purity and colour
      // belonged to the old metal. Keeping them left gold at "925", which prices as a metal that does not exist
      // (Codex review of #346). Blank is honest — the form then asks for the karat.
      const metalChanged = Boolean(updates.metalType) && !blank(prev.metalType) && updates.metalType !== prev.metalType;
      if (results.karat && (said.karat || said.metal || blank(prev.karat))) {
        updates.karat = results.karat;
      } else if (metalType === 'platinum' && !results.karat && (blank(prev.karat) || metalChanged)) {
        // Platinum without a stated purity is 950 — the key the material variants price under.
        updates.karat = '950';
      } else if (metalChanged) {
        updates.karat = '';
      }
      if (metalType === 'gold' && results.goldColor && (said.color || blank(prev.goldColor) || metalChanged)) updates.goldColor = results.goldColor;
      else if (metalChanged && metalType !== 'gold') updates.goldColor = '';

      if (isRing && results.currentRingSize) updates.currentRingSize = normalizeRingSizeValue(results.currentRingSize);
      else if (replace && hadSizes) updates.currentRingSize = '';
      if (isRing && results.desiredRingSize) updates.desiredRingSize = normalizeRingSizeValue(results.desiredRingSize);
      else if (replace && hadSizes) updates.desiredRingSize = '';

      if (results.promiseDate && blank(prev.promiseDate)) {
        const date = normalizeIsoPromiseDate(results.promiseDate);
        if (date) updates.promiseDate = date;
      }

      if (replace) {
        // Lines the last read added go; lines added by hand stay.
        const keptTasks = (prev.tasks || []).filter((t) => !t.__aiQuantity);
        const keptIds = new Set(keptTasks.map((t) => String(t._id || '')));
        const fresh = buildTaskItemsFromInferred((results.inferredTasks || []).filter((t) => !keptIds.has(String(t._id || ''))));
        if (fresh.length || keptTasks.length !== (prev.tasks || []).length) updates.tasks = [...keptTasks, ...fresh];

        const keptMaterials = (prev.materials || []).filter((m) => !m._smartIntakeHintType);
        const stock = sizingStockItemsFor(results.materialHints, availableMaterials, { ...prev, ...updates }, { wide: results.wideShank });
        // A sizing stock he already added by hand is not doubled.
        const add = stock.items.filter(() => !keptMaterials.some(isSizingStockMaterial));
        if (add.length || keptMaterials.length !== (prev.materials || []).length) updates.materials = [...keptMaterials, ...add];
      }

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [availableMaterials, buildTaskItemsFromInferred, setFormData]);

  /** The AI is down: read only what a regex reads reliably — the metal and the sizes. No tasks, no stock, no date. */
  const runRuleBasedSmartIntake = useCallback((inputText = '') => {
    const parsingText = String(inputText || '').trim();
    if (!parsingText) return;
    const metal = extractMetalContextFromDescription(parsingText) || {};
    const sizes = extractRingSizesFromDescription(parsingText);
    applySmartIntakeResults({
      inputText: parsingText,
      metalType: metal.metalType || '',
      karat: metal.karat || '',
      goldColor: metal.goldColor || '',
      currentRingSize: sizes.currentRingSize,
      desiredRingSize: sizes.desiredRingSize,
      said: { metal: Boolean(metal.metalType), karat: Boolean(metal.karat), color: Boolean(metal.goldColor) },
    });
  }, [applySmartIntakeResults]);

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
          tasks: strippedTasks,
          // What the form already knows. The note often leaves the colour out, and rhodium depends on it.
          metal: { metalType: formData.metalType || '', karat: formData.karat || '', goldColor: formData.goldColor || '' },
        })
      });

      // A gateway timeout (504) returns Vercel's HTML error page, not JSON — parse defensively.
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `AI request failed (HTTP ${response.status})`);
      }

      const parsed = payload?.data?.parsed || {};
      // The smart-intake log entry for this suggestion; the save tells it what the ticket became (Q13).
      if (payload?.data?.intakeLogID) smartIntakeLogIDsRef.current.push(payload.data.intakeLogID);

      const matched = Array.isArray(parsed.matchedTasks) ? parsed.matchedTasks : [];
      // Metal is the recipe: a platinum job swaps generic matches for the laser-welded platinum tasks, and a platinum
      // task never lands on a gold job. Aligned one at a time so each line's quantity survives the swap; two matches
      // that align to the same task become one line.
      const inferredTasks = matched
        .map((line) => {
          const task = availableTasks.find((t) => String(t._id) === String(line.id));
          if (!task) return null;
          const [aligned] = alignTasksToMetal([task], parsed.metalType || '', availableTasks);
          if (!aligned) return null;
          return { ...aligned, __aiQuantity: Math.max(1, Number(line.quantity) || 1), __ruled: line.ruled || '' };
        })
        .filter(Boolean)
        .reduce((lines, task) => {
          const same = lines.find((l) => String(l._id) === String(task._id));
          if (same) same.__aiQuantity = Math.max(same.__aiQuantity, task.__aiQuantity);
          else lines.push(task);
          return lines;
        }, []);

      const stock = sizingStockItemsFor(parsed.materialHints, availableMaterials, {});
      const warnings = [...(Array.isArray(parsed.warnings) ? parsed.warnings : [])];
      if (stock.missing) warnings.push('This job needs sizing stock, and the materials list has none to add. Add it by hand.');
      const said = parsed.said || {};
      const formHadColor = Boolean(String(formData.goldColor || '').trim());

      applySmartIntakeResults({
        inputText: parsingText,
        isRing: typeof parsed.isRing === 'boolean' ? parsed.isRing : null,
        metalType: parsed.metalType || '',
        karat: parsed.karat || '',
        goldColor: parsed.goldColor || '',
        said,
        currentRingSize: parsed.currentRingSize || '',
        desiredRingSize: parsed.desiredRingSize || '',
        // The date is the model's or nothing: a regex once read "set 1/2 ct diamond" as January 2.
        promiseDate: parsed.promiseDate || '',
        // Sizing stock is computed on the server. An empty list means "none".
        materialHints: Array.isArray(parsed.materialHints) ? parsed.materialHints : [],
        wideShank: inferredTasks.some((t) => /3\s*(?:mm)?\s*to\s*5\s*mm/i.test(String(t.title || ''))),
        inferredTasks,
      }, { replace: true });

      setSmartIntakeNotes({
        warnings,
        // Gold whose colour nobody said: shown as assumed, not as something picked up from the sentence.
        assumed: { goldColor: parsed.metalType === 'gold' && !said.color && !formHadColor },
        fallback: false,
      });
    } catch (error) {
      console.error('Smart intake failed:', error?.message);
      runRuleBasedSmartIntake(parsingText);
      setSmartIntakeNotes({ warnings: [], assumed: {}, fallback: true });
      setSmartIntakeError(AI_DOWN_MESSAGE);
    } finally {
      setAnalyzingSmartIntake(false);
    }
  }, [formData.smartIntakeInput, formData.description, formData.metalType, formData.karat, formData.goldColor, availableTasks, availableMaterials,
    applySmartIntakeResults, runRuleBasedSmartIntake, setAnalyzingSmartIntake, setSmartIntakeError, setSmartIntakeNotes, smartIntakeLogIDsRef]);

  return {
    buildTaskItemsFromInferred,
    applySmartIntakeResults,
    runRuleBasedSmartIntake,
    handleAnalyzeSmartIntake,
  };
}
