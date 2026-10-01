import { useEffect, useState } from 'react';
import { pricingContextFromPayload } from '@/services/pricing/clientContext';
import { stockedMetals } from '@/services/pricing/taskPricing';

/**
 * What every price in the browser is calculated from — the same context the server prices with
 * (GET /api/pricing/context → services/pricing/catalog.js loadPricingContext). NO DEFAULTS: when the
 * settings don't load or are incomplete, `ctx` stays null and `error` says why.
 *
 * @returns {{ ctx: { settings, materials, tools, metals } | null, error: string }}
 */
export default function usePricingContext() {
  const [state, setState] = useState({ ctx: null, error: '' });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/pricing/context')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `Pricing did not load (${res.status}).`);
        const ctx = pricingContextFromPayload(body);
        return { ...ctx, metals: stockedMetals(ctx.materials) };
      })
      .then((ctx) => { if (!cancelled) setState({ ctx, error: '' }); })
      .catch((error) => { if (!cancelled) setState({ ctx: null, error: error?.message || 'Pricing did not load.' }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}
