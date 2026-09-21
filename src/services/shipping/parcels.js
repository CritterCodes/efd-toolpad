/**
 * Parcel presets for return shipments. Weights in OUNCES, dimensions in INCHES (EasyPost units).
 * Jewelry repairs ship in a handful of box sizes; presets mean the finalize step never asks for
 * ounces. Admin settings (`business.shipping.parcels`) may override the list; these are the
 * defaults until the owner does.
 */
export const DEFAULT_PARCEL_PRESETS = Object.freeze([
  // FedEx-branded packaging first: on Express services FedEx prices these by PACKAGE TIER and zone,
  // not weight (up to 50 lb), so the tier is the whole decision for a 2 oz ring. Weights are
  // realistic jewelry weights — wrap + inner box + FedEx packaging.
  { key: 'fedex-envelope', label: 'FedEx Envelope (flat item, 4 oz)', predefinedPackage: 'FedExEnvelope', weightOz: 4 },
  { key: 'fedex-pak', label: 'FedEx Pak (padded envelope inside, 8 oz)', predefinedPackage: 'FedExPak', weightOz: 8 },
  { key: 'fedex-small-box', label: 'FedEx Small Box (jewelry box inside, 12 oz)', predefinedPackage: 'FedExSmallBox', weightOz: 12 },
  { key: 'fedex-medium-box', label: 'FedEx Medium Box (1 lb)', predefinedPackage: 'FedExMediumBox', weightOz: 16 },
  { key: 'fedex-large-box', label: 'FedEx Large Box (1.5 lb)', predefinedPackage: 'FedExLargeBox', weightOz: 24 },
  // Own packaging: FedEx bills the GREATER of actual and dimensional weight, so a big box of air
  // is expensive regardless of what's in it.
  { key: 'small-box', label: 'Own small box (6×4×4 in, 8 oz)', length: 6, width: 4, height: 4, weightOz: 8 },
  { key: 'medium-box', label: 'Own medium box (8×6×4 in, 1 lb)', length: 8, width: 6, height: 4, weightOz: 16 },
  { key: 'large-box', label: 'Own large box (12×12×8 in, 2 lb — dim weight ~8 lb)', length: 12, width: 12, height: 8, weightOz: 32 },
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
