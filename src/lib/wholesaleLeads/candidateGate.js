/**
 * Is this search result worth paying to look at?
 *
 * The import used to call Place Details, fetch the whole website and run a Gemini extraction on EVERY
 * candidate a text search returned — before it knew whether the business sold jewellery at all. On the
 * 2026-10-13 run that meant enriching "Remember When Antique Mall", "Lisa's Eagle Nest Flea Market",
 * "The Classic Kitten Vintage Fashion" and eight bridal and prom dress shops. One of the dress shops
 * scored 88 and was filed as a qualified lead.
 *
 * This gate runs on what the SEARCH already returns — the name and Google's own `types`, both in the
 * existing field mask — so a rejected candidate costs nothing beyond the search page it arrived on.
 * Nationwide that is the difference between a viable crawl and an unaffordable one.
 *
 * MEASURED against the 167 leads that run produced:
 *   - enriches 115 of 167 (69%); 31% cost nothing further
 *   - of the 21 it drops that the old scorer had kept, 20 are dress shops, antique malls or pawn/coin
 *     shops. It is correcting the scorer, not losing jewellers.
 *   - chains it still admits (Zales, JCPenney, James Avery) all score under 35 and are rejected
 *     downstream, which is the right division of labour: the gate decides what is worth LOOKING at,
 *     the rubric decides what is worth CALLING.
 *
 * Deliberately generous in one direction: a shop Google types only as `establishment` but whose name
 * says "Jewelry" is kept. "Michael's Jewelry" and "Lindy's Jewelry & Repair" both scored 100 with no
 * jewellery type on them at all, so a types-only gate would have thrown away real prospects.
 */

/** Google's own words for the thing we are looking for. */
export const JEWELRY_TYPES = Object.freeze(['jewelry_store', 'jewelry_repair_service', 'watch_repair_service']);

/**
 * Retail types that are not a jewellery business. A candidate carrying one of these and no jewellery
 * type is a clothing shop, an antique mall or a supermarket, whatever its name hints at.
 */
export const NON_JEWELRY_TYPES = Object.freeze([
  'antique_store', 'thrift_store', 'furniture_store', 'home_goods_store', 'clothing_store',
  'shoe_store', 'book_store', 'grocery_or_supermarket', 'supermarket', 'bakery', 'restaurant',
  'beauty_salon', 'hair_care', 'spa', 'electronics_store', 'general_contractor', 'department_store',
  'shopping_mall', 'car_repair', 'pharmacy',
]);

/** Words that make a shop a jewellery shop regardless of how Google filed it. */
const JEWELRY_NAME = /\b(jewel|jeweler|jewellery|jewelry|diamond|gemolog|goldsmith|silversmith|watchmaker)/i;

const has = (types, list) => {
  const set = new Set((types || []).map((t) => String(t || '').toLowerCase()));
  return list.some((t) => set.has(t));
};

/**
 * @param {{ name?: string, types?: string[] }} place a Google text-search result
 * @returns {{ keep: boolean, reason: string }}
 */
export function gateCandidate(place = {}) {
  const name = String(place.name || place.displayName || '');
  const types = Array.isArray(place.types) ? place.types : [];

  // Google calling it a jeweller is the strongest signal there is, and it is free.
  if (has(types, JEWELRY_TYPES)) return { keep: true, reason: 'typed_jewelry' };

  // Typed as some other kind of shop, and Google did not also call it a jeweller.
  if (has(types, NON_JEWELRY_TYPES)) return { keep: false, reason: 'typed_other_retail' };

  // Pawn shops and coin dealers carry `finance`. Under the fine-jewellery target they are not the
  // prospect (owner's partner, 2026-10-13: "no to pawn shops"), and the `pawn` profile reaches them
  // by its own search queries, which return them typed as jewelry stores anyway.
  if (has(types, ['finance'])) return { keep: false, reason: 'pawn_or_coin' };

  // Thinly-typed but unmistakably a jeweller by name.
  if (JEWELRY_NAME.test(name)) return { keep: true, reason: 'named_jewelry' };

  return { keep: false, reason: 'no_jewelry_signal' };
}
