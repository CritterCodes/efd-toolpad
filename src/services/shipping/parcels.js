/**
 * Parcel presets for return shipments. Weights in OUNCES, dimensions in INCHES (EasyPost units).
 * Jewelry repairs ship in a handful of box sizes; presets mean the finalize step never asks for
 * ounces. Admin settings (`business.shipping.parcels`) may override the list; these are the
 * defaults until the owner does.
 */
export const DEFAULT_PARCEL_PRESETS = Object.freeze([
  { key: 'small-box', label: 'Small box (6×4×4 in, 8 oz)', length: 6, width: 4, height: 4, weightOz: 8 },
  { key: 'medium-box', label: 'Medium box (8×6×4 in, 1 lb)', length: 8, width: 6, height: 4, weightOz: 16 },
  { key: 'large-box', label: 'Large box (12×12×8 in, 5 lb)', length: 12, width: 12, height: 8, weightOz: 80 },
  { key: 'fedex-small-box', label: 'FedEx Small Box (carrier-supplied, 12 oz)', predefinedPackage: 'FedExSmallBox', weightOz: 12 },
  { key: 'fedex-medium-box', label: 'FedEx Medium Box (carrier-supplied, 2 lb)', predefinedPackage: 'FedExMediumBox', weightOz: 32 },
  { key: 'fedex-large-box', label: 'FedEx Large Box (carrier-supplied, 3 lb)', predefinedPackage: 'FedExLargeBox', weightOz: 48 },
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
