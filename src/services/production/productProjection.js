import { gemstoneFromPrice, publicGemstoneSpec } from '@/services/production/designCost';

export function projectDesignProduct({ product = {}, design, pieces = [] }) {
  const available = pieces.filter((piece) => piece.status === 'available');
  const allocated = design.edition?.allocated ?? 0;
  const committed = design.edition?.committed ?? 0;
  const cap = design.edition?.type === 'one_of_one' ? 1 : design.edition?.limit;
  const remaining = design.edition?.type === 'unlimited' ? undefined : Math.max(0, cap - allocated - committed);
  const variants = (design.variants || []).filter((variant) => variant.active).map((variant) => {
    const matching = available.filter((piece) => piece.variantId === variant.variantId);
    return {
      ...variant,
      offers: {
        ...(matching.length ? { readyToShip: { quantity: matching.length, pieceIDs: matching.map((piece) => piece.pieceID) } } : {}),
        ...((remaining === undefined || remaining > 0) ? { madeToOrder: { enabled: true, leadTimeDays: variant.leadTimeDays ?? null, customizerEnabled: Boolean(variant.viewer?.customizable) } } : {}),
      },
    };
  });
  const defaultVariantId = product.defaultVariantId && variants.some((variant) => variant.variantId === product.defaultVariantId)
    ? product.defaultVariantId : variants[0]?.variantId ?? null;
  const primary = variants.find((variant) => variant.variantId === defaultVariantId);
  // A gemstone Design projects as a gemstone product (gem-native spec), not jewelry (metal/ringSize).
  const isGem = design.category === 'gemstone';
  // Gem price = live "from" floor (cheapest orderable color at caratMin) — gem variants carry no
  // fixed retailPrice; the real price is a function of the carat the shopper picks (Phase-4
  // endpoint). The public gem spec is STRIPPED of pricing internals (rate tiers, cut labor, lots).
  const gemFrom = isGem ? gemstoneFromPrice(design) : null;
  return {
    ...product, productType: isGem ? 'gemstone' : 'jewelry', designId: design.designID, defaultVariantId, variants: isGem
      ? variants.map((v) => ({ ...v, ...(v.gemstone ? { gemstone: publicGemstoneSpec(v.gemstone) } : {}) }))
      : variants,
    edition: { ...design.edition, ...(remaining === undefined ? {} : { remaining }) },
    price: isGem ? (gemFrom ?? primary?.pricing?.retailPrice ?? null) : primary?.pricing?.retailPrice,
    ...(isGem && gemFrom != null ? { priceIsFrom: true } : {}),
    viewer: primary?.viewer ?? null,
    availability: primary?.offers?.readyToShip ? 'ready-to-ship' : 'made-to-order',
    ...(isGem
      // Cut/technique are DESIGN details; the material spec (species/…) is per-variant, public-stripped.
      ? { gemstone: publicGemstoneSpec({ ...(design.gemstone || {}), ...(primary?.gemstone || product.gemstone || {}) }) }
      : { jewelry: { ...(product.jewelry || {}), ringSize: primary?.ringSize } }),
    references: { ...(product.references || {}), designId: design.designID, gemstoneId: design.gemstoneId ?? null },
  };
}
