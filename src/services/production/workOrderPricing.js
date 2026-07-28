import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';

/**
 * Work-order markup — sourced from the admin **wholesale markup** setting (owner: "use the
 * wholesaler markup in the admin setting, not a hardcoded number"). It's a MULTIPLIER (e.g. 1.5 =
 * sell at 1.5× cost), the same value/semantics `calculateWholesalePrice` uses. Neutral module so
 * both castingBoard and artisanBilling can import it without an import cycle.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Default multiplier when the setting is missing/invalid — matches the settings layer's own default. */
export const DEFAULT_WO_MARKUP = 1.5;

/** Fetch the wholesale markup multiplier from admin settings (fails safe to the default). Impure. */
export async function getWorkOrderMarkupMultiplier() {
  try {
    const settings = await SettingsManagerService.getSettings();
    const m = Number(settings?.pricing?.wholesaleMarkup ?? settings?.pricing?.wholesaleConfig?.minimumMultiplier);
    return Number.isFinite(m) && m > 0 ? m : DEFAULT_WO_MARKUP;
  } catch {
    return DEFAULT_WO_MARKUP;
  }
}

/** Apply the markup multiplier to a cost (charge = cost × multiplier). PURE. */
export function applyWorkOrderMarkup(cost, multiplier = DEFAULT_WO_MARKUP) {
  const m = Number.isFinite(Number(multiplier)) && Number(multiplier) > 0 ? Number(multiplier) : DEFAULT_WO_MARKUP;
  return round2((Number(cost) || 0) * m);
}
