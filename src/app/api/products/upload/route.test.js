import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Listing images land on the DESIGN (media.images), which the editor and efd-shop read. They used to be pushed
 * onto a `products` document nothing reads, so an uploaded photo showed up nowhere. And only staff or the
 * design's jeweler may add them (routeAuthorization.guard.test.js).
 */
const { auth, updateOne, findOne, loadJewelryListing, uploadFileToS3 } = vi.hoisted(() => ({
  auth: vi.fn(),
  updateOne: vi.fn(async () => ({ matchedCount: 1 })),
  findOne: vi.fn(async () => ({ userID: 'u-jeweler', role: 'artisan', artisanApplication: { artisanType: 'Jeweler' } })),
  loadJewelryListing: vi.fn(),
  uploadFileToS3: vi.fn(async (_f, folder) => `https://s3.test/${folder}/img.jpg`),
}));
const collections = [];
vi.mock('@/lib/auth', () => ({ auth }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: (name) => { collections.push(name); return { updateOne, findOne }; } }) },
}));
vi.mock('@/services/production/listingLookup', () => ({ loadJewelryListing, loadGemListing: vi.fn(async () => ({ design: null })) }));
vi.mock('../../../../utils/s3.util', () => ({ uploadFileToS3 }));

const { POST } = await import('./route.js');

function request() {
  const form = new FormData();
  form.append('images', new File(['x'], 'ring.jpg', { type: 'image/jpeg' }));
  form.append('productId', 'handle-1');
  form.append('productType', 'jewelry');
  return new Request('http://test/api/products/upload', { method: 'POST', body: form });
}

describe('POST /api/products/upload', () => {
  beforeEach(() => { updateOne.mockClear(); collections.length = 0; });

  it("writes the images onto the design's media.images", async () => {
    auth.mockResolvedValue({ user: { userID: 'u-jeweler', role: 'artisan' } });
    loadJewelryListing.mockResolvedValue({ design: { designID: 'd-1', primaryArtisanId: 'u-jeweler' } });
    const res = await POST(request());
    expect(res.status).toBe(200);
    const [filter, update] = updateOne.mock.calls.at(-1);
    expect(filter).toEqual({ designID: 'd-1' });
    expect(update.$push['media.images'].$each[0]).toMatchObject({ url: expect.stringContaining('img.jpg'), uploadedBy: 'u-jeweler' });
    expect(collections).toContain('designs');
    expect(collections).not.toContain('products');
  });

  it("refuses someone else's listing", async () => {
    auth.mockResolvedValue({ user: { userID: 'u-store', role: 'wholesaler' } });
    loadJewelryListing.mockResolvedValue({ design: { designID: 'd-1', primaryArtisanId: 'u-jeweler' } });
    const res = await POST(request());
    expect(res.status).toBe(403);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
