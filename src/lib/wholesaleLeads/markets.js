/**
 * Markets — the cities we search, one at a time.
 *
 * WHY NOT A RADIUS. Until 2026-10-13 an import was "everything within N miles of Fort Smith". It could
 * never have been anything else: Google caps a text search's location bias at 50,000 m (~31 miles)
 * — see googlePlaces.js, `Math.min(radiusMeters, 50000)` — so a 500-mile run searched 31 miles and
 * then threw away whatever fell outside 500. It returned 130 of its 167 leads from Arkansas, one from
 * Texas and one from Kansas.
 *
 * Owner, 2026-10-13: "qualify cities based off of their populations... and then run individual
 * searches in all of those cities instead of doing a radius from Fort Smith. We could aggregate that
 * data in the admin instead of having one big list."
 *
 * So a market is the unit of work: one city, searched on its own terms, and every lead it produces
 * carries its marketKey. The admin groups by that instead of showing one undifferentiated pile.
 *
 * Population is the only thing we rank by, because it is the only thing we have that is both
 * published and comparable. It is a proxy for "how many jewellers are there", not a quality score.
 */
import marketData from './markets.data.json';

const MARKET_ROWS = marketData.rows;

/**
 * Population bands. A band is how you choose what to spend: tier 1 is 88 cities, tier 4 is another
 * 1,104. Running them all is a budget decision, not a default.
 */
export const MARKET_TIERS = Object.freeze([
  { key: 'metro', label: 'Major metro', min: 250000, max: Infinity },
  { key: 'large', label: 'Large city', min: 100000, max: 250000 },
  { key: 'mid', label: 'Mid-size city', min: 50000, max: 100000 },
  { key: 'small', label: 'Small city', min: 20000, max: 50000 },
]);

export const tierFor = (pop) => MARKET_TIERS.find((t) => pop >= t.min && pop < t.max) || MARKET_TIERS.at(-1);

/** `dallas-texas` — stable, URL-safe, and what a lead is stamped with. */
export const marketKey = (city, state) => `${String(city)}-${String(state)}`
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const build = () => MARKET_ROWS.map(([city, state, pop]) => ({
  key: marketKey(city, state),
  city,
  state,
  population: pop,
  tier: tierFor(pop).key,
  // What actually goes into the Google query. The full state name disambiguates the 30-odd US
  // Springfields without needing a table of postal abbreviations.
  searchLocation: `${city}, ${state}`,
}));

let cache = null;
/** Every market, largest first. */
export function allMarkets() {
  if (!cache) cache = Object.freeze(build().map(Object.freeze));
  return cache;
}

/**
 * The markets to work, filtered and ordered by population.
 *
 * @param {object} opts
 * @param {number} [opts.minPopulation] floor
 * @param {string[]} [opts.tiers] limit to these tier keys
 * @param {string[]} [opts.states] limit to these state names
 * @param {number} [opts.limit] take only the first N (they are largest-first)
 * @param {string[]} [opts.exclude] marketKeys already done
 */
export function selectMarkets({ minPopulation = 0, tiers = null, states = null, limit = null, exclude = [] } = {}) {
  const skip = new Set(exclude);
  const tierSet = tiers?.length ? new Set(tiers) : null;
  const stateSet = states?.length ? new Set(states.map((s) => String(s).toLowerCase())) : null;
  let out = allMarkets().filter((m) => (
    m.population >= minPopulation
    && !skip.has(m.key)
    && (!tierSet || tierSet.has(m.tier))
    && (!stateSet || stateSet.has(m.state.toLowerCase()))
  ));
  if (Number.isFinite(limit) && limit > 0) out = out.slice(0, limit);
  return out;
}

/** One market by key, or null. */
export function marketByKey(key) {
  return allMarkets().find((m) => m.key === key) || null;
}

/**
 * The market a free-typed search location names, or null when it names none.
 *
 * The import dialog takes lines of text, and it always will — a state name, a region, something the
 * owner typed. "Dallas, Texas" and "dallas texas" both resolve; "Arkansas" resolves to nothing, which
 * is correct: a whole state is not a market and its leads stay ungrouped rather than being filed
 * under whichever city happens to match.
 */
export function marketForSearchLocation(location) {
  // marketKey() takes (city, state); a free-typed line is one string, so normalise it the same way
  // rather than passing it as the city and leaving state undefined.
  const key = String(location || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!key) return null;
  return allMarkets().find((m) => m.key === key) || null;
}

/** How many markets each tier holds — for the picker, so the cost of a choice is visible. */
export function marketCounts() {
  const all = allMarkets();
  return MARKET_TIERS.map((t) => ({
    ...t,
    count: all.filter((m) => m.tier === t.key).length,
  }));
}
