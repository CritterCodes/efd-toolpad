import dynamic from 'next/dynamic';
import { composeMetalKey } from '@/services/production/variantMetal';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { Typography } from '@mui/material';
// Read-only WebGL product viewer (client-only — must be dynamically imported, ssr:false).
export const JewelryViewer = dynamic(() => import('@crittercodes/refrakt').then((m) => m.JewelryViewer), { ssr: false });

export const DESIGN_STATUSES = ['draft', 'cad_requested', 'cad_in_progress', 'cad_qc', 'ready', 'retired'];
export const PRODUCTION_METHODS = ['cad_cast', 'handmade'];
export const EDITION_TYPES = [
  { value: 'one_of_one', label: 'One of One' },
  { value: 'limited', label: 'Limited Release' },
  { value: 'unlimited', label: 'No Limit (unlimited)' },
];
export const CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'pendant', 'brooch', 'other'];

export const DISCIPLINE_OPTS = [
  { value: 'bench_jewelry', label: 'Bench' }, { value: 'cad', label: 'CAD' },
  { value: 'engraving', label: 'Engraving' }, { value: 'gem_cutting', label: 'Gem Cutting' },
];
// Map a task-catalog category to a bench discipline (mirrors the customs quote builder).
export function categoryToDiscipline(category = '') {
  const c = String(category).toLowerCase();
  if (/cad|design/.test(c)) return 'cad';
  if (/engrav/.test(c)) return 'engraving';
  if (/gem|cut|lapidar|ston.*cut/.test(c)) return 'gem_cutting';
  return 'bench_jewelry';
}

/**
 * Next sequence number for a design's variants, derived from the variants that ALREADY EXIST.
 *
 * This used to be a module-level `let variantSeq = 0`, which reset to 0 on every page load — so the
 * first variant added after a reload was numbered 1 again and got the SAME auto-SKU as an existing one
 * (owner report: "it gives it the same name as the last variant"). Save then rejected it for duplicate
 * SKUs, or the row simply looked like a copy. Deriving from the data can't drift with page lifecycle.
 * PURE.
 */
export function nextVariantSeq(variants = []) {
  const used = (variants || [])
    .map((v) => String(v?.sku || '').match(/-(\d+)$/)?.[1])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return (used.length ? Math.max(...used) : 0) + 1;
}

