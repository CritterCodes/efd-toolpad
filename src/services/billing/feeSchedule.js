/**
 * Fee schedule (S6) — the configurable rates behind the services-continuum fee
 * model (D7). EFD's cut is composed of the service pillars it provides for a sale:
 * Storefront / Custody / Fulfillment. Consignment (all three) and marketplace
 * (storefront only) are the two ends of the continuum.
 *
 * Rates here are PLACEHOLDERS — the owner sets real values later. The consignment
 * bundle defaults to the legacy flat `adminSettings.pricing.consignmentFeeRate`
 * (0.20) so the formalized model is backward-compatible.
 */
export const DEFAULT_FEE_SCHEDULE = {
  // Named bundles (continuum ends)
  consignment: 0.20, // EFD holds + fulfills + storefront (matches legacy default)
  marketplace: 0.15, // storefront only (artisan holds + ships)
  // Pillar add-ons for hybrid composition (storefront is the base / marketplace rate)
  pillars: {
    storefront: 0.15,  // listing + traffic (also the marketplace base)
    custody: 0.03,     // EFD physically holds the goods
    fulfillment: 0.02, // EFD picks/packs/ships
  },
};

/**
 * Build a fee schedule from admin settings, defaulting the consignment bundle to
 * the legacy flat rate so existing behavior is preserved.
 */
export function loadFeeSchedule(adminSettings = {}) {
  const legacyConsignment = Number(adminSettings?.pricing?.consignmentFeeRate);
  const configured = adminSettings?.pricing?.feeSchedule || {};
  return {
    consignment: Number.isFinite(legacyConsignment) && legacyConsignment > 0
      ? legacyConsignment
      : (Number(configured.consignment) || DEFAULT_FEE_SCHEDULE.consignment),
    marketplace: Number(configured.marketplace) || DEFAULT_FEE_SCHEDULE.marketplace,
    pillars: {
      storefront: Number(configured?.pillars?.storefront) || DEFAULT_FEE_SCHEDULE.pillars.storefront,
      custody: Number(configured?.pillars?.custody) || DEFAULT_FEE_SCHEDULE.pillars.custody,
      fulfillment: Number(configured?.pillars?.fulfillment) || DEFAULT_FEE_SCHEDULE.pillars.fulfillment,
    },
  };
}
