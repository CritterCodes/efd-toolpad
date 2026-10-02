---
target_identity: "file:C:\\Users\\jacob\\dev\\crittercodes\\EngelFineDesign\\web\\efd-admin\\.claude\\worktrees\\heuristic-kare-2b6bdb\\src\\app\\dashboard"
timestamp: 2026-10-02T04-53-38Z
slug: src-app-dashboard
---
# Critique — efd-admin

**Target:** `src/app/dashboard` (+ `src/components`, app shell, five representative screens)
**Provenance:** two isolated sub-agents — A (design review) and B (detector + browser evidence) — neither seeing the other. Not degraded.
**Evidence:** `impeccable detect --json` over `src/app/dashboard src/components`; signed-in browser inspection of a local production build at 320/375/desktop; the live shop at `shop.engelfinedesign.com` as reference.
**Brief:** owner, 2026-10-02 — *"i hate efd admin and love efd-shop."*

---

## The finding

**efd-admin and efd-shop do not share a design system. They share a palette.**

`src/lib/theme.js` and `src/components/facelift/` encode the same tokens the shop uses — and **18 of 134 dashboard pages import facelift**. The other 116 render themed-MUI defaults. The owner is not reacting to a different brand. He is reacting to a different *craft level* on the same brand.

Both assessments reached this independently. The design review found it by eye (the hierarchy collapse below); the detector found it mechanically — **701 findings**, and, more damning, two blind spots proving the real number is higher.

### The one thing that would be a mistake

The design review's closing question is the one that matters, and the mechanical evidence answers it:

> *Is "I love the shop" about visual style, or about the fact that the shop has **one job per screen** and the admin has seven panels per screen?*

The detector says: **no real horizontal overflow at 320 or 375 on any page. Four of five pages have exactly one `h1`. Touch mechanics mostly met. Zero React hydration errors.** The *mechanics* of the mobile brief are met. What is not met is composition. `/dashboard` is **2232px tall on a 900px viewport**, stacking seven panels and **three competing "what to do next" lists** — Getting Started (4), Operational Queues (3), Quick Actions (4). Eleven answers to one question.

So re-skinning the admin to look more like the shop will not move him, because the admin already looks like the shop. The shop composes; the admin accumulates.

---

## Where the two assessments agree

**The hierarchy is flat to the point of not existing.** A shop vendor card carries four tiers in 121px — two families, four sizes, four opacities. The repair detail page carries *one*:

| | font | size | weight | colour |
|---|---|---|---|---|
| `Name:` | Space Grotesk | 15px | 700 | `#FFF` |
| `Dana Detail` | Space Grotesk | 15px | 400 | `#FFF` |

Same family, size, tracking and colour. Only the weight differs. The mono label voice DESIGN.md defines (IBM Plex Mono, 0.625rem, 0.14em, uppercase) is used on **zero** of that page's data, and the `<strong>Label:</strong>` pattern appears **82 times across 19 files**.

At the top of the scale it is worse. The detector confirms the repair detail page has **zero `h1`** — its outline runs `H4 → H6 × 6`. Largest heading 17px, smallest 14px: a **1.21× ratio** for the whole page. The shop's homepage `h1` is **51.84px**. And `Total:` and `$222.31` are both `H6` at 14px — **the most important number on the ticket is smaller than the body text around it.**

**Gold has stopped being a signal.** DESIGN.md: *"One gold per view. If two things are gold, one of them is wrong."* `/dashboard` renders **16 gold elements above the fold**, including a gold side-stripe DESIGN.md explicitly forbids. The shop's `/vendors` uses gold twice. And it is inverted where it counts: **My Bench — the signature bench screen — has no gold in its content at all.** The screen that should say "do this next" doesn't; the dashboard says it sixteen times.

---

## Where the detector caught what the review could not

**The two invisible rows — and why nothing caught them before.** Both assessments found them; only the detector pass explains them.

- `repairDetailView.js:238` → `bgcolor: '#e3f2fd'` with white text = **1.11:1** contrast
- `repairDetailView.js:276` → `bgcolor: '#ffebee'` with white text = **1.05:1**

The blue row reads *"1x 14k sizing stock 3x2mm — Material — Stuller"*. **The line a jeweler needs in order to pull the right metal is the one line on the page he cannot read.** The same hex is at `MoveSummary.js:14`.

Now the part that matters beyond this page. The detector was given minimal repro files and proved two blind spots:

| input | flagged? |
|---|---|
| `sx={{ backgroundColor: '#e3f2fd' }}` | yes |
| `sx={{ bgcolor: '#e3f2fd' }}` | **no** |
| `sx={{ background: '#D1D5DB' }}` | yes |
| `const UI = { bgPanel: '#131416' }` | **no** |

So: **MUI's `bgcolor` shorthand escapes the colour rule entirely — 30 occurrences across 16 files**, including both defects above. And a local palette object escapes too: `bgPanel: '#131416'` / `textHeader: '#D1D5DB'` is copy-pasted into **12 files**, neither value is in DESIGN.md, and scanning `repairsUi.js` returns **zero findings**. The 420 colour findings are a floor, not a count. *The tool meant to catch drift is blind to the exact form the worst drift takes.*