export function newVariantForm() {
  return {
    // Random suffix, not a counter: two adds inside the same millisecond would otherwise collide.
    variantId: `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sku: '', label: '',
    // Finish comes from REFRAKT (studio-driven); karat is a separate spec; metalKey is
    // composed from both for the pricing estimate engine.
    finish: 'gold', karat: '14', metalKey: composeMetalKey('gold', '14'), viewerConfig: null,
    ringSize: '', sizingMin: '', sizingMax: '',
    gemstones: [], // [{ slot, role, qty, stoneSkuId, stullerSku, label, unitCost, source }]
    retailPrice: '', leadTimeDays: '', active: true,
    // Gemstone-design variants: a SPECIES the cut is offered in (capability, not inventory).
    // colors = quality buckets, each with size-TIERED $/ct (rates non-linear in size).
    gem: { species: '', availability: 'purchase', caratMin: '', caratMax: '', creation: 'natural', clarity: '', treatment: '', cutLaborCost: '', lotQty: '', maxPieces: '', yield: '', sg: '', colors: [] },
  };
}
// Resolve a color bucket's rough $/ct for a carat — STRICT: null beyond the last tier (that's a
// special request, never a silent fallback to the big-stone-cheap rate). Mirrors gemTierRate in
// services/production/designCost.js.
export function tierRate(rates = [], carat) {
  const tiers = rates.map((t) => ({ upToCt: Number(t.upToCt) || 0, ratePerCarat: Number(t.ratePerCarat) || 0 })).filter((t) => t.upToCt > 0 && t.ratePerCarat > 0).sort((a, b) => a.upToCt - b.upToCt);
  if (!tiers.length) return null;
  const c = Number(carat) || 0;
  const tier = tiers.find((t) => c <= t.upToCt);
  return tier ? tier.ratePerCarat : null;
}
// Finished carats ÷ rough carats. Cutter's floor: ~25% (1ct finished needs 4ct rough).
export const GEM_YIELD_DEFAULT = 0.25;
export const gemYield = (g) => (Number(g?.yield) > 0 && Number(g?.yield) <= 1 ? Number(g.yield) : GEM_YIELD_DEFAULT);

export const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted, cad_requested: '#FFB74D', cad_in_progress: '#64B5F6',
  cad_qc: '#FFB74D', ready: '#66BB6A', retired: REPAIRS_UI.textMuted,
};

// How the artisan/admin applies the design fee to each piece's cost recipe.
export const DESIGN_FEE_MODES = [
  { value: 'flat', label: 'Full fee per piece' },
  { value: 'split', label: 'Split across the edition' },
  { value: 'waived', label: 'Waived' },
];

export const panelSx = { p: { xs: 2, md: 2.5 }, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
export const cap = (s) => String(s || '').replace(/_/g, ' ');
export const money = (x) => `$${(Number(x) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Physical size label from measured mm — one number for round/square, L×W for fancy.
export const stoneSizeLabel = ({ l, w } = {}) => {
  if (l == null || w == null) return '';
  return Math.abs(l - w) < 0.26 ? `${w}mm` : `${l}×${w}mm`;
};
export const GEM_ROLES = [{ value: 'center', label: 'Center' }, { value: 'accent', label: 'Accent' }];
// Stone creation is PER STONE (a variant/piece can mix natural + lab) — binary, no simulant.
export const CREATION_OPTS = [{ value: 'natural', label: 'Natural' }, { value: 'lab', label: 'Lab' }];



export const artisanLabel = (a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.userID || '';
export const artisanId = (a) => a.userID || a._id?.toString();

export function PanelTitle({ children }) {
  return <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>{children}</Typography>;
}

// Flatten a design doc into the editable form shape (stable key order → dirty diffing).
export function toForm(d) {
  return {
    name: d.name || '',
    description: d.description || '',
    category: d.category || '',
    productionMethod: d.productionMethod || 'cad_cast',
    status: d.status || 'draft',
    editionType: d.edition?.type || 'unlimited',
    editionLimit: d.edition?.limit != null ? String(d.edition.limit) : '',
    primaryArtisanId: d.primaryArtisanId || '',
    tags: Array.isArray(d.tags) ? d.tags : [],
    // Gemstone designs: the CUT is the design — shape(s) + cutting technique live here; the
    // material spec (species/carat/color/…) is per-variant, like metal on jewelry.
    gemCut: (d.gemstone?.cut || []).join(', '),
    gemCutStyle: (d.gemstone?.cutStyle || []).join(', '),
    // Customization is a DESIGN-level capability (shoppers open REFRAKT and customize the
    // design's model), not a per-variant flag.
    // Pricing recipe — SHARED across variants; cascades. Retail is computed live from
    // market metal rates, never stored, so we only persist these inputs.
    pricing: {
      markup: d.pricing?.markup != null && d.pricing.markup !== '' ? String(d.pricing.markup) : '',
      laborTasks: (d.pricing?.laborTasks || []).map((t) => ({ description: t.description || '', quantity: t.quantity != null ? String(t.quantity) : '1', hours: t.hours != null ? String(t.hours) : '', discipline: t.discipline || 'bench_jewelry', cost: t.cost != null ? String(t.cost) : '' })),
      shipping: (d.pricing?.shipping || []).map((s) => ({ description: s.description || '', cost: s.cost != null ? String(s.cost) : '' })),
      // Design-fee policy: how the artisan's fee is applied per piece (flat/split/waived)
      // + an optional custom amount (blank = the artisan's profile fee).
      designFee: {
        mode: d.pricing?.designFee?.mode || 'flat',
        amount: d.pricing?.designFee?.amount != null && d.pricing.designFee.amount !== '' ? String(d.pricing.designFee.amount) : '',
      },
    },
    variants: (Array.isArray(d.variants) ? d.variants : []).map((v) => {
      const finish = v.finish || 'gold';
      const karat = v.karat != null ? String(v.karat) : '14';
      return {
      variantId: v.variantId || '',
      sku: v.sku || '',
      label: v.label || v.title || '',
      finish,
      karat,
      // metalKey is always derived from finish+karat (kept only for the pricing estimate).
      metalKey: composeMetalKey(finish, karat),
      viewerConfig: v.viewerConfig || null,
      ringSize: v.ringSize != null ? String(v.ringSize) : '',
      sizingMin: v.sizingAllowance?.min != null ? String(v.sizingAllowance.min) : '',
      sizingMax: v.sizingAllowance?.max != null ? String(v.sizingAllowance.max) : '',
      retailPrice: v.pricing?.retailPrice != null ? String(v.pricing.retailPrice) : '',
      leadTimeDays: v.leadTimeDays != null ? String(v.leadTimeDays) : '',
      active: v.active !== false,
      // The variant "owns" its stones (center + accents) and an optional markup override.
      // Each stone row links a catalog gemstone; cost = unitCost × qty (per-stone).
      gemstones: (v.gemstones || []).map((g) => ({
        slot: g.slot || '',
        role: g.role || 'accent',
        qty: g.qty != null ? String(g.qty) : '1',
        stoneSkuId: g.stoneSkuId || '',
        stullerSku: g.stullerSku || '',
        label: g.label || '',
        unitCost: g.unitCost != null ? String(g.unitCost) : '',
        caratEach: g.caratEach != null ? String(g.caratEach) : '',
        sizeMm: g.sizeMm || '',
        cut: g.cut || '',
        // Per-stone creation (natural | lab) — sourcing key, defaults natural.
        creation: g.creation || 'natural',
        // Gem-design link (Phase 2): design + variant + COLOR (the rate key).
        gemDesignId: g.gemDesignId || '',
        gemVariantId: g.gemVariantId || '',
        gemColor: g.gemColor || '',
        // Measured geometry (from REFRAKT) — kept so auto-match/Stuller search stays precise on reload.
        preset: g.preset || g.gemType || '',
        lengthMm: g.lengthMm != null ? String(g.lengthMm) : '',
        widthMm: g.widthMm != null ? String(g.widthMm) : '',
        source: g.source || '',
      })),
      markupOverride: v.markupOverride != null && v.markupOverride !== '' ? String(v.markupOverride) : '',
      // Gemstone-design variants: a SPECIES offering — availability toggle, carat range guard,
      // color quality-buckets with size-tiered $/ct. No fixed carat, no typed dimensions.
      gem: {
        species: v.gemstone?.species || '',
        availability: v.gemstone?.availability === 'special_request' ? 'special_request' : 'purchase',
        caratMin: v.gemstone?.caratMin != null ? String(v.gemstone.caratMin) : '',
        caratMax: v.gemstone?.caratMax != null ? String(v.gemstone.caratMax) : '',
        creation: v.gemstone?.naturalSynthetic === 'lab' ? 'lab' : 'natural',
        clarity: v.gemstone?.clarity || '',
        treatment: Array.isArray(v.gemstone?.treatment) ? v.gemstone.treatment.join(', ') : (v.gemstone?.treatment || ''),
        cutLaborCost: v.gemstone?.cutLaborCost != null ? String(v.gemstone.cutLaborCost) : '',
        lotQty: v.gemstone?.lotQty != null ? String(v.gemstone.lotQty) : '',
        maxPieces: v.gemstone?.maxPieces != null ? String(v.gemstone.maxPieces) : '',
        yield: v.gemstone?.yield != null ? String(v.gemstone.yield) : '',
        // Show the OVERRIDE only — a table-resolved sg round-trips as blank so the field
        // reads "custom material" rather than echoing the default back as user input.
        sg: v.gemstone?.sgOverride != null ? String(v.gemstone.sgOverride) : '',
        colors: (v.gemstone?.colors || []).map((c) => ({
          label: c.label || '',
          rates: (c.rates || []).map((t) => ({ upToCt: t.upToCt != null ? String(t.upToCt) : '', ratePerCarat: t.ratePerCarat != null ? String(t.ratePerCarat) : '' })),
        })),
      },
      };
    }),
  };
}
// Comma-string → trimmed array (gem cut/color/treatment lists are edited as CSV text).
export const csvArr = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

