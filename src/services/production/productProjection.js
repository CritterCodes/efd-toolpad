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
  return {
    ...product, productType: isGem ? 'gemstone' : 'jewelry', designId: design.designID, defaultVariantId, variants,
    edition: { ...design.edition, ...(remaining === undefined ? {} : { remaining }) },
    price: primary?.pricing?.retailPrice, viewer: primary?.viewer ?? null,
    availability: primary?.offers?.readyToShip ? 'ready-to-ship' : 'made-to-order',
    ...(isGem
      // Cut/technique are DESIGN details; the material spec (species/carat/…) is per-variant.
      ? { gemstone: { ...(design.gemstone || {}), ...(primary?.gemstone || product.gemstone || {}) } }
      : { jewelry: { ...(product.jewelry || {}), ringSize: primary?.ringSize } }),
    references: { ...(product.references || {}), designId: design.designID, gemstoneId: design.gemstoneId ?? null },
  };
}
