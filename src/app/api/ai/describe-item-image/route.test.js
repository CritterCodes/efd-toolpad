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
const FAKE_DESCRIPTION = 'A yellow gold ring with a round diamond center stone and pavé accent diamonds on the band.'

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

const makeImageFile = (opts = {}) => {
  const { type = 'image/jpeg', size = 1000, name = 'ring.jpg' } = opts
  const file = new File([new Uint8Array(size)], name, { type })
  return file
}

const mockReq = (file) => ({
  formData: async () => ({ get: (key) => (key === 'image' ? file : null) }),
})

describe('POST /api/ai/describe-item-image', () => {
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
    const res = await POST(mockReq(makeImageFile()))
    expect(res._status).toBe(401)
    expect(res._data.success).toBe(false)
  })

  it('returns 400 when no image is provided', async () => {
    const res = await POST(mockReq(null))
    expect(res._status).toBe(400)
    expect(res._data.success).toBe(false)
  })

  it('returns 400 when file is not an image', async () => {
    const res = await POST(mockReq(makeImageFile({ type: 'application/pdf', name: 'doc.pdf' })))
    expect(res._status).toBe(400)
    expect(res._data.error).toMatch(/image/i)
  })

  it('returns 400 when image exceeds 10MB', async () => {
    const res = await POST(mockReq(makeImageFile({ size: 11 * 1024 * 1024 })))
    expect(res._status).toBe(400)
    expect(res._data.error).toMatch(/large/i)
  })

  it('returns 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY
    const res = await POST(mockReq(makeImageFile()))
    expect(res._status).toBe(500)
  })

  it('returns description on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeSuccess(FAKE_DESCRIPTION))
    const res = await POST(mockReq(makeImageFile()))
    expect(res._status).toBe(200)
    expect(res._data.success).toBe(true)
    expect(res._data.data.description).toBe(FAKE_DESCRIPTION)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns 502 when Gemini returns empty description', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeSuccess(''))
    const res = await POST(mockReq(makeImageFile()))
    expect(res._status).toBe(502)
    expect(res._data.success).toBe(false)
  })

  it('retries once on 429 then succeeds', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
      .mockResolvedValueOnce(make429())
      .mockResolvedValueOnce(makeSuccess(FAKE_DESCRIPTION))

    const promise = POST(mockReq(makeImageFile()))
    await vi.advanceTimersByTimeAsync(3000)
    const res = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(200)
    expect(res._data.success).toBe(true)
  })

  it('returns 429 after exhausting all retries', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn().mockResolvedValue(make429())

    const promise = POST(mockReq(makeImageFile()))
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
      .mockResolvedValueOnce(makeSuccess(FAKE_DESCRIPTION))

    const promise = POST(mockReq(makeImageFile()))
    await vi.advanceTimersByTimeAsync(4000)
    const res = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(200)
  })
})
