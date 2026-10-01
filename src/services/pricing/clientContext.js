/**
 * The pricing context as it crosses to the browser, and back into an engine context there.
 *
 * Only what the engine reads is sent: the pricing settings and each material's and tool's COST fields.
 * Names, suppliers, SKUs and the rest stay on the server.
 */
import { resolvePricingSettings } from './engine';

const MATERIAL_FIELDS = ['_id', 'displayName', 'name', 'isMetalDependent', 'portionsPerUnit', 'estimatedCost', 'stullerPrice', 'unitCost'];
const VARIANT_FIELDS = ['metalType', 'karat', 'stullerPrice', 'unitCost', 'portionsPerUnit'];

const pick = (obj, fields) => Object.fromEntries(fields.filter((f) => obj?.[f] !== undefined).map((f) => [f, obj[f]]));

/** Server: the JSON body for GET /api/pricing/context. */
export function pricingContextPayload({ adminSettings, materials = [], tools = [] }) {
  return {
    pricing: adminSettings?.pricing || null,
    materials: materials.map((m) => ({
      ...pick(m, MATERIAL_FIELDS),
      _id: String(m._id),
      ...(Array.isArray(m.stullerProducts) ? { stullerProducts: m.stullerProducts.map((p) => pick(p, VARIANT_FIELDS)) } : {}),
    })),
    tools: tools.map((t) => ({ _id: String(t._id), costPerUse: t.costPerUse })),
  };
}

/**
 * Browser: turn the response into the engine's context. THROWS PricingError when the settings are
 * missing or invalid — the caller shows that and refuses to price.
 */
export function pricingContextFromPayload(body) {
  const settings = resolvePricingSettings({ pricing: body?.pricing });
  return { settings, materials: body?.materials || [], tools: body?.tools || [] };
}
