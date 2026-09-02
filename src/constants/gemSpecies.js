/**
 * Per-species specific gravity (g/cm³) — the host-side table REFRAKT explicitly refuses to own
 * (FR-gem-size-customizer §3). SG converts carat ⇄ mm for the shop's size control and the
 * jewelry-slot coupling: `baseCarat = stlVolumeCm3 × SG × 5` (1 ct = 0.2 g). A 2ct amethyst
 * (2.65) is a much larger stone than a 2ct sapphire (4.00).
 *
 * Values are standard trade figures (GIA gem reference, mid-range where a species spans a
 * range). A per-variant `gemstone.sg` override always wins — set it for unusual material.
 */
export const GEM_SPECIES = {
  agate: { label: 'Agate', sg: 2.60 },
  alexandrite: { label: 'Alexandrite', sg: 3.73 },
  amethyst: { label: 'Amethyst', sg: 2.65 },
  ametrine: { label: 'Ametrine', sg: 2.65 },
  apatite: { label: 'Apatite', sg: 3.20 },
  aquamarine: { label: 'Aquamarine', sg: 2.69 },
  beryl: { label: 'Beryl', sg: 2.72 },
  chrysoberyl: { label: 'Chrysoberyl', sg: 3.73 },
  citrine: { label: 'Citrine', sg: 2.65 },
  diamond: { label: 'Diamond', sg: 3.52 },
  emerald: { label: 'Emerald', sg: 2.72 },
  garnet: { label: 'Garnet', sg: 3.90 },
  iolite: { label: 'Iolite', sg: 2.61 },
  labradorite: { label: 'Labradorite', sg: 2.70 },
  moissanite: { label: 'Moissanite', sg: 3.22 },
  moonstone: { label: 'Moonstone', sg: 2.58 },
  morganite: { label: 'Morganite', sg: 2.80 },
  opal: { label: 'Opal', sg: 2.10 },
  peridot: { label: 'Peridot', sg: 3.34 },
  quartz: { label: 'Quartz', sg: 2.65 },
  ruby: { label: 'Ruby', sg: 4.00 },
  sapphire: { label: 'Sapphire', sg: 4.00 },
  spinel: { label: 'Spinel', sg: 3.60 },
  sunstone: { label: 'Sunstone', sg: 2.65 },
  tanzanite: { label: 'Tanzanite', sg: 3.35 },
  topaz: { label: 'Topaz', sg: 3.53 },
  tourmaline: { label: 'Tourmaline', sg: 3.06 },
  zircon: { label: 'Zircon', sg: 4.65 },
};

/**
 * Resolve a species' SG from free-typed species text ("Oregon Sunstone", "Chrome Tourmaline").
 * Exact key first, then a contained species word — so variety prefixes don't defeat the lookup.
 * Returns null when unknown (the caller may have a per-variant override; without either, the
 * size control simply stays off).
 */
export function speciesSG(species) {
  const s = String(species || '').trim().toLowerCase();
  if (!s) return null;
  if (GEM_SPECIES[s]) return GEM_SPECIES[s].sg;
  for (const [key, val] of Object.entries(GEM_SPECIES)) {
    if (s.includes(key)) return val.sg;
  }
  return null;
}
