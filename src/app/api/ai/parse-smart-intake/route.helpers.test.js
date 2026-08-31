import { describe, it, expect, vi } from 'vitest';

/**
 * Smart intake's deterministic edges — the parts that decide what reaches the
 * form regardless of what the model says. The karat normalizer exists because
 * Gemini answers in free text ("14K") while the form's Select speaks '14k':
 * an unmatched value rendered the Select silently BLANK, which is how a 14k
 * price gets charged on an 18k ring.
 */

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const { normalizeKaratValue, normalizeParsedPayload, prefilterTasks } = await import('./route.js');

describe('normalizeKaratValue', () => {
  it('maps every casing and suffix Gemini produces onto the form vocabulary', () => {
    expect(normalizeKaratValue('14K')).toBe('14k');
    expect(normalizeKaratValue('14k')).toBe('14k');
    expect(normalizeKaratValue('14 kt')).toBe('14k');
    expect(normalizeKaratValue('18KT')).toBe('18k');
    expect(normalizeKaratValue('14')).toBe('14k');
  });

  it('keeps purity numbers as-is (silver and platinum)', () => {
    expect(normalizeKaratValue('925')).toBe('925');
    expect(normalizeKaratValue('950')).toBe('950');
    expect(normalizeKaratValue('999')).toBe('999');
  });

  it('returns EMPTY for anything the Select cannot render, never a guess', () => {
    expect(normalizeKaratValue('fourteen karat')).toBe('');
    expect(normalizeKaratValue('solid gold')).toBe('');
    expect(normalizeKaratValue('')).toBe('');
  });
});

describe('normalizeParsedPayload', () => {
  it('caps matched tasks at 3 — the same number the prompt promises', () => {
    const out = normalizeParsedPayload({ matchedTaskIds: ['a', 'b', 'c', 'd', 'e'] });
    expect(out.matchedTaskIds).toEqual(['a', 'b', 'c']);
  });

  it('normalizes the karat it passes to the form', () => {
    expect(normalizeParsedPayload({ karat: '14K' }).karat).toBe('14k');
  });
});

describe('prefilterTasks', () => {
  const tasks = [
    { id: '1', title: 'Size Down', symptoms: ['ring too big'] },
    { id: '2', title: 'Clasp Repair', symptoms: ['broken clasp'] },
    { id: '3', title: 'Half-Shank — Platinum, up to 3mm (laser welded)', symptoms: [] },
  ];

  it('3-character words carry signal in this domain (14k, pin, cut)', () => {
    // "fix 14k ring" — under the old >3 filter, '14k' and 'fix' both dropped.
    const out = prefilterTasks('big ring', tasks);
    expect(out.map((t) => t.id)).toContain('1');
  });

  it('platinum input surfaces the platinum task', () => {
    const out = prefilterTasks('platinum band half shank', tasks);
    expect(out[0].id).toBe('3');
  });
});
