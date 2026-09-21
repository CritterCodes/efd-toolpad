/**
 * Parcel presets for return shipments. Weights in OUNCES, dimensions in INCHES (EasyPost units).
 * Jewelry repairs ship in a handful of box sizes; presets mean the finalize step never asks for
 * ounces. Admin settings (`business.shipping.parcels`) may override the list; these are the
 * defaults until the owner does.
 */
export const DEFAULT_PARCEL_PRESETS = Object.freeze([
  // Owner SOP (2026-09-21): FedEx-branded boxes ONLY, never own boxes or bare envelopes. Standard is
  // padded envelope → FedEx Extra Small Box → FedEx Small Box S2 (the double box, both boxes free from
  // FedEx; the shallow S1 Small Box does NOT fit the XS inside). Medium/Large stay as fallbacks for
  // the odd oversized package. FedEx Express prices these by tier, not weight.
  { key: 'fedex-small-box', label: 'FedEx Small Box S2 — standard (Extra Small box inside, 12 oz)', predefinedPackage: 'FedExSmallBox', weightOz: 12 },
  { key: 'fedex-medium-box', label: 'FedEx Medium Box — oversized only (1 lb)', predefinedPackage: 'FedExMediumBox', weightOz: 16 },
  { key: 'fedex-large-box', label: 'FedEx Large Box — oversized only (1.5 lb)', predefinedPackage: 'FedExLargeBox', weightOz: 24 },
]);

export function resolveParcelPresets(settings = {}) {
  const custom = settings?.business?.shipping?.parcels;
  const list = Array.isArray(custom) && custom.length ? custom : DEFAULT_PARCEL_PRESETS;
  return list
    .filter((p) => p && p.key && Number(p.weightOz) > 0 && (p.predefinedPackage || (Number(p.length) > 0 && Number(p.width) > 0 && Number(p.height) > 0)))
    .map((p) => ({ ...p }));
}

export function findParcelPreset(settings = {}, key = '') {
  const presets = resolveParcelPresets(settings);
  return presets.find((p) => p.key === key) || presets[0] || null;
}

/** Preset → EasyPost Parcel body. */
export function parcelForEasyPost(preset) {
  if (!preset) return null;
  const weight = Math.round(Number(preset.weightOz) * 10) / 10;
  if (preset.predefinedPackage) return { predefined_package: preset.predefinedPackage, weight };
  return { length: Number(preset.length), width: Number(preset.width), height: Number(preset.height), weight };
}
