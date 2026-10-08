import { describe, it, expect } from 'vitest';
import {
  aiErrorMessage, userFacingAiError, PHOTO_DESCRIPTION_FALLBACK, SMART_INTAKE_FALLBACK,
} from './aiErrorMessage';

/**
 * GUARD: A PROVIDER'S WORDS ARE NOT OUR WORDS.
 *
 * 2026-10-08. A wholesale store owner, on his phone, tapped "Rewrite description from photo" and was
 * shown, in red:
 *
 *     "Your project has been denied access. Please contact support."
 *
 * That is Google talking about OUR Gemini API key. He read it as his own account being denied, stopped,
 * and told us he could not enter his repair — which was never true: the description is typed by hand and
 * nothing gated the next step on the photo helper. The cost of leaking one upstream sentence was a real
 * customer abandoning a real job.
 *
 * So the rule is an allowlist, like consent next door in testimonialRequest: only a message we wrote AND
 * marked `userFacing` reaches a person. Everything else — every sentence an upstream can invent, and our
 * own operator-facing ones about API keys — becomes wording that says what broke and that the work goes
 * on without it.
 */

describe('what a person is allowed to read', () => {
  it('never shows the provider sentence that cost us the job', () => {
    const fromGoogle = new Error('Your project has been denied access. Please contact support.');
    const shown = aiErrorMessage(fromGoogle, { fallback: PHOTO_DESCRIPTION_FALLBACK });
    expect(shown).toBe(PHOTO_DESCRIPTION_FALLBACK);
    expect(shown).not.toMatch(/denied access/i);
    expect(shown).not.toMatch(/contact support/i);
  });

  it.each([
    ['an API key complaint', 'API key not valid. Please pass a valid API key.'],
    ['a quota complaint', 'Quota exceeded for quota metric generativelanguage.googleapis.com'],
    ['a billing complaint', 'This API method requires billing to be enabled.'],
    ['a bare provider failure', 'Gemini request failed'],
    ['an internal stack-ish message', 'fetch failed: ECONNREFUSED 142.250.0.1:443'],
  ])('hides %s', (_label, message) => {
    expect(aiErrorMessage(new Error(message))).not.toContain(message);
  });

  it('passes through a message we wrote and marked as fit to read', () => {
    const ours = userFacingAiError('AI is temporarily rate limited. Please wait a moment and try again.', { status: 429 });
    expect(aiErrorMessage(ours)).toMatch(/rate limited/i);
    expect(ours.status).toBe(429);
  });

  it('does not pass through an unmarked message even when we wrote it', () => {
    // `GEMINI_API_KEY is not configured.` is ours and is true — and is an operator's problem, not
    // something to put in front of a jeweller mid-ticket.
    expect(aiErrorMessage(new Error('GEMINI_API_KEY is not configured.'))).toBe(
      'The AI helper is unavailable right now — carry on without it.');
  });

  it.each([[null], [undefined], [{}], [new Error('')], [{ userFacing: true, message: '   ' }]])(
    'falls back for %p rather than showing nothing', (value) => {
      expect(aiErrorMessage(value, { fallback: SMART_INTAKE_FALLBACK })).toBe(SMART_INTAKE_FALLBACK);
    });

  it('tells the person the work carries on without the helper', () => {
    // The whole point. A failure the user can route around must say so, or they stop like he did.
    for (const copy of [PHOTO_DESCRIPTION_FALLBACK, SMART_INTAKE_FALLBACK]) {
      expect(copy).toMatch(/carry on/i);
    }
    expect(PHOTO_DESCRIPTION_FALLBACK).toMatch(/type the description/i);
  });
});
