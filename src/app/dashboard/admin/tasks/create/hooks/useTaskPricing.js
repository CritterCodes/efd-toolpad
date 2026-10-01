import { useMemo } from 'react';
import { priceTask, cannotPriceMessage } from '@/services/pricing/engine';
import { metalsForTask } from '@/services/pricing/taskPricing';
import usePricingContext from '@/hooks/pricing/usePricingContext';

/**
 * The task builder's price preview — THE engine (services/pricing/engine.js) on the task exactly as it
 * will be saved, priced from the same context the server prices from (GET /api/pricing/context). So the
 * preview is the price the counter will charge, to the cent.
 *
 * This replaced a preview with its own math: a $30 wage fallback, a hand-rolled material lookup, stored
 * process prices, and a "metal complexity" multiplier. A metal the task can't be priced in (no stock) is
 * left out, never shown as $0; when pricing doesn't load, `pricingError` says why and nothing is shown.
 */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const metalLabelFor = (key) => key
  .split('_')
  .map((w) => (/^\d+k$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
  .join(' ');

function previewRow(r, metalLabel, metalKey) {
  return {
    metalLabel,
    metalType: metalKey,
    totalLaborHours: r.laborHours,
    laborCost: r.laborCost,
    baseMaterialCost: round2(r.materialsCost),
    toolCost: r.toolCost,
    baseCost: r.baseCost,
    retailPrice: r.retail.listUnit,
    wholesalePrice: r.wholesale.listUnit,
  };
}

/** The task as the builder will save it — the shape the server prices. */
function taskFromForm(formData = {}) {
  return {
    processes: formData.processes || [],
    materials: formData.materials || [],
    tools: formData.tools || [],
    metals: formData.metals || [],
    minimumPrice: formData.minimumPrice,
    priceOverride: formData.priceOverride,
    minimumWholesalePrice: formData.minimumWholesalePrice,
    minimumLaborPrice: formData.minimumLaborPrice,
    variantPricingAdjustments: formData.variantPricingAdjustments || {},
  };
}

export function useTaskPricing({ formData }) {
  const { ctx, error: pricingError } = usePricingContext();

  return useMemo(() => {
    const empty = { pricePreview: null, pricesByMetal: {}, pricingError, pricingMessage: '' };
    if (!ctx) return empty;
    const hasWork = (formData.processes || []).length + (formData.materials || []).length + (formData.tools || []).length > 0;
    if (!hasWork) return empty;

    const task = taskFromForm(formData);
    const { settings, materials, tools, metals } = ctx;
    const pricesByMetal = {};

    const flat = priceTask({ task, settings, materials, tools, metal: null });
    if (flat.ok) {
      // Doesn't depend on metal: one price, the same in every metal.
      pricesByMetal.universal = previewRow(flat, 'Universal Pricing', 'universal');
    } else {
      for (const key of metalsForTask(task, metals)) {
        const r = priceTask({ task, settings, materials, tools, metal: key });
        if (r.ok) pricesByMetal[key] = previewRow(r, metalLabelFor(key), key);
      }
    }

    const first = Object.values(pricesByMetal)[0] || null;
    // Nothing priceable: say why, rather than show a $0.
    const pricingMessage = first ? '' : cannotPriceMessage(flat);
    return { pricePreview: first, pricesByMetal, pricingError, pricingMessage };
  }, [ctx, formData, pricingError]);
}
