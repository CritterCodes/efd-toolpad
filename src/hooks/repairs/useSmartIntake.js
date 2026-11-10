import { useCallback, useRef } from 'react';
import { stripComputedPrices } from '@/services/pricing/computedFields';
import { keyMatchesContext, normalizeIsoPromiseDate, isSizingStockMaterial } from '@/hooks/repairs/newRepairFormHelpers';
import { isSizeUpTask } from '@/services/ai/smartIntakeRules';
import { normalizeRingSizeValue, extractMetalContextFromDescription } from '@/services/repairs/smartIntakeExtractors';
import { alignTasksToMetal } from '@/services/repairs/metalTaskFilter';
import { normalizeSpokenIntake } from '@/services/repairs/spokenIntake';

export const EMPTY_INTAKE_NOTES = Object.freeze({ warnings: [], assumed: {}, fallback: false });
export const AI_DOWN_MESSAGE = 'The AI is unavailable right now. Only the metal and sizes were read from the sentence, and anything an earlier read added was taken off. Add the work by hand.';

/** Is the piece a ring, by the word — not by the letters. "restring pearls" and "earring" are not rings. */
export const saysRing = (text = '') => /\b(?:rings?|bands?)\b/.test(String(text).toLowerCase());

/**
 * Ring sizes a regex can be trusted with, for when the AI is down: only "size 7 to 6", "from 7 to 6", "7 needs to be
 * 6" — and never a karat or a count. The old patterns read "resize 14k wg ring" as size 14 and "retip 2 to 3 prongs"
 * as 2 → 3 (review, 2026-11-09). Anything less explicit is left for the jeweler.
 */
export function explicitRingSizes(text = '') {
  const t = String(text).toLowerCase();
  const n = '(\\d{1,2}(?:\\.\\d+)?)';
  const notAUnit = '(?!\\s*-?\\s*(?:k\\b|kt\\b|karat|ct\\b|carat|mm|prongs?|stones?|tips?|links?|welds?))';
  const m = t.match(new RegExp(`(?:\\bsize|\\bsz|\\bfrom)\\s+(?:an?\\s+)?${n}${notAUnit}\\s*(?:,\\s*)?(?:to|->|→|needs to be|down to|up to)\\s*(?:an?\\s+)?(?:size\\s+)?${n}${notAUnit}`))
    || t.match(new RegExp(`(?<![\\d.])${n}${notAUnit}\\s+needs to be\\s+(?:an?\\s+)?(?:size\\s+)?${n}${notAUnit}`));
  if (!m) return { currentRingSize: '', desiredRingSize: '' };
  const ok = (v) => Number(v) > 0 && Number(v) <= 16;
  return ok(m[1]) && ok(m[2]) ? { currentRingSize: m[1], desiredRingSize: m[2] } : { currentRingSize: '', desiredRingSize: '' };
}

/**
 * The sizing-stock line for a hint: only a material that IS sizing stock, and only one for THIS metal — never "the
 * first thing that mentions the metal", and never another metal's stock (reviews, 2026-11-09: 14k solder x2 was added
 * with a green tick; a silver ring got yellow gold stock). Among the right ones: the 3x2 unless the wide task is on
 * the ticket. `missing` = the job needs stock and the list has none that fits.
 */
