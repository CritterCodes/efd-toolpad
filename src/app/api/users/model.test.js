import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));

vi.mock('@/lib/database', () => ({ db: { connect } }));

import UserModel, { userIdentityQuery } from './model';

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
    expect(users.findOne).toHaveBeenCalledWith({ userID: 'user-8e8f2790' });
  });
});
