import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (goal step 4, 2026-10-01): signed in is not authorized.
 *
 * The bug class: a write route that checks only "is there a session", so any account — a customer, a store, an
 * off-site artisan — can do what only staff, a capability holder or the owner should. Found this way:
 * /api/admin/artisans (an applicant could self-approve, 2026-09), casting and shipping legs on anybody's
 * pieces, replacing any design's GLB, pushing images onto any listing, rewriting a gem listing's prices,
 * archiving anybody's notifications (all 2026-10-01).
 *
 * Every route.js under src/app/api that exports POST/PUT/PATCH/DELETE must make an authorization decision
 * beyond sign-in — a role list, a capability, an ownership compare or a permission helper — in the route or in
 * the local controller it delegates to. Or it is listed below with the reason sign-in is the whole rule.
 */
const API = path.resolve(__dirname);

const EXEMPT = {
  // Account self-service: the caller acts on their own account, or has none yet.
  'auth/change-password/route.js': 'changes the caller\'s own password',
  'auth/emergency-logout/route.js': 'ends the caller\'s own session',
  'auth/forgot-password/route.js': 'public by design; mails a reset link to the address on file',
  'auth/logout/route.js': 'ends the caller\'s own session',
  'auth/register/route.js': 'public by design; creates a pending account',
  'auth/reset-password/route.js': 'authorized by the emailed reset token',
  'policies/[docId]/accept/route.js': 'records the caller\'s own acceptance',
  'push/subscribe/route.js': 'stores the caller\'s own push subscription',
  'guide/route.js': 'the caller\'s own guide checklist',
  'usage/page-open/route.js': 'a page-open counter (path, role, day); no content',
  'artisan/gallery/[id]/route.js': 'edits the caller\'s own gallery; every write is scoped to their user document',
  // No database write: computes and returns. (The AI helpers used to be here; since Q11 they authorize by surface.)
  'pricing/estimate/route.js': 'prices a draft through the engine; writes nothing',
  'refrakt-price/route.js': 'public customizer price, origin-checked; writes nothing',
  // Authorized by something other than the session.
  'stripe/terminal/sessions/route.js': 'bound to the per-payment terminal session token; amounts come from Stripe',
  'preview-context/reset/route.js': 'preview deployments only, bearer PREVIEW_RESET_TOKEN',
  // The service decides: it refuses anyone but the work order's assigned designer (pieceActions/cadFiles.js).
  'bench/work-orders/[workOrderID]/attach-stl/route.js': 'service: assigned designer only',
  'bench/work-orders/[workOrderID]/replace-stl/route.js': 'service: assigned designer only',
  'bench/work-orders/[workOrderID]/upload-glb/route.js': 'service: assigned designer only',
  'bench/work-orders/[workOrderID]/upload-stl/route.js': 'service: assigned designer only',
};

const MUTATES = /export\s+(?:async\s+function|const)\s+(?:POST|PUT|PATCH|DELETE)\b/;
const AUTHZ = new RegExp([
  String.raw`requireRole\(`, 'requireRepairOps', 'requireRepairsAccess', 'requireStaffRepairsAccess', 'requireSalesPosAccess',
  'requireAdmin', 'checkAPIPermissions', String.raw`isStaff\(`, String.raw`isAdmin\w*\(`, 'STAFF_ROLES',
  String.raw`\brole\s*(?:===|!==)`, String.raw`\.includes\(\s*[\w.?]*\.role\s*\)`, String.raw`\bcan[A-Z]\w*\(`,
  'hasStaffCapability', 'hasNamedCapability', 'isOnsiteRepairOps', String.raw`\w+Refusal\(`,
  // Staff, or THIS custom order's assigned CAD designer — `lib/customsPermissions.js`. It is a real
  // decision, so the guard has to know the name; this list is what stops a new helper reading as "no
  // authorization at all". That is the guard working: it failed the two routes that adopted this helper
  // before it was listed, which is exactly the moment to look rather than to exempt.
  String.raw`requireCustomsCadWrite\(`,
  String.raw`\w*(?:Id|ID)\s*(?:===|!==)\s*session\??\.user`, 'benchRules', 'claimRefusal', 'CRON_SECRET',
  String.raw`webhooks\.constructEvent`, String.raw`verifyWebhookSignature\(`,
].join('|'));
const LOCAL_IMPORT = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;

/** Pure: does this route (with the local modules it imports) decide more than "signed in"? */
export function authorizes(text) {
  return AUTHZ.test(text);
}

function routes(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) routes(full, out);
    else if (entry.name === 'route.js') out.push(full);
  }
  return out;
}

/** The route's own text plus its relative imports (its controller/service next door), one level deep. */
function routeAndLocals(file) {
  const text = fs.readFileSync(file, 'utf8');
  let all = text;
  for (const m of text.matchAll(LOCAL_IMPORT)) {
    const base = path.resolve(path.dirname(file), m[1]);
    for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) { all += `\n${fs.readFileSync(candidate, 'utf8')}`; break; }
    }
  }
  return all;
}

describe('a write route authorizes more than "signed in"', () => {
  const rows = routes(API).map((file) => ({
    rel: path.relative(API, file).split(path.sep).join('/'),
    text: routeAndLocals(file),
  }));

  it('every write route makes an authorization decision, or is exempt with a reason', () => {
    const offenders = rows
      .filter(({ text }) => MUTATES.test(text))
      .filter(({ rel, text }) => !EXEMPT[rel] && !authorizes(text))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('every exemption still exists (a stale entry would hide nothing and mean nothing)', () => {
    const present = new Set(rows.map(({ rel }) => rel));
    expect(Object.keys(EXEMPT).filter((rel) => !present.has(rel))).toEqual([]);
  });

  it('tells a real decision from a bare session check', () => {
    expect(authorizes("const { session } = await requireAuth();\nif (!session) return 401;")).toBe(false);
    expect(authorizes("const session = await auth();\nif (!session?.user) return 401;")).toBe(false);
    expect(authorizes("await requireRepairOps('qualityControl')")).toBe(true);
    expect(authorizes("if (!STAFF_ROLES.includes(session.user.role)) return 403;")).toBe(true);
    expect(authorizes('if (!canManageDesign(session, design)) return 403;')).toBe(true);
    expect(authorizes('if (product.userId !== session.user.userID) return 403;')).toBe(true);
    expect(authorizes('const refusal = await castingRefusal(session, body, loaders);')).toBe(true);
  });
});
