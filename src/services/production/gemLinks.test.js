import { describe, expect, it } from 'vitest';
import { gemMeshMatchScore, proposeGemMesh, allowedSpeciesForLink, validateGemLinkPresets } from '@/services/production/gemLinks';

// The gem design's mesh: a 10×7mm pear (aspect ≈ 1.43).
const gemSpec = { lengthMm: 10, widthMm: 7, depthMm: 4.5, cut: 'pear' };

describe('gemMeshMatchScore / proposeGemMesh (geometric fingerprint)', () => {
  it('matches the same cut at a DIFFERENT size (proportions, never absolute size)', () => {
    const smaller = { name: 'Stone_1', lengthMm: 5, widthMm: 3.5, depthMm: 2.25, cut: 'pear' }; // exact ratios, half size
    expect(gemMeshMatchScore(gemSpec, smaller)).toBeGreaterThanOrEqual(0.95);
  });
  it('proposes the right mesh among melee + wrong shapes, confidently', () => {
    const meshes = [
      { name: 'Melee_01', lengthMm: 1.5, widthMm: 1.5, cut: 'round' },
      { name: 'Center', lengthMm: 8.6, widthMm: 6.1, depthMm: 3.9, cut: 'pear' },
      { name: 'Accent', lengthMm: 3, widthMm: 3, cut: 'princess' },
    ];
    const { best, confident } = proposeGemMesh(gemSpec, meshes);
    expect(best.name).toBe('Center');
    expect(confident).toBe(true);
  });
  it('is NOT confident when two candidates tie', () => {
    const twin = { name: 'A', lengthMm: 10, widthMm: 7, depthMm: 4.5, cut: 'pear' };
    const { confident } = proposeGemMesh(gemSpec, [twin, { ...twin, name: 'B' }]);
    expect(confident).toBe(false);
  });
});

describe('allowedSpeciesForLink', () => {
  const gem = { variants: [
    { variantId: 'v1', active: true, gemstone: { species: 'Garnet' } },
    { variantId: 'v2', active: true, gemstone: { species: 'Amethyst' } },
    { variantId: 'v3', active: false, gemstone: { species: 'Sapphire' } }, // inactive
  ] };
  it('active variants only, normalized', () => {
    expect(allowedSpeciesForLink({}, gem).sort()).toEqual(['amethyst', 'garnet']);
  });
  it('honors variant narrowing (jeweler may narrow, never widen)', () => {
    expect(allowedSpeciesForLink({ allowedVariantIds: ['v1'] }, gem)).toEqual(['garnet']);
  });
});

describe('validateGemLinkPresets (save-time backstop)', () => {
  const design = {
    gemLinks: [{ slot: { nameContains: 'Amethyst', match: 'exact' }, gemDesignId: 'g1' }],
    variants: [{ variantId: 'V1', viewerConfig: { meshMap: [
      { nameContains: 'Amethyst', match: 'exact', type: 'gem', gemPreset: 'sapphire' },
      { nameContains: 'Diamond_00', type: 'gem', gemPreset: 'diamond' }, // unlinked slot — free
    ] } }],
  };
  const gemDocs = { g1: { name: 'Solstice Cut', variants: [
    { variantId: 'v1', active: true, gemstone: { species: 'Amethyst' } },
    { variantId: 'v2', active: true, gemstone: { species: 'Garnet' } },
  ] } };

  it('rejects a preset the linked gem design does not offer', () => {
    const errors = validateGemLinkPresets(design, gemDocs);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/sapphire.*not offered.*Solstice Cut/);
  });
  it('passes when the preset is an offered species (and unlinked slots stay free)', () => {
    const ok = JSON.parse(JSON.stringify(design));
    ok.variants[0].viewerConfig.meshMap[0].gemPreset = 'garnet';
    expect(validateGemLinkPresets(ok, gemDocs)).toHaveLength(0);
  });
  it('no links → no errors; missing gem doc → skipped (claim-time guards)', () => {
    expect(validateGemLinkPresets({ variants: design.variants }, gemDocs)).toHaveLength(0);
    expect(validateGemLinkPresets(design, {})).toHaveLength(0);
  });
});
