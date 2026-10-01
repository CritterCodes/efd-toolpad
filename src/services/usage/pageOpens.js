/**
 * Which pages get opened — the evidence for retiring what nobody uses (docs/GUARDRAILS_PLAN.md, "Retire what nobody
 * uses"; owner, 2026-09-30: "Lots of reports that are never opened. Stats that aren't really useful.").
 *
 * One counter per (day, role, page). No user, no query string, no content — just that a page of this shape was opened
 * by someone in this role on this day. IDs in the URL are folded to `:id`, so /dashboard/repairs/repair-6e9d2249 and
 * every other repair count as one page.
 */
export const PAGE_OPENS = 'pageOpens';

const MAX_PATH = 200;

/** Pure: a pathname as a page shape — ids become `:id`; trailing slashes and queries dropped. */
export function normalizePath(pathname = '') {
  const path = String(pathname).split(/[?#]/)[0].slice(0, MAX_PATH);
  const segments = path.split('/').filter(Boolean).map((seg) => {
    const s = decodeURIComponentSafe(seg);
    if (/^\d+$/.test(s)) return ':id';
    if (/^[a-f0-9]{24}$/i.test(s)) return ':id'; // Mongo ObjectId
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)) return ':id'; // UUID
    if (/\d/.test(s) && s.length >= 6) return ':id'; // repair-6e9d2249, rinv-bdac0837, user-bc65813d
    return s.toLowerCase();
  });
  return `/${segments.join('/')}`;
}

function decodeURIComponentSafe(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** UTC day, YYYY-MM-DD. */
export const dayOf = (date = new Date()) => date.toISOString().slice(0, 10);

/** Count one page open. Only dashboard pages are counted; anything else is ignored. */
export async function recordPageOpen(dbi, { pathname, role, at = new Date() }) {
  const path = normalizePath(pathname);
  if (!path.startsWith('/dashboard')) return null;
  const day = dayOf(at);
  const who = String(role || 'unknown').slice(0, 40);
  await dbi.collection(PAGE_OPENS).updateOne(
    { _id: `${day}|${who}|${path}` },
    { $inc: { count: 1 }, $setOnInsert: { day, role: who, path } },
    { upsert: true },
  );
  return { day, role: who, path };
}

/** Pure: a page file (`src/app/dashboard/repairs/[repairID]/page.js`) as the page shape its URLs are counted under. */
export function routeFromPageFile(file = '') {
  const rel = String(file).replace(/\\/g, '/').replace(/^.*?src\/app/, '').replace(/\/page\.(js|jsx|tsx?)$/, '');
  const segments = rel.split('/').filter(Boolean)
    .filter((seg) => !/^\(.*\)$/.test(seg)) // route groups don't appear in URLs
    .map((seg) => (/^\[.*\]$/.test(seg) ? ':id' : seg.toLowerCase()));
  return `/${segments.join('/')}`;
}
