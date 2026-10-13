/**
 * Regenerate src/lib/wholesaleLeads/markets.data.js from the US Census Bureau's subcounty population
 * estimates.
 *
 * Owner, 2026-10-13: "use the census thing because I'm not going to make you a list."
 *
 * WHY A GENERATOR AND NOT A HAND-TYPED LIST. Every one of these 1,911 population figures decides
 * whether we spend money searching a city. A number typed from memory is a number nobody can check.
 * This script turns a published file into the committed data, so the provenance is the file name and
 * the vintage, and anyone can re-run it.
 *
 *   SOURCE   https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv
 *   VINTAGE  2024 estimates (POPESTIMATE2024), released 2025
 *   ROWS     SUMLEV 162 (incorporated place) and FUNCSTAT A (active government) only
 *
 * Usage:
 *   curl -o sub-est2024.csv <SOURCE>
 *   node scripts/build-market-list.mjs sub-est2024.csv
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_URL = 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv';
const VINTAGE = '2024';
const FLOOR = 20000; // the Census publishes its own ranking table at this threshold

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/build-market-list.mjs <sub-est2024.csv>');
  process.exit(1);
}

/** A CSV line, honouring quoted fields (place names contain commas). */
const parseRow = (line) => {
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
};

/**
 * Census names a place "<Name> <type>" — "Fort Smith city", "Boise City city". Strip only the final
 * token, and only when it is a government type, so "Boise City" survives intact.
 *
 * Consolidated city-counties are named for the merged government, not the city: "Nashville-Davidson
 * metropolitan government (balance)", "Louisville/Jefferson County metro government (balance)",
 * "Augusta-Richmond County consolidated government (balance)". Nobody searches for those. When one of
 * those governmental phrases is present the city is the part before the first separator — and only
 * then, so genuinely hyphenated names like Winston-Salem are untouched.
 */
// CASE-SENSITIVE on purpose. Census writes the government type in lower case ("Carson City city")
// and the proper name capitalised ("Carson City"). An /i flag here turns Nevada's capital into
// "Carson" by eating half its name.
const TYPE_SUFFIX = /\s+(city|town|village|borough|municipality|township)$/;
const CONSOLIDATED = /\s+(metropolitan government|metro government|consolidated government|unified government|urban county government|urban county)\b/i;
// "Macon-Bibb County", "Athens-Clarke County" — a merged city and county, named for both.
const CITY_COUNTY = /^(.+?)[-/](.+)\s+County$/;

const cleanName = (raw) => {
  let name = String(raw || '').replace(/\s*\(balance\)\s*$/i, '').trim();
  if (CONSOLIDATED.test(name)) {
    name = name.replace(CONSOLIDATED, '').trim();
    name = name.split(/[-/]/)[0].trim();
  }
  const cityCounty = CITY_COUNTY.exec(name);
  if (cityCounty) name = cityCounty[1].trim();
  // Hawaii's only entry is the CDP "Urban Honolulu"; nobody searches for that.
  name = name.replace(/\s+CDP$/i, '').replace(/^Urban\s+Honolulu$/i, 'Honolulu');
  return name.replace(TYPE_SUFFIX, '').trim();
};

const text = fs.readFileSync(csvPath, 'utf8');
const lines = text.split(/\r?\n/);
const header = parseRow(lines[0]);
const ix = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
for (const needed of ['SUMLEV', 'FUNCSTAT', 'NAME', 'STNAME', 'POPESTIMATE2024']) {
  if (ix[needed] === undefined) {
    console.error(`Column ${needed} not found — the Census layout changed. Columns: ${header.join(',')}`);
    process.exit(1);
  }
}

const markets = [];
for (let i = 1; i < lines.length; i += 1) {
  if (!lines[i]) continue;
  const row = parseRow(lines[i]);
  if (row[ix.SUMLEV] !== '162') continue;
  // A = an ordinary incorporated place.
  // F = the "(balance)" row of a consolidated city-county — this IS Nashville, Indianapolis,
  //     Louisville and Augusta. Filtering to A alone silently dropped four major markets.
  // S = a census-designated place, which is how Honolulu appears at all.
  if (!['A', 'F', 'S'].includes(row[ix.FUNCSTAT])) continue;
  const pop = Number(row[ix.POPESTIMATE2024]);
  if (!Number.isFinite(pop) || pop < FLOOR) continue;
  const city = cleanName(row[ix.NAME]);
  if (!city) continue;
  markets.push({ city, state: String(row[ix.STNAME]).trim(), pop });
}

// A consolidated government can appear twice (the incorporated place AND its balance row). Keep the
// larger figure for a given city+state so no market is listed, or searched, twice.
const byKey = new Map();
for (const m of markets) {
  const key = `${m.city.toLowerCase()}|${m.state.toLowerCase()}`;
  const seen = byKey.get(key);
  if (!seen || m.pop > seen.pop) byKey.set(key, m);
}
markets.length = 0;
markets.push(...byKey.values());

markets.sort((a, b) => b.pop - a.pop || a.city.localeCompare(b.city));

// Emitted as JSON, not JS: it is data, and a 1,900-line source file is a code-complexity lint
// failure for no reason. One row per line so a diff after a re-run is readable.
const out = path.join(process.cwd(), 'src', 'lib', 'wholesaleLeads', 'markets.data.json');
const body = markets.map((m) => `    ${JSON.stringify([m.city, m.state, m.pop])}`).join(',\n');
fs.writeFileSync(out, `{
  "_generated": "node scripts/build-market-list.mjs <sub-est2024.csv> — do not edit by hand",
  "_source": "${SOURCE_URL}",
  "_vintage": "${VINTAGE} estimates (POPESTIMATE${VINTAGE})",
  "_rows": "SUMLEV 162 (place); FUNCSTAT A (incorporated), F (consolidated city-county balance — how Nashville, Indianapolis, Louisville and Augusta appear), S (CDP — how Honolulu appears). Deduped by city+state, larger figure kept.",
  "_floor": ${FLOOR},
  "_count": ${markets.length},
  "_shape": "[city, state, population]",
  "rows": [
${body}
  ]
}
`, 'utf8');

console.log(`wrote ${out}`);
console.log(`${markets.length} markets at population >= ${FLOOR.toLocaleString()}`);
for (const floor of [250000, 100000, 50000, 20000]) {
  console.log(`  >= ${String(floor).padStart(7)}: ${markets.filter((m) => m.pop >= floor).length}`);
}
