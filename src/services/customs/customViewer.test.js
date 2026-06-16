import { describe, expect, it } from 'vitest';
import { validateDesignModel, shareUrl } from '@/services/customs/customViewer';

describe('validateDesignModel', () => {
  it('accepts a valid model', () => {
    const r = validateDesignModel({
      glbUrl: 'https://x/m.glb',
      meshMap: [
        { nameContains: 'Mounting', type: 'metal', finish: 'whiteGold' },
        { nameContains: 'Center', type: 'gem', gemPreset: 'sapphire' },
      ],
    });
    expect(r.valid).toBe(true);
  });

  it('rejects missing glbUrl, empty meshMap, bad finish/preset', () => {
    expect(validateDesignModel({ meshMap: [{ type: 'metal', finish: 'gold' }] }).valid).toBe(false); // no glbUrl
    expect(validateDesignModel({ glbUrl: 'x', meshMap: [] }).valid).toBe(false);
    expect(validateDesignModel({ glbUrl: 'x', meshMap: [{ type: 'metal', finish: 'titanium' }] }).valid).toBe(false);
    expect(validateDesignModel({ glbUrl: 'x', meshMap: [{ type: 'gem', gemPreset: 'unobtanium' }] }).valid).toBe(false);
  });
});

describe('shareUrl', () => {
  it('builds a <shop>/d/<token> url', () => {
    expect(shareUrl('abc123')).toMatch(/\/d\/abc123$/);
  });
});
