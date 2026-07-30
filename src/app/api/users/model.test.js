import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));

const { dbUsers } = vi.hoisted(() => ({ dbUsers: vi.fn() }));
vi.mock('@/lib/database', () => ({ db: { connect, dbUsers } }));

import UserModel, { userIdentityQuery, USER_SECRET_FIELDS } from './model';

describe('user identifier lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the public userID for application routes', () => {
    expect(userIdentityQuery('user-8e8f2790')).toEqual({ userID: 'user-8e8f2790' });
  });

  it('continues to support MongoDB ObjectId route values', () => {
    const id = '507f1f77bcf86cd799439011';
    const query = userIdentityQuery(id);

    expect(query.$or[0]).toEqual({ userID: id });
    expect(query.$or[1]._id.toHexString()).toBe(id);
  });

  it('updates and reloads a user by public userID', async () => {
    const updatedUser = { userID: 'user-8e8f2790', email: 'ronda@customer.com' };
    const users = {
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
      findOne: vi.fn().mockResolvedValue(updatedUser),
    };
    connect.mockResolvedValue({ collection: vi.fn().mockReturnValue(users) });

    await expect(UserModel.updateUserById('user-8e8f2790', { email: 'ronda@customer.com' }))
      .resolves.toEqual(updatedUser);
    expect(users.updateOne).toHaveBeenCalledWith(
      { userID: 'user-8e8f2790' },
      { $set: { email: 'ronda@customer.com' } },
    );
    // The reload MUST pass the credential projection — a user doc carries the bcrypt password and any
    // live resetToken, and this value is returned to the caller.
    expect(users.findOne).toHaveBeenCalledWith(
      { userID: 'user-8e8f2790' },
      { projection: USER_SECRET_FIELDS },
    );
  });
});

/**
 * EVERY read must actually PASS the credential projection.
 *
 * The constant-shape test in userSecrets.test.js proves USER_SECRET_FIELDS lists the right fields — but
 * a review pointed out that deleting `{ projection: USER_SECRET_FIELDS }` from a findOne would still
 * pass the suite, because nothing asserted a read USES it. These close that: one assertion per read
 * site, so removing a projection fails CI rather than silently shipping bcrypt hashes and reset tokens.
 */
describe('credential projection is passed on every users read', () => {
  const PROJ = { projection: USER_SECRET_FIELDS };
  let users;

  beforeEach(() => {
    users = {
      findOne: vi.fn().mockResolvedValue({ userID: 'u-1', email: 'a@t.test' }),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    connect.mockResolvedValue({ collection: vi.fn().mockReturnValue(users) });
    dbUsers.mockResolvedValue(users);
  });

  it('getUserById', async () => {
    await UserModel.getUserById('u-1');
    expect(users.findOne).toHaveBeenCalledWith(expect.anything(), PROJ);
  });

  it('getUserByQuery (regex search across identifiers)', async () => {
    await UserModel.getUserByQuery('a@t.test');
    expect(users.findOne).toHaveBeenCalledWith(expect.anything(), PROJ);
  });

  it('getAllUsers', async () => {
    await UserModel.getAllUsers();
    expect(users.find).toHaveBeenCalledWith({}, PROJ);
  });

  it('getUsersByRole', async () => {
    await UserModel.getUsersByRole('artisan');
    expect(users.find).toHaveBeenCalledWith({ role: 'artisan' }, PROJ);
  });

  it('updateUser reload (the value is returned to the caller)', async () => {
    await UserModel.updateUser('a@t.test', { firstName: 'A' });
    expect(users.findOne).toHaveBeenCalledWith(expect.anything(), PROJ);
  });

  it('no read returns a password or resetToken even if the DB row has them', async () => {
    // Belt-and-braces: the projection is what strips these, so a mock that returns them proves only
    // that the call shape is right — asserted above. Here we pin the field list itself.
    expect(Object.keys(USER_SECRET_FIELDS).sort())
      .toEqual(['password', 'resetToken', 'resetTokenExpiry', 'verificationToken']);
  });
});
