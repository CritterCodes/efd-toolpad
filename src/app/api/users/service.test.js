import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateUserById, syncLinkedCustomOrderContact } = vi.hoisted(() => ({
  updateUserById: vi.fn(),
  syncLinkedCustomOrderContact: vi.fn(),
}));

vi.mock('./model.js', () => ({
  default: { updateUserById },
}));
vi.mock('@/services/customs/customerContactSync', () => ({ syncLinkedCustomOrderContact }));

import UserService from './service';

describe('UserService client contact propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('synchronizes linked custom orders after an identifier-route update', async () => {
    const user = {
      userID: 'user-8e8f2790',
      firstName: 'Randa',
      lastName: 'Winstead',
      email: 'randawinstead@gmail.com',
      phoneNumber: '479-719-4447',
    };
    updateUserById.mockResolvedValue(user);
    syncLinkedCustomOrderContact.mockResolvedValue({ updatedOrders: 1 });

    await expect(UserService.updateUserById(user.userID, user)).resolves.toEqual(user);
    expect(syncLinkedCustomOrderContact).toHaveBeenCalledWith(user);
  });
});
