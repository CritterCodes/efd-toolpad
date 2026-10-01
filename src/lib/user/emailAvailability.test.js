import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
const { emailMatch, assertEmailAvailable, DUPLICATE_EMAIL } = await import('./emailAvailability');

/** EFD-DEFECTS C2: one email, one account — matched in any case. */
const dbWith = (existing) => ({ collection: () => ({ findOne: vi.fn(async (q) => (existing && new RegExp(q.email.$regex, q.email.$options).test(existing.email) ? existing : null)) }) });

describe('email availability', () => {
  it('matches the whole address, in any case, with regex characters escaped', () => {
    const q = emailMatch('  Jo.Smith+1@Example.com ');
    const re = new RegExp(q.email.$regex, q.email.$options);
    expect(re.test('jo.smith+1@example.com')).toBe(true);
    expect(re.test('joXsmith+1@example.com')).toBe(false); // the dot is literal
    expect(re.test('ajo.smith+1@example.com')).toBe(false); // whole address only
  });

  it('refuses a second account for the same email (any case) with a 409 code', async () => {
    await expect(assertEmailAvailable('ROB@shop.com', dbWith({ email: 'rob@shop.com', userID: 'u1' })))
      .rejects.toMatchObject({ code: DUPLICATE_EMAIL, status: 409 });
  });

  it('lets a new email through, and never checks a blank one (walk-ins have none)', async () => {
    await expect(assertEmailAvailable('new@shop.com', dbWith({ email: 'rob@shop.com' }))).resolves.toBeUndefined();
    await expect(assertEmailAvailable('', dbWith({ email: '' }))).resolves.toBeUndefined();
  });
});
