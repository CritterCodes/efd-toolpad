import { beforeEach, describe, expect, it, vi } from 'vitest';

const { put } = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock('@/utils/axiosInstance', () => ({
  default: { put },
}));

import UsersService from './users';

describe('UsersService.updateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the identifier route that sanitizes immutable Mongo fields', async () => {
    const payload = {
      _id: '507f1f77bcf86cd799439011',
      userID: 'user-8e8f2790',
      firstName: 'Ronda',
      lastName: 'Winstead',
      email: 'test@test.com',
    };
    put.mockResolvedValue({ data: { success: true } });

    await expect(UsersService.updateUser('user-8e8f2790', payload))
      .resolves.toEqual({ success: true });
    expect(put).toHaveBeenCalledWith('/users/user-8e8f2790', payload);
  });
});
