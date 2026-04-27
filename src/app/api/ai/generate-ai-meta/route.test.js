import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { POST } from './route.js'
import { auth } from '@/lib/auth'

const VALID_SESSION = { user: { id: 'user1' } }

const VALID_AI_META_JSON = JSON.stringify({
  whenToUse: 'When a customer reports a loose or missing stone',
  symptoms: ['stone is loose', 'stone fell out', 'prong is bent'],
  requiredInfo: ['stoneCount'],
  neverUseWhen: '',
  pairsWith: [],
})

const makeSuccess = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
  }),
  headers: { get: () => null },
})

const make429 = (retryAfterSecs = 0) => ({
  ok: false,
  status: 429,
  json: async () => ({ error: { code: 429, message: 'Resource exhausted', status: 'RESOURCE_EXHAUSTED' } }),
  headers: { get: (k) => (k === 'Retry-After' && retryAfterSecs ? String(retryAfterSecs) : null) },
})

const mockReq = (body) => ({ json: async () => body })

describe('POST /api/ai/generate-ai-meta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.mockResolvedValue(VALID_SESSION)
    process.env.GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(mockReq({ title: 'Ring Sizing' }))
    expect(res._status).toBe(401)
    expect(res._data.success).toBe(false)
  })

  it('returns 400 when title is missing', async () => {
    const res = await POST(mockReq({ title: '' }))
    expect(res._status).toBe(400)
    expect(res._data.success).toBe(false)
  })

  it('returns 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY
    const res = await POST(mockReq({ title: 'Ring Sizing' }))
    expect(res._status).toBe(500)
  })

  it('returns AI metadata on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeSuccess(VALID_AI_META_JSON))
    const res = await POST(mockReq({ title: 'Check & Tighten < 20 stones', category: 'stone_setting' }))
    expect(res._status).toBe(200)
    expect(res._data.success).toBe(true)
    expect(res._data.data.aiMeta.symptoms).toContain('stone is loose')
    expect(res._data.data.aiMeta.whenToUse).toBeTruthy()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 422 when Gemini returns unparseable output', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeSuccess('not json at all'))
    const res = await POST(mockReq({ title: 'Ring Sizing' }))
    expect(res._status).toBe(422)
    expect(res._data.success).toBe(false)
  })

  it('retries once on 429 then succeeds', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
      .mockResolvedValueOnce(make429())
      .mockResolvedValueOnce(makeSuccess(VALID_AI_META_JSON))

    const promise = POST(mockReq({ title: 'Ring Sizing' }))
    await vi.advanceTimersByTimeAsync(3000)
    const res = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(200)
    expect(res._data.success).toBe(true)
  })

  it('returns 429 after exhausting all retries', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue(make429())

    const promise = POST(mockReq({ title: 'Ring Sizing' }))
    await vi.advanceTimersByTimeAsync(15000)
    const res = await promise

    expect(global.fetch).toHaveBeenCalledTimes(4)
    expect(res._status).toBe(429)
    expect(res._data.success).toBe(false)
  })

  it('respects Retry-After header delay', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
      .mockResolvedValueOnce(make429(3))
      .mockResolvedValueOnce(makeSuccess(VALID_AI_META_JSON))

    const promise = POST(mockReq({ title: 'Ring Sizing' }))
    await vi.advanceTimersByTimeAsync(4000)
    const res = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(200)
  })
})
