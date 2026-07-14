import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connect: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/database', () => ({ db: { connect: mocks.connect } }));

import { GET, PUT } from './route.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const ownerSession = { user: { id: 'artisan-1', role: 'artisan' } };
const product = {
  _id: PRODUCT_ID,
  title: 'Ruby',
  status: 'draft',
  artisanId: 'artisan-1',
  pricing: { currency: 'USD', costBasis: 100 },
};

describe('/api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({
      collection: () => ({
        findOne: mocks.findOne,
        findOneAndUpdate: mocks.findOneAndUpdate,
      }),
    });
  });

  it('requires authentication before returning admin product data', async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET({}, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('allows an artisan to read their own product and rejects other owners', async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.findOne.mockResolvedValue(product);
    const ownResponse = await GET({}, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(ownResponse._status).toBe(200);

    mocks.auth.mockResolvedValue({ user: { id: 'artisan-2', role: 'artisan' } });
    const otherResponse = await GET({}, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(otherResponse._status).toBe(403);
  });

  it('preserves nested contract fields and strips artisan status and ownership changes', async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.findOne.mockResolvedValue(product);
    mocks.findOneAndUpdate.mockResolvedValue({ ...product, pricing: { currency: 'USD', retailPrice: 300 } });

    const request = {
      json: async () => ({
        status: 'published',
        artisanId: 'artisan-2',
        pricing: { retailPrice: 300 },
        _id: 'replacement',
        $where: 'unsafe',
      }),
    };
    const response = await PUT(request, { params: Promise.resolve({ id: PRODUCT_ID }) });
    const update = mocks.findOneAndUpdate.mock.calls[0][1];

    expect(response._status).toBe(200);
    expect(response._data.pricing.retailPrice).toBe(300);
    expect(update.$set.pricing).toEqual({ currency: 'USD', costBasis: 100, retailPrice: 300 });
    expect(update.$set).not.toHaveProperty('status');
    expect(update.$set).not.toHaveProperty('artisanId');
    expect(update.$set).not.toHaveProperty('_id');
    expect(update.$set).not.toHaveProperty('$where');
  });

  it('uses the MongoDB 6 document return value directly', async () => {
    const adminSession = { user: { id: 'admin-1', role: 'admin' } };
    const updated = { ...product, status: 'archived' };
    mocks.auth.mockResolvedValue(adminSession);
    mocks.findOne.mockResolvedValue(product);
    mocks.findOneAndUpdate.mockResolvedValue(updated);

    const response = await PUT(
      { json: async () => ({ status: 'archived' }) },
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    );
    expect(response._data).toEqual(updated);
    const update = mocks.findOneAndUpdate.mock.calls[0][1];
    expect(update.$set).toMatchObject({
      status: 'archived', isPublic: false, publishing: { visible: false },
    });
  });
});