export function sizingStockItemsFor(materialHints = [], availableMaterials = [], form = {}, { wide = false, now = Date.now() } = {}) {
  const hint = (materialHints || []).find((h) => String(h?.type || '').toLowerCase() === 'sizing_material' && Number(h?.quantity) > 0);
  if (!hint) return { items: [], missing: false };
  const scored = (availableMaterials || []).filter(isSizingStockMaterial).map((material) => {
    const text = [material?.name, material?.displayName, material?.description, material?.metalType, material?.karat, material?.sku,
      ...(Array.isArray(material?.stullerProducts) ? material.stullerProducts.flatMap((p) => [p?.description, p?.metalType, p?.karat]) : []),
    ].filter(Boolean).join(' ').toLowerCase();
    const context = keyMatchesContext(text, form.metalType || '', form.karat || '', form.goldColor || '');
    // A stock that names no metal at all prices by the ticket's metal, so it fits any; one that names ANOTHER metal does not.
    const namesAMetal = /\b(?:gold|silver|sterling|platinum|\d{2}k)\b/.test(text);
    return {
      material,
      fits: !form.metalType || context.hasMetal || !namesAMetal,
      score: (context.hasExactContext ? 25 : 0) + (context.hasMetal ? 20 : 0) + (context.hasKarat ? 10 : 0) + (text.includes(wide ? '5x2' : '3x2') ? 5 : 0),
    };
  }).filter((entry) => entry.fits).sort((a, b) => b.score - a.score);
  if (!scored.length) return { items: [], missing: true };
  return {
    missing: false,
    items: [{
      ...stripComputedPrices(scored[0].material),
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
 *  - A RE-READ REPLACES what the last read put on the ticket and keeps the jeweler's hand: lines he added, AI lines
 *    whose quantity he changed, and AI lines he deleted (they are not put back). The mic re-reads on its own when it
 *    stops, so a re-read that undid his corrections would undo them without his asking (reviews, 2026-11-09).
 *  - Only the LATEST read lands. Two reads in flight used to let the older answer overwrite the newer sentence.
 *  - The server's warnings, which values were assumed rather than said, and whether the AI was down, go to
 *    `setSmartIntakeNotes` so the screen can say so.
 *  - When the AI call fails, only the metal and explicitly-stated sizes are read, and the lines an earlier read added
 *    are taken off — they belonged to a sentence that may no longer be the one in the box.
 */
export function useSmartIntake({ availableMaterials, availableTasks, formData, setAnalyzingSmartIntake, setFormData, setSmartIntakeError, setSmartIntakeNotes = () => {}, smartIntakeLogIDsRef }) {
  // Whether the last read set the ring sizes — so a re-read may clear them.
  const lastReadSetSizesRef = useRef(false);
  // What the last read put on the ticket, and what the jeweler has since taken off (never put back by a re-read).
  const lastAddedRef = useRef({ taskIds: [], stock: false });
  const removedByHandRef = useRef({ taskIds: new Set(), stock: false });
  // The gold colour the last read ASSUMED. While the form still holds it, a re-read must not turn it into a tick —
  // the form "had a colour" only because the first read put it there (review, 2026-11-09).
  const assumedColorRef = useRef('');
  // The newest read. An answer that is not for it is thrown away.
  const readSeqRef = useRef(0);

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
      const isRing = typeof results.isRing === 'boolean' ? results.isRing : saysRing(results.inputText);
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
        // His hand stays: a line he added, or an AI line whose quantity he changed (it is his line now — the tick goes).
        const byHand = (t) => !t.__aiQuantity || Number(t.quantity) !== Number(t.__aiQuantity);
        const keptTasks = (prev.tasks || []).filter(byHand).map((t) => {
          if (!t.__aiQuantity) return t;
          const { __aiQuantity: _was, _smartIntakeRuled: _why, ...mine } = t;
          return mine;
        });
        const keptIds = new Set(keptTasks.map((t) => String(t._id || '')));
        const fresh = buildTaskItemsFromInferred((results.inferredTasks || []).filter((t) => !keptIds.has(String(t._id || ''))));
        const changed = fresh.length || keptTasks.length !== (prev.tasks || []).length || (prev.tasks || []).some((t) => t.__aiQuantity && byHand(t));
        if (changed) updates.tasks = [...keptTasks, ...fresh];

        const keptMaterials = (prev.materials || []).filter((m) => !m._smartIntakeHintType);
        // Stock goes with a size-up line. If he deleted that line, a re-read must not leave stock on its own.
        const sizingUp = [...keptTasks, ...fresh].some(isSizeUpTask);
        const stock = results.skipStock || !sizingUp
          ? { items: [] }
          : sizingStockItemsFor(results.materialHints, availableMaterials, { ...prev, ...updates }, { wide: results.wideShank });
        // A sizing stock he already added by hand is not doubled.
        const add = stock.items.filter(() => !keptMaterials.some(isSizingStockMaterial));
        if (add.length || keptMaterials.length !== (prev.materials || []).length) updates.materials = [...keptMaterials, ...add];
      }

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [availableMaterials, buildTaskItemsFromInferred, setFormData]);

  /**
   * The AI is down: read only what a regex reads reliably — the metal, and sizes stated outright. No tasks, no stock,
   * no date. And take off what an earlier read added: those lines answered a sentence that may have changed since.
   */
  const runRuleBasedSmartIntake = useCallback((inputText = '') => {
    const parsingText = String(inputText || '').trim();
    if (!parsingText) return;
    const metal = extractMetalContextFromDescription(parsingText) || {};
    const ring = saysRing(parsingText);
    const sizes = ring ? explicitRingSizes(parsingText) : { currentRingSize: '', desiredRingSize: '' };
    applySmartIntakeResults({
      inputText: parsingText,
      isRing: ring,
      metalType: metal.metalType || '',
      karat: metal.karat || '',
      goldColor: metal.goldColor || '',
      currentRingSize: sizes.currentRingSize,
      desiredRingSize: sizes.desiredRingSize,
      said: { metal: Boolean(metal.metalType), karat: Boolean(metal.karat), color: Boolean(metal.goldColor) },
      inferredTasks: [],
      materialHints: [],
    }, { replace: true });
    lastAddedRef.current = { taskIds: [], stock: false };
  }, [applySmartIntakeResults]);

  const handleAnalyzeSmartIntake = useCallback(async () => {
    // Dictated forms ("14 karat", "7 and a half") folded into what the extractors match.
    const parsingText = normalizeSpokenIntake(String(formData.smartIntakeInput || '').trim());
    if (!parsingText) {
      setSmartIntakeError('Enter intake details first.');
      return;
    }

    const seq = ++readSeqRef.current;
    const latest = () => seq === readSeqRef.current;
    setAnalyzingSmartIntake(true);
    setSmartIntakeError('');

    // What the last read added and the jeweler has since deleted: his call, and a re-read does not undo it.
    const onTicket = new Set((formData.tasks || []).map((t) => String(t._id || '')));
    for (const id of lastAddedRef.current.taskIds) if (!onTicket.has(id)) removedByHandRef.current.taskIds.add(id);
    if (lastAddedRef.current.stock && !(formData.materials || []).some((m) => m._smartIntakeHintType)) removedByHandRef.current.stock = true;

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
      if (!latest()) return; // a newer read is in flight; this answer is for an older sentence

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
        }, [])
        .filter((task) => !removedByHandRef.current.taskIds.has(String(task._id)));

      const wideShank = inferredTasks.some((t) => /3\s*(?:mm)?\s*to\s*5\s*mm/i.test(String(t.title || '')));
      const stock = sizingStockItemsFor(parsed.materialHints, availableMaterials,
        { metalType: parsed.metalType || formData.metalType, karat: parsed.karat || formData.karat, goldColor: parsed.goldColor || formData.goldColor }, { wide: wideShank });
      const warnings = [...(Array.isArray(parsed.warnings) ? parsed.warnings : [])];
      if (stock.missing) warnings.push('This job needs sizing stock, and the materials list has none for this metal. Add it by hand.');
      // A line he put on or changed by hand is kept as his. When the sentence counts it differently, say so.
      for (const line of formData.tasks || []) {
        const read = inferredTasks.find((t) => String(t._id) === String(line._id || ''));
        const byHand = !line.__aiQuantity || Number(line.quantity) !== Number(line.__aiQuantity);
        if (read && byHand && Number(line.quantity) !== read.__aiQuantity) {
          warnings.push(`"${line.title}" is on the ticket at ${line.quantity} by hand; the sentence reads as ${read.__aiQuantity}. It was left at ${line.quantity}.`);
        }
      }
      const said = parsed.said || {};
      const formHadColor = Boolean(String(formData.goldColor || '').trim());
      const stillAssumed = Boolean(assumedColorRef.current) && assumedColorRef.current === formData.goldColor;
      const assumedColor = parsed.metalType === 'gold' && !said.color && (!formHadColor || stillAssumed) ? (parsed.goldColor || '') : '';
      assumedColorRef.current = assumedColor;

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
        skipStock: removedByHandRef.current.stock,
        wideShank,
        inferredTasks,
      }, { replace: true });
      lastAddedRef.current = { taskIds: inferredTasks.map((t) => String(t._id)), stock: stock.items.length > 0 && !removedByHandRef.current.stock };

      setSmartIntakeNotes({
        warnings,
        // Gold whose colour nobody said: shown as assumed while it is still the value on the form.
        assumed: { goldColor: assumedColor },
        fallback: false,
      });
    } catch (error) {
      if (!latest()) return;
      console.error('Smart intake failed:', error?.message);
      runRuleBasedSmartIntake(parsingText);
      assumedColorRef.current = '';
      setSmartIntakeNotes({ warnings: [], assumed: {}, fallback: true });
      setSmartIntakeError(AI_DOWN_MESSAGE);
    } finally {
      if (latest()) setAnalyzingSmartIntake(false);
    }
  }, [formData.smartIntakeInput, formData.description, formData.metalType, formData.karat, formData.goldColor, formData.tasks, formData.materials,
    availableTasks, availableMaterials, applySmartIntakeResults, runRuleBasedSmartIntake, setAnalyzingSmartIntake, setSmartIntakeError, setSmartIntakeNotes,
    smartIntakeLogIDsRef]);

  return {
    buildTaskItemsFromInferred,
    applySmartIntakeResults,
    runRuleBasedSmartIntake,
    handleAnalyzeSmartIntake,
  };
}
