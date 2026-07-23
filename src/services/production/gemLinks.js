/**
 * Design-level GEM LINKS (owner, 2026-07-23): a jewelry design declares, BEFORE variants exist,
 * that a specific mesh slot in its GLB IS a linked gemstone design. Everything downstream derives
 * from the link — variant seeding pre-links stone rows, the REFRAKT studio constrains that slot's
 * presets to the cutter's active variants (FR-slot-preset-constraints), and save/claim validation
 * backstops drift. Cutter's variants are the single source of truth; downstream only narrows.
 *
 * Link identification is AUTOMATED by geometric fingerprint: the gem design's GLB fixes the cut's
 * PROPORTIONS, so its mesh matches the corresponding stone inside the jewelry GLB by scale-
 * invariant signatures (aspect L:W, depth:W, cut class) — the jeweler never types a mesh name.
 *
 * Shape on the design:
 *   gemLinks: [{ slot: { nameContains, match }, gemDesignId, allowedVariantIds: null|string[] }]
 */

const num = (x) => Number(x) || 0;

/** Scale-invariant fingerprint from a measured mesh spec ({ lengthMm, widthMm, depthMm?, cut }). */
export function meshFingerprint(spec = {}) {
  const L = num(spec.lengthMm);
  const W = num(spec.widthMm);
  return {
    aspect: W > 0 ? L / W : 0,
    depthRatio: W > 0 && num(spec.depthMm) > 0 ? num(spec.depthMm) / W : null,
    cut: spec.cut || null,
  };
}

/**
 * Similarity score 0..1 between a gem design's mesh and a candidate jewelry mesh — proportions
 * only, never absolute size (the jewelry pins one size within the gem's range).
 */
export function gemMeshMatchScore(gemSpec, meshSpec) {
  const a = meshFingerprint(gemSpec);
  const b = meshFingerprint(meshSpec);
  if (!a.aspect || !b.aspect) return 0;

  // Aspect: within 5% ≈ same design; degrade linearly to 0 at 40% off.
  const aspectDiff = Math.abs(a.aspect - b.aspect) / a.aspect;
  const aspectScore = Math.max(0, 1 - aspectDiff / 0.4);

  // Cut class: strong signal when both known.
  const cutScore = a.cut && b.cut ? (a.cut === b.cut ? 1 : 0.15) : 0.6;

  // Depth ratio when both meshes report a believable depth.
  let depthScore = 0.6; // neutral when unknown
  if (a.depthRatio != null && b.depthRatio != null) {
    const dDiff = Math.abs(a.depthRatio - b.depthRatio) / a.depthRatio;
    depthScore = Math.max(0, 1 - dDiff / 0.5);
  }

  return Math.round((aspectScore * 0.5 + cutScore * 0.35 + depthScore * 0.15) * 100) / 100;
}

/**
 * Propose which jewelry-GLB mesh IS the linked gem: rank candidates by fingerprint score.
 * @param {object} gemSpec     measured spec of the gem design's mesh
 * @param {Array}  meshSpecs   [{ name, lengthMm, widthMm, depthMm?, cut }] for the jewelry GLB
 * @returns {{ best: object|null, confident: boolean, ranked: Array }}
 */
export function proposeGemMesh(gemSpec, meshSpecs = []) {
  const ranked = meshSpecs
    .map((m) => ({ ...m, score: gemMeshMatchScore(gemSpec, m) }))
    .sort((x, y) => y.score - x.score);
  const best = ranked[0] || null;
  const runnerUp = ranked[1];
  // Confident = strong absolute score AND clearly ahead of the next candidate.
  const confident = Boolean(best && best.score >= 0.8 && (!runnerUp || best.score - runnerUp.score >= 0.15));
  return { best, confident, ranked };
}

/** The species (normalized) a gem design offers, honoring an optional variant narrowing. */
export function allowedSpeciesForLink(link = {}, gemDesign = {}) {
  const wanted = Array.isArray(link.allowedVariantIds) && link.allowedVariantIds.length
    ? new Set(link.allowedVariantIds) : null;
  const out = new Set();
  for (const v of gemDesign.variants || []) {
    if (v.active === false || !v.gemstone?.species) continue;
    if (wanted && !wanted.has(v.variantId)) continue;
    out.add(String(v.gemstone.species).trim().toLowerCase());
  }
  return [...out];
}

/** Does a mesh/slot name fall under a link's slot rule? (mirrors REFRAKT's meshMatchesSlot) */
export function slotMatchesLink(name = '', slot = {}) {
  const n = String(name).toLowerCase();
  const target = String(slot.nameContains || '').toLowerCase();
  if (!target) return false;
  return slot.match === 'exact' ? n === target : n.includes(target);
}

/**
 * BACKSTOP validation (save-time; the studio constraint is the preventive layer): every variant
 * viewerConfig gem slot that falls under a gem link must carry a preset the linked gem design
 * actually offers. Returns error strings ([] = valid).
 * @param {object} design   the jewelry design (gemLinks + variants[].viewerConfig)
 * @param {object} gemDocs  { [gemDesignId]: gem Design doc }
 */
export function validateGemLinkPresets(design = {}, gemDocs = {}) {
  const errors = [];
  const links = design.gemLinks || [];
  if (!links.length) return errors;
  for (const variant of design.variants || []) {
    for (const slot of variant.viewerConfig?.meshMap || []) {
      if (slot.type !== 'gem' || !slot.gemPreset) continue;
      for (const link of links) {
        if (!slotMatchesLink(slot.nameContains, link.slot || {})) continue;
        const doc = gemDocs[link.gemDesignId];
        if (!doc) continue; // missing doc → claim-time validation still guards
        const allowed = allowedSpeciesForLink(link, doc);
        if (allowed.length && !allowed.includes(String(slot.gemPreset).toLowerCase())) {
          errors.push(`${variant.variantId || 'variant'} · ${slot.nameContains}: "${slot.gemPreset}" is not offered by the linked gem design "${doc.name}" (offers: ${allowed.join(', ')})`);
        }
      }
    }
  }
  return errors;
}