**Other things only the mechanical pass saw:** touch targets fail systematically on *height* — MUI `size="small"` is 35px and `medium` 40–43px against a 44px token — **22 distinct offenders**, with `/dashboard` at **16 of 23**. `repair-detail-demo` fires `GET /api/users?query=views-client → 404` **four times** per load. `my-bench` and `pick-up` have scrollable MUI Tabs with **no scroll-button affordance**, so three lanes are reachable only by an undiscoverable swipe.

## Where the review saw what no detector would

Gold inflation. The three competing next-action lists. **No undo anywhere** — 15 `window.confirm(` sites are the entire safety net, and at the most anxious moment the brand falls away into an OS dialog reading *"localhost:4300 says"*. And the sharpest observation of the run: the single largest piece of type in the entire application, the one `h1` on `/dashboard`, is **"Welcome back, Ada Admin."** A greeting. PRODUCT.md principle 2 says every number must name the decision it supports; the biggest *words* in the app name no decision at all — sitting above seven zeros and *"0 of 4 done."* That is the owner's first impression, every day.

## False positives, named

- **Contrast flags on on-gold text** (`rgb(26,18,5)`, `rgb(0,0,0)` on gold buttons) and **MUI disabled states** — correct by design.
- **MUI Tabs "overflow"** — contained inside `.MuiTabs-scroller`; no page overflow exists. The real defect there is the missing scroll buttons, not the width.
- **Print stylesheets** — Arial, Courier New, `#111`, `#374151` in `invoicePrint.js` and the print routes are *correct*: print stays ink-on-white. But `.impeccable/config.json` whitelists `repairs/pick-up/page.js`, and the print CSS has since moved into `invoicePrint.js`, so **the waiver has gone stale** and the repair-detail print page was never exempted. Worth fixing so the baseline means something.
- `#1a1205` is the computed on-gold text colour used app-wide — systematic, not drift.

## Heuristics (0–4)

| # | | | |
|---|---|---|---|
| 1 | Visibility of system status | **3** | Lane counts and worded status chips are good; `pick-up` renders blank for ~10s and `MuiSkeleton` is themed but unused. |
| 2 | Match to the real world | **2** | "Where People Bail", "Grace Close Selected", "Vote Campaign" in the nav; against that, "Needs Parts" and "Bench Day" are exactly right. |
| 3 | User control and freedom | **1** | No undo anywhere. |
| 4 | Consistency and standards | **0** | Two unreconciled systems. Three dates in one 60px block in two formats. One price column renders `$40`, `$63.67`, `$16` — `item.price` printed raw, defeating the global `tabular-nums`. |
| 5 | Error prevention | **1** | Delete sits in the same pill row as Edit, same size, same treatment, two taps from Print. |
| 6 | Recognition over recall | **2** | `/dashboard/clients` is a bare search box; the shop's `/vendors` offers four visible filter pills. **The admin wrote PRODUCT.md principle 4 and the shop is the one obeying it.** |
| 7 | Flexibility and efficiency | **3** | Scan-first is real on three screens. The strongest heuristic here. |
| 8 | Aesthetic and minimalist design | **1** | 2232px dashboard; two permanent instruction banners on `pick-up`. |
| 9 | Error recovery | **n/a** | Not reachable read-only; not guessed. |
| 10 | Help and documentation | **3** | Over-documents in banners rather than under-documenting. |

## Genuine strengths

1. **`theme.js` is a seriously good 543-line theme**, not boilerplate — a deliberate three-tier shadow ramp, global `tabular-nums` on `td/th/input[type=number]`, `containedPrimary` scoped so semantic buttons keep their fills, `-webkit-autofill` handled so it doesn't punch a white box in the dark ground. **The tokens are not the problem.**
2. **The facelift kit has a point of view.** It replaces the control vocabulary for gloved hands — `ChoiceList` over Select, `Segmented`, `QtyStepper` — with `--fl-tap: 44px` as a token rather than a review note.
3. **Scan-first is designed, not decorative.** My Bench pairs its scan field with a `Then → Claim` disposition so a jeweler queues several tickets and decides once. That is someone watching the actual scene.

## Priority issues

1. **116 of 134 pages don't import facelift.** Make facelift the default, converting by traffic rather than by folder. Every converted page retires `<strong>Label:</strong>`, gains a `PageHeader` (which supplies the missing `h1`) and an `ActionBar`.
2. **Three rows of invisible text** (`repairDetailView.js:238,276`, `MoveSummary.js:14`). Replace with `tint()`. Three lines, a WCAG failure, hides a material spec from a jeweler. **Do this first** even though it ranks second.
3. **The repair detail offers no way to advance the job.** On a `READY FOR WORK` + `RUSH JOB` ticket, the only controls are Print, Edit, Delete — and **the one gold pill is Print**. A jeweler who scans a tag lands here and cannot claim it, start it, or send it to QC. He has no printer at the bench.
4. **Gold inflation on `/dashboard`, gold starvation on My Bench.** Cut 16 to 1; give My Bench its primary back. Collapse three next-action lists into one.
5. **Fix the detector's blind spots before burning down the baseline** — `bgcolor`, bare palette objects, and the stale print waiver. Otherwise the 701 number measures the wrong thing and the burn-down optimises for what the tool can see.
