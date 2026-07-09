# Admin production-pipeline UI audit — 2026-07-09

**Auditor:** design-critic (read-only)
**Standard:** the customs/repairs house UI — the `REPAIRS_UI` design tokens exported from
`src/app/dashboard/repairs/components/repairsUi.js` (dark panels `#0F1115` / `#15181D` / `#171A1F`,
gold accent `#D4AF37`, 1px `#2A2F38` borders, no MUI drop-shadows, uppercase micro-eyebrow chips,
`bgPanel` header block on `sm+` and full-bleed on `xs`).
**Surfaces audited:**
1. Unified Products catalog — `/dashboard/products` (landing + `products/jewelry`,
   `products/gemstones`, `products/awaiting-approval`, plus the `[id]` detail editors for each)
2. Drops — `/dashboard/production/collections`
3. Designs — `/dashboard/production/designs`
4. Pieces — `/dashboard/production/pieces`

**Roll-up:** 7 blockers · 22 major · 15 minor.

The good news: the three Production surfaces (Drops / Designs / Pieces) are the only surfaces in
scope that already follow the house standard — they import `REPAIRS_UI` + `repairsMenuProps` and
match the repairs list pages closely. Every screen under `/dashboard/products/**` is still on the
light MUI default palette (white `Paper`, `#f5f5f5` table heads, `grey.100` upload backdrops,
`primary`/`success`/`error` color words, MUI's default `boxShadow` and `borderRadius`) with zero
token adherence. That's where the pain lives.

Severities follow the standard scale:
- **Blocker** — actively breaks the house standard on a customer-visible/high-traffic surface, or a
  functional gap (broken glyph, `confirm()` in a modern admin, empty detail routes).
- **Major** — a consistent, cross-surface token/component miss that reads as "wrong app."
- **Minor** — polish, DRY, or one-off issues that would slip through casual review.

---

## Surface 1 — Unified Products landing (`/dashboard/products`)

`src/app/dashboard/products/page.js` — one file, 118 lines.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 1.1 | Purple/pink gradient banner tiles (`linear-gradient(135deg, #667eea → #764ba2)`, `#f093fb → #f5576c`) as the primary decoration are the loudest violation of the house standard in the whole admin — customs/repairs use flat `bgPanel` with a gold accent eyebrow, never candy gradients. | **blocker** | `src/app/dashboard/products/page.js:23,31` | Replace `color: 'linear-gradient(...)'` with `REPAIRS_UI.bgTertiary` for the icon block, and tint each icon via `sx={{ color: REPAIRS_UI.accent }}` (or a muted `#64B5F6` for Gemstones vs. `#D4AF37` for Jewelry, matching the Metric-accent pattern already used in the production pages). |
| 1.2 | Whole page uses MUI defaults — light `Card` + `CardContent` + `Button variant="outlined"`, no `REPAIRS_UI` import. On the dark shell this reads as an unstyled placeholder. | **blocker** | `page.js:4,52-95` | Rebuild using the same pattern as `production/collections/page.js:162-238` — `bgPanel` header block with the uppercase eyebrow chip, two `MetricCard`-shaped tiles wired to real counts (total jewelry / total gemstones / pending-approval count), and gold accent buttons. |
| 1.3 | `Typography variant="h4"` + `variant="subtitle1" color="text.secondary"` header is the light-mode Toolpad default; every other list surface in scope uses the token header (`fontSize: 28/36`, `color: REPAIRS_UI.textHeader`) plus an eyebrow. Landing feels disconnected. | major | `page.js:42-47` | Adopt the eyebrow + big-title pattern from `production/collections/page.js:166-174`. |
| 1.4 | `boxShadow: 6` on card hover contradicts the "no drop-shadow" rule — repairs cards use `1px border` only, sometimes `REPAIRS_UI.shadow` on the outer panel, but never MUI elevation on cards. | major | `page.js:59` | Replace with `border-color: REPAIRS_UI.accent` on hover, or a subtle `translateY(-2px)` + border darken. |
| 1.5 | Empty-state ("No Product Categories Available") uses default text color and no dashed border. Repairs uses `Paper` with `border: 1px dashed REPAIRS_UI.border` + `InboxIcon` at `textMuted`. | minor | `page.js:99-115` | Match `production/collections/page.js:210-215` empty-state block. |
| 1.6 | Route `/dashboard/products/awaiting-approval` is not surfaced from this landing at all — admins must know the URL. Given `awaiting-approval` is admin-only queue triage, it belongs as a third tile with a live counter. | major | `page.js:16-33` | Add a third `productTypes` entry gated by `isAdmin`, route to `/dashboard/products/awaiting-approval`, live count via `/api/products?status=pending` or the existing hook. |
| 1.7 | `container spacing={3}` + `md={6} lg={4}` gives orphan whitespace on wide viewports because there are only 2 tiles. | minor | `page.js:49-51` | Once (1.6) is landed, three tiles at `md={4}` fill the row. |

---

## Surface 2 — Products / Jewelry list (`/dashboard/products/jewelry`)

`src/app/dashboard/products/jewelry/page.js`.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 2.1 | Zero `REPAIRS_UI` adoption — light `Paper`, MUI default `Card` with elevation shadow, `bgcolor: 'grey.100'` image placeholder, `color: 'primary.main'` price, `color="success"`/`"default"` chip color words. Standard is dark panels, gold accent, muted chip on `bgTertiary`. | **blocker** | `src/app/dashboard/products/jewelry/page.js:146-321` | Full re-skin: header → `bgPanel` block + eyebrow + gold `New Jewelry` button; filters → `Paper` on `bgPanel` w/ `MenuProps={repairsMenuProps}`; grid cards → `bgCard` + 1px border + hover border-accent. Match `production/designs/page.js` card treatment. |
| 2.2 | `handleDeleteJewelry` uses `window.confirm()` — no themed dialog, blocks the page, ships without any of the accent styling every other flow uses. | **blocker** | `page.js:82-101` | Add a `DeleteConfirmDialog` (Paper on `bgPanel`, red destructive button using MUI's `error` mapped to a `#EF5350` accent variant, gold `Cancel`), or reuse the pattern from `BulkMoveDialog.js`. |
| 2.3 | Grid image cell falls back to `bgcolor: 'grey.100'` + `DiamondIcon color: 'grey.300'` — flashes white on a dark background between load and paint. | major | `page.js:241-256` | Fallback to `REPAIRS_UI.bgTertiary` + `DiamondIcon color: REPAIRS_UI.textMuted`. Same treatment must land on `GemstoneGrid.js` and `ProductTable.js` image cells. |
| 2.4 | `<img>` element with no `loading="lazy"` (edit page uses lazy, list page does not), no `object-fit` fallback for failed URLs. On a 12-item grid at 4-per-row, that's 12 blocking image requests per page load. | major | `page.js:228-239` | Add `loading="lazy"`, wire an `onError` fallback that swaps to the `DiamondIcon` placeholder. Prefer `next/image` for CDN-hosted URLs. |
| 2.5 | Filter `<Select>` has no `MenuProps={repairsMenuProps}` — its dropdown surface renders light MUI paper on top of a dark page. Immediately noticeable. | major | `page.js:183-210` | Pass `MenuProps={repairsMenuProps}` to every `Select` in this file. This is the single most repeated miss in the audit — same pattern applies to gemstones list, awaiting-approval filter, jewelry editor `Type/Availability/Classification` selects. |
| 2.6 | Sort-order is toggled but the `sortOrder` toggle control is **not rendered anywhere** — sort dir is stuck on whatever the default is, dead state. | major | `page.js:53,121` | Either render an IconButton next to the sort Select (`ArrowUpward`/`ArrowDownward` toggling `sortOrder`), or drop `sortOrder` and inline `desc`. |
| 2.7 | Status chip uses `color="success"` when active, `color="default"` otherwise — inconsistent with the STATUS_COLOR object used in production pages (e.g. `production/pieces/page.js:19`). No shared palette. | major | `page.js:257-262` | Extract a shared `PRODUCT_STATUS_COLOR` map (like production's) and use `Chip sx={{ backgroundColor: `${color}22`, color, textTransform: 'capitalize' }}` for parity. |
| 2.8 | Two edit affordances stacked (View button + Edit IconButton) that route to the same place. Confusing; also both trigger stopPropagation-free clicks that would fire the row action if it existed. | minor | `page.js:293-315` | Drop the redundant `<Button startIcon={<VisibilityIcon/>}>View</Button>` — make the whole card clickable via `CardActionArea` (as production does at `collections/page.js:44`), keep the Delete icon in a corner. |
| 2.9 | No dirty-state / no bulk-select / no image-count indicator on card. Compare with repairs `RepairCard` which shows selection state, status pill, tech, thumbnail. | minor | `page.js:225-317` | Nice-to-have: mirror `RepairCard.js` pattern for bulk-actions when parity with repairs bulk-move ships. |
| 2.10 | Pagination color=`primary` renders MUI blue; house uses gold accent. | minor | `page.js:326-331` | `sx={{ '& .Mui-selected': { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A' } }}`. |
| 2.11 | Loading state is a bare `<CircularProgress />` with default primary color — everywhere else in the audit surfaces uses `sx={{ color: REPAIRS_UI.accent }}`. Inconsistent. | minor | `page.js:141` | `sx={{ color: REPAIRS_UI.accent }}`. Applies to `gemstones/page.js:87`, `awaiting-approval/page.js:103`, `jewelry/[id]/page.js:34`, `gemstones/[id]/page.js:86` — five places, same fix. |
| 2.12 | Filters `Paper sx={{ p: 2, mb: 3 }}` — no border, no `bgPanel`, so it disappears on the dark shell. | major | `page.js:168-212` | `sx={{ p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}` — mirror `production/designs/page.js:275`. |

---

## Surface 3 — Products / Gemstones list (`/dashboard/products/gemstones`)

`src/app/dashboard/products/gemstones/page.js` (+ shared `GemstoneGrid` at
`src/components/products/gemstones/GemstoneGrid.js`).

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 3.1 | Only two stat cards ("Total Gemstones", "Available") vs. jewelry/awaiting-approval which use four — visually orphaned metric row, MUI defaults, no icon block, no accent. | major | `src/app/dashboard/products/gemstones/page.js:31-38` | Replace with `MetricCard` mirror from `production/collections/page.js:23-37`. Add `Draft`, `Sold` to fill the row of four. |
| 3.2 | `<GemstoneGrid>` renders card content only — no images, no chips, no price. Repairs and production always show a thumbnail + status pill + one metric. Gemstones is *the* image-first product. | **blocker** | `src/components/products/gemstones/GemstoneGrid.js:14-25` | Rebuild card: image at top (like jewelry list, `pt: 100%` square), species subtitle, retail price, status chip. |
| 3.3 | Loading state is literally the string `<Typography>Loading...</Typography>` — no spinner, no skeleton. | major | `GemstoneGrid.js:8` | Replace with a `CircularProgress` gated on `isLoading` OR render 8 skeleton cards using `<Skeleton variant="rectangular">` in `bgCard` styling. |
| 3.4 | Empty state is a bare `<Typography>` — no dashed panel, no icon. | minor | `GemstoneGrid.js:9` | Match the dashed `Paper` empty-state pattern from `production/collections/page.js:210-215`. |
| 3.5 | Search `<TextField>` has no `startAdornment` icon, no `Paper` container styling on the surrounding filter panel. | minor | `page.js:40-47` | Add `InputAdornment` + `SearchIcon` and adopt the `bgPanel` `Paper` treatment used elsewhere. |
| 3.6 | No status filter, no sort control — grid renders in whatever server order the API returns. Every peer surface (jewelry, awaiting-approval, all three production pages) has both. | major | `page.js:14-18` | Add `status` filter + a sort (title / date / carat / price) mirroring the shape of `jewelry/page.js`. |
| 3.7 | `sx={{ p: 3 }}` on the outer `Box` gives no responsive padding — jewelry & production pages step from `p: 0.5` on `xs` up to `p: 3` on `md`. Reads as a wall of un-breathing content on mobile. | major | `page.js:20` | `sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}` and remove hard-coded `mb: 3` in favor of the header block pattern. |
| 3.8 | Uses `Button variant="contained"` default (MUI blue) instead of `REPAIRS_UI.accent`. | major | `page.js:24-26` | `sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600 }}`. |
| 3.9 | `handleDeleteProduct` (from the shared hook `useGemstoneManagement`) — check whether it also uses `confirm()`; if so, same as (2.2). | major | `src/hooks/products/gemstones/useGemstoneManagement` (verify) | Route delete through a themed dialog. |

---

## Surface 4 — Products / Awaiting-Approval (`/dashboard/products/awaiting-approval`)

Files: `page.js`, `components/StatsCards.js`, `components/ProductFilters.js`,
`components/ProductTable.js`, `components/ProductDetailDialog.js`, `components/ApprovalDialog.js`.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 4.1 | Header title reads `í¾ Products Awaiting Approval` — the leading two glyphs are a **broken emoji** (mojibake, likely a corrupted `⏳` or `📦`). Ships to admin browsers as literal `í¾`. | **blocker** | `src/app/dashboard/products/awaiting-approval/page.js:71` | Replace with an inline MUI icon (e.g. `<HourglassEmptyIcon sx={{ color: REPAIRS_UI.accent }} />`) inside the eyebrow chip. Don't reintroduce emoji in string literals — this is how they rot. |
| 4.2 | `<Container maxWidth="xl">` inside a dashboard shell that already constrains width — content is boxed twice, doesn't reach the full-bleed edges other list pages use on mobile. | major | `page.js:68` | Drop `Container`; wrap in `<Box sx={{ pb: 6 }}>` per the pattern in `production/*/page.js:162`. |
| 4.3 | Zero `REPAIRS_UI` adoption — `StatsCards` is four white `Card`s with no icons, `ProductFilters` is a white `Paper`, `ProductTable` uses a `#f5f5f5` head. | **blocker** | `StatsCards.js:6-56`, `ProductFilters.js:25`, `ProductTable.js:40` | Re-skin StatsCards to `MetricCard` shape; ProductFilters to the dark `bgPanel` `Paper`; ProductTable head to `bgPanel` background + `textSecondary` cells + `border-bottom: 1px solid REPAIRS_UI.border`. |
| 4.4 | `TableHead sx={{ backgroundColor: '#f5f5f5' }}` — hard-coded off-white on the dark shell. | **blocker** | `ProductTable.js:40` | `backgroundColor: REPAIRS_UI.bgTertiary`. Also colorize row hover: `& tr:hover { backgroundColor: REPAIRS_UI.bgPanel }`. |
| 4.5 | Emoji in `ApprovalDialog` title ("✅ Approve & Publish Product", "❌ Reject Product") — inconsistent with the icon-only pattern used everywhere else. Also renders differently across OS/browsers. | major | `ApprovalDialog.js:26` | Replace with MUI `<CheckCircleIcon />` / `<CancelIcon />` at `REPAIRS_UI.accent`, then a plain string title. |
| 4.6 | `ApprovalDialog` and `ProductDetailDialog` render on default MUI `Paper` — light background on top of the dark shell. Explicit contrast miss on the most-used admin flow. | **blocker** | `ApprovalDialog.js:24`, `ProductDetailDialog.js:25` | Both need `PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}` — reuse the pattern from `production/collections/page.js:88-89`. |
| 4.7 | Chip in ProductDetailDialog has `fullWidth` prop passed to `<Chip>` which MUI doesn't support on Chip — silent no-op. | minor | `ProductDetailDialog.js:101` | Wrap in a `Stack` and use `Chip sx={{ width: '100%' }}` if that's really the intent (better: swap to an `Alert severity="success"`). |
| 4.8 | Price column uses `color: 'primary.main'` — MUI blue on dark. | minor | `ProductTable.js:82-84` | `color: REPAIRS_UI.textHeader` + `fontWeight: 600`, prices don't need to shout. |
| 4.9 | Table has no image fallback if `product.images?.[0]?.url` is missing — cell just collapses. | minor | `ProductTable.js:55-67` | Render a 50×50 `bgTertiary` box with a muted icon (same fallback as jewelry list). |
| 4.10 | Two separate confirmations flow through `ApprovalDialog` for the same visible-to-artisan action (approve+publish vs reject) with different validation rules (`approvalNotes` required only for reject). Fine functionally, but the required-vs-optional label is a caption that could be missed. | minor | `ApprovalDialog.js:41-46` | Show a small `required` chip on the field when in reject mode, and disable the primary button with a helper text explaining what's missing (currently just gets disabled silently). |
| 4.11 | The whole surface has no error boundary — if the API returns 500 to `useAwaitingApproval`, the `error` string is shown but the queue itself vanishes. | minor | `page.js:78-82` | Show error as an alert *above* the last known table snapshot, so the admin doesn't lose scroll position. |

---

## Surface 5 — Jewelry editor (`/dashboard/products/jewelry/[id]`)

Files: `page.js`, `components/JewelryBasicInfo.js`, `components/JewelryMaterials.js`,
`components/JewelryMedia.js`, `components/JewelryPricing.js`, `components/JewelryPublishing.js`.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 5.1 | Every section is a light MUI `Paper` with default shadow and `4px` radius — no dark panel, no border. Editor reads as an alien surface embedded in the dark shell. | **blocker** | `JewelryBasicInfo.js:9`, `JewelryMaterials.js:177`, `JewelryMedia.js:62,114`, `JewelryPricing.js:38`, `JewelryPublishing.js:9` | Every top-level `Paper`/`Card` should be styled with the `bgPanel` + 1px border + `borderRadius: 2` + `boxShadow: 'none'` pattern. Create a shared `<PanelCard>` wrapper in `src/app/dashboard/components/` and swap all six imports. |
| 5.2 | `JewelryMedia` uploader tile fallback: `bgcolor: 'grey.100'` — white block for the STL/GLB filename row on a dark editor. | **blocker** | `JewelryMedia.js:24` | `bgcolor: REPAIRS_UI.bgTertiary`, filename `color: REPAIRS_UI.textPrimary`, delete IconButton `color: REPAIRS_UI.textSecondary` with red hover. |
| 5.3 | `JewelryPricing` card border hard-coded to `#90caf9` (Material blue 200) — the only place in the audit that picks a random blue for emphasis. | major | `JewelryPricing.js:38` | `border: `1px solid ${REPAIRS_UI.border}`` and, if you want to signal "auto-calc", tint the icon with `REPAIRS_UI.accent`. |
| 5.4 | Pricing-preview mini-cards use `bgcolor: '#f8f9fa'` — off-white boxes on a dark editor. | **blocker** | `JewelryPricing.js:108` | `bgcolor: REPAIRS_UI.bgTertiary`, subtitle color `REPAIRS_UI.textHeader`, labels `REPAIRS_UI.textSecondary`. |
| 5.5 | `JewelryMaterials` list items styled `bgcolor: 'background.paper'` + `border: '1px solid #eee'` — light rows on dark. | major | `JewelryMaterials.js:91-97,148-155` | `bgcolor: REPAIRS_UI.bgCard`, `border: 1px solid ${REPAIRS_UI.border}`. |
| 5.6 | Every `<Select>` in the editor (`JewelryBasicInfo` Type, `JewelryPublishing` Classification / Availability / Status, `JewelryMaterials` Metal Type / Purity, `JewelryPricing`'s indirect ones) is missing `MenuProps={repairsMenuProps}` — dropdowns pop as white surfaces on dark. | major | `JewelryBasicInfo.js:21`, `JewelryPublishing.js:14,24,34`, `JewelryMaterials.js:44,58` | Add `MenuProps={repairsMenuProps}` to each. |
| 5.7 | Save/Publish buttons at top of `page.js` use MUI defaults (`variant="outlined"` no override, `variant="contained"` primary blue). | major | `src/app/dashboard/products/jewelry/[id]/page.js:71-84` | Gold accent Publish, ghost Draft (`color: textPrimary, borderColor: border, backgroundColor: bgCard`). |
| 5.8 | Breadcrumbs use inherit color — links are barely visible on the dark shell (`Link color="inherit"` → resolves against a dark parent). | major | `page.js:60-64` | `<Link sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }}>`, current-page `Typography color: REPAIRS_UI.textHeader`. |
| 5.9 | `<Alert severity="error">` inherits MUI defaults — pale-red text on white background, sits atop a dark shell. | minor | `page.js:88` | `sx={{ backgroundColor: '#4A1D1D', color: '#F8BBBB', border: '1px solid #7A2E2E' }}` (or reuse the snackbar Alert styling from `production/collections/page.js:234`). |
| 5.10 | `JewelryPricing` guard returns `null` if `!stlFile` — a form field group vanishing with no explanation. Design surprise for anyone editing a piece without a CAD file. | minor | `JewelryPricing.js:35` | Show an inline dashed-panel placeholder: "Upload an STL to calculate dynamic pricing." Same shape as production empty states. |
| 5.11 | No dirty-state / unsaved-changes detection — user can nav away mid-edit with no warning. Design-critical for a 5-section editor. | minor | `page.js:26-134` | Show a small `Unsaved changes` gold badge in the header once any input changes; wire a `useBeforeUnload`. |
| 5.12 | `<img src={URL.createObjectURL(file)}>` for new-uploads is never `URL.revokeObjectURL`d — memory leak on repeated uploads. Not design, but worth flagging. | minor | `JewelryMedia.js:99` | `useEffect(() => () => URL.revokeObjectURL(url), [url])` on each preview. |
| 5.13 | `ImageList` `rowHeight` is a fixed pixel — doesn't scale with density. Small screens get cramped 132px tiles that don't reveal what's in them. | minor | `JewelryMedia.js:58,77` | Consider `rowHeight="auto"` + aspect-ratio wrappers on children. |

---

## Surface 6 — Gemstone editor (`/dashboard/products/gemstones/[id]`)

Files: `page.js`, `components/GemstoneDetails.js`, `components/GemstonePricing.js`.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 6.1 | Same as (5.1) — bare MUI `Card` sections on a dark shell. Also `page.js` header row uses `Breadcrumbs` + `IconButton` in default palette, matching jewelry editor's misses. | major | `src/app/dashboard/products/gemstones/[id]/page.js:90-110`, `GemstoneDetails.js:21`, `GemstonePricing.js:18` | Same fix — `PanelCard` wrapper, `bgPanel` + 1px border. |
| 6.2 | The editor has **no media section** — gemstones have no way to upload/curate images or `.glb`/`.stl` files from this editor, only through the awaiting-approval flow. Massive functional/UX gap given every gemstone card is expected to be image-first. | **blocker** | `page.js:113-121` | Add a `<GemstoneMedia>` component mirroring `JewelryMedia` (images + optional GLB). Note this is beyond a re-skin — it's a genuine missing feature. |
| 6.3 | No linked-artisan / provenance / certification-upload panel — the `certification` field is a bare TextField even though house standard for jewelry has full uploader components. | major | `GemstonePricing.js:26` | Convert `certification` to an uploader (GIA/AGS PDF), display file badge. |
| 6.4 | `Save Draft` / `Publish` buttons in header — default MUI, same as (5.7). | major | `page.js:106-109` | Gold accent Publish. |
| 6.5 | Origin type `<TextField select>` doesn't pass `SelectProps={{ MenuProps: repairsMenuProps }}` — dropdown pops light. | major | `GemstoneDetails.js:29-38` | Add `SelectProps={{ MenuProps: repairsMenuProps }}`. Same fix for the Status select in `GemstonePricing.js:27`. |
| 6.6 | Redirect on save (`router.push('/dashboard/products/gemstones')` — even on non-new edits — kills the "continue editing" workflow. Users can't keep tweaking after Save Draft. | minor | `page.js:78` | On non-new saves, refresh the current page's data and show a snackbar. Only redirect on `isNew`. |
| 6.7 | Validation is `setError('Title and species are required.')` — a single string; no field-level highlighting. | minor | `page.js:67` | Set both `title`/`species` MUI `error` + `helperText` when empty on submit. |
| 6.8 | Error alert same as (5.9). | minor | `page.js:112` | Same fix. |

---

## Surface 7 — Drops / Collections (`/dashboard/production/collections`)

Single file `src/app/dashboard/production/collections/page.js`. **This is the most house-standard-adherent surface in scope.**

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 7.1 | "Manage" action is a placeholder that just fires a snackbar — no actual detail page for a collection exists (`onManage` at line 160). Every collection card is functionally a dead end until M2-T1 pt 5 ships. Blocks the drop-management workflow. | **blocker** | `collections/page.js:160-161` | Ship the detail route `/dashboard/production/collections/[collectionID]/page.js`. The comment already acknowledges this is held for owner design steer (#66/#67) — but for the audit, it's a visible gap. |
| 7.2 | `MetricCard` component is duplicated verbatim across `collections`, `designs`, and `pieces` (three copies, ~14 lines each). | major | `collections/page.js:23-37`, `designs/page.js:32-46`, `pieces/page.js:22-36` | Extract to `src/app/dashboard/production/components/MetricCard.js` (or into `repairsUi.js`) and import in all three. |
| 7.3 | Header block on `xs` collapses `backgroundColor`/`border` to transparent, but the eyebrow + title still render — no hint of the panel, which reads as unstyled on mobile. | minor | `collections/page.js:164` | Consider a subtle `borderBottom: 1px solid REPAIRS_UI.border` on `xs` to still frame the section. |
| 7.4 | Card `ownerType` chip is a plain outlined chip — no icon to indicate EFD vs artisan-owned; visually identical to the status chip next to it. | minor | `collections/page.js:47` | Add an `AccountBalanceIcon` / `PersonIcon` prefix, or move ownerType out of the chip row into the card body as an author line. |
| 7.5 | `STATUS_COLOR` inlined per file, and the shapes differ between the three production files. `scheduled` gets `#FFB74D` here but not defined elsewhere. | minor | `collections/page.js:20` (compare `designs/page.js:29`, `pieces/page.js:19`) | Extract to `src/constants/productionStatusColors.js` for a single source. |
| 7.6 | Card has no thumbnail / hero image; drops are marketing artifacts — a member-count number is not a preview of "what am I about to release?" | major | `collections/page.js:39-60` | Show up to 3 stacked/mosaic member thumbnails at the top of the card (fall through the collection's `members[]` to the first product's `images[0]`). Kill-feature for the drop UX. |
| 7.7 | Loading state uses `CircularProgress`, empty uses dashed panel — no skeleton grid. On slow networks the page shows nothing then everything at once. | minor | `collections/page.js:207-215` | Consider rendering 6 skeleton CollectionCards during load. |
| 7.8 | The `New Collection` header button doesn't have an `aria-label` beyond the visible text — the icon-only Snackbar close IconButton doesn't either. | minor | `collections/page.js:176`, `234` | Sweep the file for `aria-label` on icon-only controls. |
| 7.9 | `filtered` reads `c.status || 'draft'` while `metrics.scheduled` reads `c.status === 'scheduled'` directly. If backend returns null status, defaults diverge. | minor | `collections/page.js:145,153` | Normalize once at the top of the memo: `const status = c.status || 'draft';`. |

---

## Surface 8 — Designs (`/dashboard/production/designs`)

Single file `src/app/dashboard/production/designs/page.js`.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 8.1 | No detail route — clicking a `DesignCard` does nothing (only the "Upload CAD/STL" `<label>` inside the card is interactive). Discovery: "How do I edit this design's metadata after creation?" Answer: you can't from the admin. | **blocker** | `designs/page.js:70-91` | Add `/dashboard/production/designs/[designID]/page.js` with the full design detail — metadata, `cadFiles[]` viewer (GLB preview), routing, BOM, live-metal estimate breakdown. |
| 8.2 | The CAD upload button lives inline on the card — clicking it fires the file dialog with no confirmation, and there's no visible progress beyond changing the label to "Uploading…". Users routinely upload the wrong file to the wrong design because there's no target confirmation. | major | `designs/page.js:82-86` | Wrap upload in a dialog that shows the design name + expected file types + drag-and-drop zone. Reuse the pattern from `viewers/GlbReviewModal.jsx`. |
| 8.3 | `Autocomplete` for gemstone-link (create dialog) — the `PaperComponent` slot inherits the light default. Dropdown list pops white on dark. | major | `designs/page.js:178-190` | Pass `slotProps={{ paper: { sx: { backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}` } } }}`. |
| 8.4 | "Preview estimate" button is `variant="outlined"` with `borderColor: REPAIRS_UI.border` — reads as disabled/muted next to Cancel/Create. Actual affordance is confusing. | minor | `designs/page.js:192-195` | Bump to `borderColor: REPAIRS_UI.accent` + `color: REPAIRS_UI.accent` when the field has a numeric value, muted only while disabled. |
| 8.5 | `METAL_KEYS` inlined at the top of this file, but the underlying constants live in `src/constants/metalTypes.js`. Drift risk. | minor | `designs/page.js:20-27` | Import from the constants module. |
| 8.6 | No image / render thumbnail on the design card — for CAD-linked designs, the GLB should preview. | major | `designs/page.js:70-91` | Add a hero preview area at the top of the card: GLB thumbnail (via a still frame) or the first `renders[]` image, with a fallback `DesignServicesIcon` on `bgTertiary`. |
| 8.7 | Same DRY / status-color / mobile-header findings as Surface 7 (7.2, 7.3, 7.5, 7.7, 7.8). | minor | (see 7.x) | Batch with the collections fix. |
| 8.8 | The description clamp `-webkit-box`, `WebkitLineClamp: 2` is a browser-only property that doesn't linter-warn — fine now, but the fallback for non-webkit is unclipped text. | minor | `designs/page.js:78` | Add `overflow: 'hidden'; text-overflow: 'ellipsis'; display: '-webkit-box'` + a `maxHeight` for graceful degradation. |
| 8.9 | No filter for "linked to collection X" — a designer looking at "which designs are in the June drop" has to leave the surface. | minor | `designs/page.js:279-284` | Add a Collection filter to the filter row. |

---

## Surface 9 — Pieces (`/dashboard/production/pieces`)

Single file `src/app/dashboard/production/pieces/page.js`.

### Findings

| # | Issue | Sev | File · line | Recommended fix |
|---|---|---|---|---|
| 9.1 | No detail route — clicking a piece card does nothing. Pieces have work orders, labor logs, COGS breakdown — none of which is reachable from this admin surface. | **blocker** | `pieces/page.js:38-59` | Add `/dashboard/production/pieces/[pieceID]/page.js` with tabs: Details, Work Orders, Labor, COGS. |
| 9.2 | The `New Piece` dialog for "From design" mode requires the user to **type a Design ID by hand** — no picker, no autocomplete. On the same page bundle, the designs endpoint is trivially fetchable. | major | `pieces/page.js:98-101` | Swap the plain `TextField` for an `Autocomplete` querying `/api/production/designs` — same shape as the gemstone picker in `CreateDesignDialog`. |
| 9.3 | Card shows SKU or a truncated `pieceID.slice(0, 8)` — for handmade pieces without a SKU the identifier is meaningless. No product title, no owning artisan, no gem-link. | major | `pieces/page.js:48` | Show design name (if `designID`) or a human title; add artisan avatar/name below; show gemstone linkage chip when set. |
| 9.4 | ToggleButtonGroup in the create dialog uses hand-rolled `sx` for selected color — no border-color change, no background. Selection state is only a color diff on the label text. | minor | `pieces/page.js:94-97` | Add `'&.Mui-selected': { backgroundColor: REPAIRS_UI.bgTertiary, borderColor: REPAIRS_UI.accent }`. |
| 9.5 | Total COGS metric formats via `money()` but the metric card renders that string with a large-number font — 12-digit strings wrap ugly on a compact metric card. | minor | `pieces/page.js:180` | Right-align + `fontSize` shrink for the `Total COGS` card only, or `Intl.NumberFormat('en-US', { notation: 'compact' })`. |
| 9.6 | No image on the piece card — physical pieces should have a hero (either progress photo from bench or final QC photo). | major | `pieces/page.js:38-59` | Add hero image slot, fallback to `PrecisionManufacturingIcon` on `bgTertiary`. |
| 9.7 | Status filter has 11 values (`STATUS_OPTIONS`) but the color map covers only 6 — half the selectable statuses render on the same `textMuted` grey. | minor | `pieces/page.js:18-19` | Extend `STATUS_COLOR` to cover `casting_ordered`, `reserved`, `scrapped`, `returned` explicitly. |
| 9.8 | Same DRY / mobile-header / a11y findings as Surface 7. | minor | (see 7.x) | Batch with the collections fix. |

---

## Cross-cutting findings (apply to every surface)

| # | Issue | Sev | Recommended fix |
|---|---|---|---|
| X.1 | **No shared design-system primitives.** `MetricCard`, page header (`bgPanel` + eyebrow + big title), empty-state, filters row, `Paper` wrapper — each are re-implemented 3–5 times across the audited files. Any one-off tweak drifts fast (already visible in the STATUS_COLOR divergence and MenuProps omissions). | **blocker** | Extract to `src/app/dashboard/components/`: `<PanelCard>`, `<MetricCard>`, `<PageHeader eyebrow title description action />`, `<EmptyPanel icon title />`, `<FiltersBar>`. Migrate production pages first (they're the closest), then port products/* to use them — that's what closes ~30% of the findings in one pass. |
| X.2 | **Two design vocabularies coexist.** Production pages use `REPAIRS_UI` tokens; products/* pages use MUI defaults. There's no visual bridge between them, so navigating from `/dashboard/products` (light) → `/dashboard/production/collections` (dark) feels like leaving the app. | **blocker** | Same fix as X.1 — the shared primitives collapse the surfaces onto one vocabulary. |
| X.3 | **`MenuProps={repairsMenuProps}` inconsistency.** ~10 Select components across the audited files lack it — dropdowns pop white. Search terms `<Select` + not `MenuProps` finds them in one grep. | major | Sweep + apply. Consider wrapping in a `<DarkSelect>` HOC so future additions can't miss it. |
| X.4 | **`confirm()` / `alert()` usage in modern admin.** At minimum in `jewelry/page.js:83` (delete) and likely in `useGemstoneManagement` too — worth grepping. | **blocker** (delete flow is destructive) | Themed confirm dialog, reused across all destructive actions. |
| X.5 | **No skeleton loading states.** Every surface either shows a spinner or "Loading..." string. Compare with the customs/repairs list which has skeleton cards. | minor | Introduce 6-card skeleton for grid pages, 8-row skeleton for table pages. |
| X.6 | **`<CircularProgress />` color inconsistency.** 5 places use default primary, ~5 use `REPAIRS_UI.accent`. | minor | Global sweep. |
| X.7 | **Image handling.** No `next/image` usage, no lazy-load fallback, no error-state placeholder unified across surfaces. Jewelry list uses `<img>` with an inline fallback; production surfaces have no image at all; awaiting-approval `<img>` cell silently collapses on missing URL. | major | Extract a `<ProductThumbnail src fallbackIcon size>` component; use it everywhere. |
| X.8 | **Accessibility.** Icon-only buttons across gemstone list, awaiting-approval table, jewelry list all lack `aria-label`. Snackbars are `role="status"` by default, but there's no live-region for filter changes. | minor | Sweep + label. |
| X.9 | **Mobile responsiveness.** Only the three production pages step padding responsively (`p: { xs: 0.5, sm: 2.5, md: 3 }`). Gemstones list, awaiting-approval, products landing all use `p: 3` or `Container maxWidth`. On phones, the products screens sit in a boxed island. | major | Standardize outer padding responsiveness once shared primitives land. |
| X.10 | **Dirty-state / unsaved-changes.** No editor in scope guards against nav-away with unsaved edits. | minor | Wire a shared `useUnsavedChanges` hook, integrate at the editor page level. |
| X.11 | **Border-radius drift.** Products/* uses default `1` (4px). Production/* uses `2` (8px) on cards, `3` (12px) on panels. Repairs uses `3` on panels. Two vocabularies. | minor | Standardize as `PanelCard` → `borderRadius: 2`, `PageHeader` panel → `borderRadius: 3`. |
| X.12 | **Snackbar Alert styling** — production files re-inline the `sx={{ backgroundColor: REPAIRS_UI.bgCard, ... }}` on every Alert; products/* don't style Alert at all. | minor | Extract `<HouseSnackbar>` wrapper. |

---

## Suggested remediation order

1. **Kill the mojibake + `confirm()` deletes + light-mode dialogs on approvals** — blockers 4.1, 2.2, 4.6, 4.4. Same-day fixes.
2. **Extract shared primitives** (`PanelCard`, `MetricCard`, `PageHeader`, `EmptyPanel`) — one PR that also converts the three production pages to consume them. Sets the pattern.
3. **Re-skin `/dashboard/products/**` onto shared primitives** — one PR per surface (Landing, Jewelry list, Gemstones list, Awaiting-approval, Jewelry editor, Gemstone editor). Bulk of the audit clears in this phase.
4. **Add missing detail routes** (`collections/[id]`, `designs/[id]`, `pieces/[id]`) — biggest functional gaps; product design steer likely needed.
5. **Image handling + skeletons + a11y sweep** — polish pass, chained through the shared components.

---

**End of report.** Report prepared read-only; no component/app code was modified.
