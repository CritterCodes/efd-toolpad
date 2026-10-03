import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * GUARD: A LOGIN THAT IS NOT RECORDED CANNOT BE ANSWERED FOR.
 *
 * The bug class is an absent fact, not a wrong one. Before this, no `lastLoginAt` existed anywhere, so
 * "this store has never signed in" and "we do not record sign-ins" looked identical from the database.
 * The cost showed up the moment we tried to bring Marlen Jewelers into the portal: a verified account
 * with a password set, apparently unused, and no way to confirm it or to tell later whether the
 * invitation worked.
 *
 * Two things have to hold together, and the second is why this is a test rather than a line of code:
 * the stamp must happen on a real login, and it must NEVER cost somebody their session when it fails.
 * A naive `await update(...)` in the happy path satisfies the first and breaks the second the first
 * time Mongo hiccups — turning a telemetry field into an outage.
 */

const calls = [];
let updateThrows = false;
let user;

vi.mock('./model', () => ({
  default: {
    findByEmail: vi.fn(async () => user),
    updateById: vi.fn(async (userID, data) => {
      if (updateThrows) throw new Error('mongo down');
      calls.push({ userID, data });
      return true;
    }),
  },
}));
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn(async () => true), hash: vi.fn(async () => 'hashed') } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(() => 'a.jwt.token') } }));
vi.mock('../../users/class', () => ({ default: class {} }));
vi.mock('@/app/utils/email.util.js', () => ({
  sendVerificationEmail: vi.fn(), sendInviteEmail: vi.fn(), sendPasswordResetEmail: vi.fn(),
}));

const login = async (email = 'andrew@marlenjewelers.com', password = 'pw') => {
  const { default: AuthService } = await import('./service.js');
  return AuthService.login(email, password);
};

beforeEach(() => {
  calls.length = 0;
  updateThrows = false;
  user = {
    userID: 'user-c9f82772', email: 'andrew@marlenjewelers.com', password: '$2a$hashed',
    status: 'verified', role: 'wholesaler', firstName: 'Andrew', lastName: 'Eilberg',
  };
  vi.clearAllMocks();
  vi.resetModules();
});

describe('recording that someone signed in', () => {
  it('stamps lastLoginAt on a successful login', async () => {
    await login();
    expect(calls).toHaveLength(1);
    expect(calls[0].userID).toBe('user-c9f82772');
    expect(calls[0].data.lastLoginAt).toBeInstanceOf(Date);
  });

  it('stamps nothing but the date — a login is not a profile edit', async () => {
    await login();
    expect(Object.keys(calls[0].data)).toEqual(['lastLoginAt']);
  });

  it('still signs you in when the stamp fails', async () => {
    // The whole point of the try/catch. Telemetry must never become an outage.
    updateThrows = true;
    const result = await login();
    expect(result.token).toBe('a.jwt.token');
    expect(result.userID).toBe('user-c9f82772');
  });

  it('does not stamp an account that cannot log in', async () => {
    // A rejected sign-in is not a sign-in. Stamping here would make a locked-out store look active.
    user.status = 'terminated';
    await expect(login()).rejects.toThrow(/deactivated/i);
    expect(calls).toHaveLength(0);
  });

  it('does not stamp an unverified account', async () => {
    user.status = 'pending';
    await expect(login()).rejects.toThrow(/verify/i);
    expect(calls).toHaveLength(0);
  });

  it('does not stamp when there is no such user', async () => {
    user = null;
    await expect(login()).rejects.toThrow(/Invalid email or password/);
    expect(calls).toHaveLength(0);
  });

  it('does not stamp an account with no password set', async () => {
    user.password = 'no password';
    await expect(login()).rejects.toThrow(/Invalid email or password/);
    expect(calls).toHaveLength(0);
  });
});
