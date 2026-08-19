import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendShopAccountInvite } from '@/lib/shopInvite';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('sendShopAccountInvite', () => {
  it('posts the handoff-specced request to the shop', async () => {
    vi.stubEnv('EFD_PRICING_KEY', 'sekrit');
    vi.stubEnv('NEXT_PUBLIC_SHOP_URL', 'https://shop.example.com');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sent: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const r = await sendShopAccountInvite('user-abc', 'quote');
    expect(r).toEqual({ sent: true, alreadyClaimed: false });
    expect(fetchMock).toHaveBeenCalledWith('https://shop.example.com/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-efd-internal-key': 'sekrit' },
      body: JSON.stringify({ userID: 'user-abc', reason: 'quote' }),
    });
  });

  it('reports an already-claimed no-op without treating it as a failure', async () => {
    vi.stubEnv('EFD_PRICING_KEY', 'sekrit');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sent: false, alreadyClaimed: true }) }));
    const r = await sendShopAccountInvite('user-abc', 'account');
    expect(r).toEqual({ sent: false, alreadyClaimed: true });
  });

  it('skips without the shared secret — and never calls the shop', async () => {
    vi.stubEnv('EFD_PRICING_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendShopAccountInvite('user-abc');
    expect(r.skipped).toBe('no-key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws — a dead shop must not block the admin save', async () => {
    vi.stubEnv('EFD_PRICING_KEY', 'sekrit');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const r = await sendShopAccountInvite('user-abc', 'quote');
    expect(r.sent).toBe(false);
    expect(r.error).toBe('ECONNREFUSED');
  });
});
