/**
 * The views check's verdict and contact sheet (docs/GUARDRAILS_PLAN.md, Phase 2).
 *
 * THE RATCHET. e2e/views/baseline.json lists every problem that existed when the check was switched on, as
 * `role|width|page|issue`. A problem not in the baseline fails the check — nothing new gets worse. A baseline
 * problem that has gone away also fails, until the baseline is shrunk (`npm run views -- --update`), so fixed
 * stays fixed. Console errors, failed API calls and hydration mismatches are the exception: they depend on
 * timing, so they are reported (and listed on the contact sheet) but never fail the check either way.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FLAKY = new Set(['console-error', 'api-error', 'hydration-mismatch']);
const isFlaky = (key) => FLAKY.has(key.split('|')[3]);

const allKeys = (results) => results.flatMap((r) => r.issues.map((i) => `${r.role}|${r.width}|${r.path}|${i}`)).sort();
/** The problems the baseline holds: the ones that reproduce on every run. */
export const issueKeys = (results) => allKeys(results).filter((k) => !isFlaky(k));

export function compare(results, baseline) {
  const now = new Set(issueKeys(results));
  const before = new Set(baseline.filter((k) => !isFlaky(k)));
  const roles = new Set(results.map((r) => r.role)); // a role not crawled this run proves nothing
  return {
    added: [...now].filter((k) => !before.has(k)),
    fixed: [...before].filter((k) => !now.has(k) && roles.has(k.split('|')[0])),
    timing: allKeys(results).filter(isFlaky),
    total: now.size,
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** out/index.html: every page per role, desktop beside phone, its problems under it. */
export function contactSheet(results, outDir, { added = [] } = {}) {
  const fresh = new Set(added);
  const byRole = new Map();
  for (const r of results) {
    const pages = byRole.get(r.role) || new Map();
    const p = pages.get(r.path) || { path: r.path, from: r.from };
    p[r.width] = r;
    pages.set(r.path, p);
    byRole.set(r.role, pages);
  }
  const card = (p, role) => {
    const issues = ['desktop', 'phone'].flatMap((w) => (p[w]?.issues || []).map((i) => ({ w, i, isNew: fresh.has(`${role}|${w}|${p.path}|${i}`) })));
    const detail = ['desktop', 'phone'].map((w) => p[w]).filter(Boolean)
      .flatMap((r) => [...r.pageErrors, ...r.failedApis, ...r.consoleErrors].map((m) => `${r.width}: ${m}`));
    return `<article class="${issues.length ? 'bad' : 'ok'}">
  <h3>${esc(p.path)}</h3><p class="from">linked from ${esc(p.from)}${p.desktop?.status ? ` · ${p.desktop.status}` : ''}${p.phone?.overflowBy ? ` · phone: ${esc(p.phone.overflowAt)} cut off by ${p.phone.overflowBy}px` : ''}</p>
  <div class="shots">${['desktop', 'phone'].map((w) => (p[w] ? `<a href="${role}/${p[w].shot}"><img loading="lazy" class="${w}" src="${role}/${p[w].shot}" alt="${esc(p.path)} at ${w} width"></a>` : '')).join('')}</div>
  ${issues.length ? `<ul class="tags">${issues.map((x) => `<li class="${x.isNew ? 'new' : ''}">${x.w} · ${x.i}${x.isNew ? ' · NEW' : ''}</li>`).join('')}</ul>` : ''}
  ${detail.length ? `<details><summary>${detail.length} message(s)</summary><pre>${esc([...new Set(detail)].join('\n'))}</pre></details>` : ''}
</article>`;
  };
  const sections = [...byRole].map(([role, pages]) => {
    const list = [...pages.values()].sort((a, b) => a.path.localeCompare(b.path));
    const bad = list.filter((p) => (p.desktop?.issues.length || 0) + (p.phone?.issues.length || 0)).length;
    return `<section><h2>${esc(role)} <small>${list.length} pages · ${bad} with problems</small></h2><div class="grid">${list.map((p) => card(p, role)).join('')}</div></section>`;
  }).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Views check</title><style>
:root{--bg:#fafaf9;--fg:#1c1917;--muted:#78716c;--line:#e7e5e4;--bad:#b91c1c;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--muted:#a8a29e;--line:#292524;--bad:#f87171;--card:#1c1917}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif}
h2{margin:32px 0 12px}h2 small{color:var(--muted);font-weight:400;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:12px}
article{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;min-width:0}
article.bad{border-color:var(--bad)}h3{margin:0;font:600 13px ui-monospace,monospace;word-break:break-all}
.from{margin:2px 0 8px;color:var(--muted);font-size:12px}.shots{display:flex;gap:8px;align-items:flex-start}
.shots img{display:block;width:100%;border:1px solid var(--line);border-radius:4px}.shots a:first-child{flex:3}.shots a:last-child{flex:1}
.tags{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-wrap:wrap;gap:4px}
.tags li{font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid var(--line)}.tags li.new{border-color:var(--bad);color:var(--bad);font-weight:600}
pre{white-space:pre-wrap;word-break:break-word;font-size:11px;max-height:200px;overflow:auto}
</style></head><body><h1>Views check</h1><p>${results.length / 2} page views per width · ${issueKeys(results).length} problems that reproduce · ${allKeys(results).length - issueKeys(results).length} timing-dependent (console, API, hydration) · ${added.length} new</p>${sections}</body></html>`;
  writeFileSync(join(outDir, 'index.html'), html);
  writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
}
