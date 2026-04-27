/**
 * Integration tests — hit the real Gemini API.
 * Run with: GEMINI_API_KEY=<key> npx vitest run src/app/api/ai/integration.test.js
 * These are intentionally slow (real network) and cost tokens.
 */
import { describe, it, expect, beforeAll } from 'vitest'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_MODEL = 'gemini-2.5-flash'
const API_KEY = process.env.GEMINI_API_KEY

const callGemini = async (body) => {
  const res = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return { status: res.status, payload: await res.json() }
}

const extractText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map((p) => String(p?.text || '').trim()).filter(Boolean).join('\n').trim()
}

beforeAll(() => {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not set — cannot run integration tests')
})

describe('Gemini API — model reachability', () => {
  it('gemini-2.5-flash responds with 200', async () => {
    const { status, payload } = await callGemini({
      contents: [{ role: 'user', parts: [{ text: 'Say "ok" and nothing else.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 50 },
    })
    expect(status, `Gemini returned ${status}: ${JSON.stringify(payload?.error)}`).toBe(200)
    const finishReason = payload?.candidates?.[0]?.finishReason
    expect(['STOP', 'MAX_TOKENS']).toContain(finishReason)
  }, 30000)
})

describe('generate-ai-meta — real Gemini output', () => {
  it('returns valid JSON with all required keys for a real repair task', async () => {
    const prompt = [
      'You are a jewelry repair expert helping configure an AI repair assistant.',
      'Return ONLY valid JSON with this exact shape:',
      '{',
      '  "whenToUse": "",',
      '  "symptoms": [],',
      '  "requiredInfo": [],',
      '  "neverUseWhen": "",',
      '  "pairsWith": []',
      '}',
      'Task title: Check & Tighten < 20 stones',
      'Category: stone_setting',
    ].join('\n')

    const { status, payload } = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 4000, responseMimeType: 'application/json' },
    })

    expect(status, JSON.stringify(payload?.error)).toBe(200)

    const text = extractText(payload)
    expect(text.length).toBeGreaterThan(0)

    let parsed
    try { parsed = JSON.parse(text) } catch {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    }

    expect(parsed, `Could not parse JSON from: ${text.slice(0, 200)}`).not.toBeNull()
    expect(typeof parsed.whenToUse).toBe('string')
    expect(Array.isArray(parsed.symptoms)).toBe(true)
    expect(parsed.symptoms.length).toBeGreaterThan(0)
    expect(Array.isArray(parsed.requiredInfo)).toBe(true)
    expect(typeof parsed.neverUseWhen).toBe('string')
    expect(Array.isArray(parsed.pairsWith)).toBe(true)
  }, 30000)
})

describe('parse-smart-intake — real Gemini output', () => {
  it('extracts ring sizing details from natural language input', async () => {
    const prompt = [
      'You are parsing jewelry repair intake text into structured data.',
      'Return ONLY valid JSON with this exact shape:',
      '{',
      '  "metalType": "gold|silver|platinum|costume|",',
      '  "karat": "",',
      '  "goldColor": "yellow|white|rose|",',
      '  "isRing": false,',
      '  "currentRingSize": "",',
      '  "desiredRingSize": "",',
      '  "taskHints": [],',
      '  "normalizedSummary": "",',
      '  "confidence": 0.0,',
      '  "matchedTaskIds": []',
      '}',
      'Input text: I need to resize my 14k yellow gold ring from a size 6 to a size 8',
    ].join('\n')

    const { status, payload } = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 8000, responseMimeType: 'application/json' },
    })

    expect(status, JSON.stringify(payload?.error)).toBe(200)

    const text = extractText(payload)
    let parsed
    try { parsed = JSON.parse(text) } catch {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    }

    expect(parsed, `Could not parse JSON from: ${text.slice(0, 200)}`).not.toBeNull()
    expect(parsed.isRing).toBe(true)
    expect(parsed.metalType).toBe('gold')
    expect(parsed.goldColor).toBe('yellow')
    expect(parsed.currentRingSize).toBe('6')
    expect(parsed.desiredRingSize).toBe('8')
    expect(parsed.confidence).toBeGreaterThan(0.5)
  }, 30000)

  it('correctly identifies a non-ring item (necklace chain)', async () => {
    const prompt = [
      'You are parsing jewelry repair intake text into structured data.',
      'Return ONLY valid JSON:',
      '{ "isRing": false, "metalType": "", "taskHints": [], "normalizedSummary": "", "confidence": 0.0 }',
      'Rules: isRing must be true ONLY if the item is explicitly a ring or band.',
      'Input text: My silver necklace chain is broken and needs to be soldered',
    ].join('\n')

    const { status, payload } = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 500, responseMimeType: 'application/json' },
    })

    expect(status, JSON.stringify(payload?.error)).toBe(200)

    const text = extractText(payload)
    let parsed
    try { parsed = JSON.parse(text) } catch {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    }

    expect(parsed).not.toBeNull()
    expect(parsed.isRing).toBe(false)
    expect(parsed.metalType).toBe('silver')
  }, 30000)
})

describe('describe-item-image — real Gemini output (text-only fallback)', () => {
  it('returns a coherent jewelry description from a text prompt', async () => {
    // Vision requires a real image — this test verifies the model accepts
    // the prompt format and returns a usable text response using a described item.
    const prompt = [
      'You are a jewelry visual-description assistant.',
      'Describe only what the jewelry piece looks like.',
      'Focus on visible colors, details, stone arrangement, and style.',
      'Return 1-3 concise sentences suitable for a customer-facing item description field.',
      'Output plain text only, no markdown.',
      'Describe this item: a yellow gold engagement ring with a round brilliant center diamond and a pavé diamond band.',
    ].join(' ')

    const { status, payload } = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 4000 },
    })

    expect(status, JSON.stringify(payload?.error)).toBe(200)

    const text = extractText(payload)
    expect(text.length).toBeGreaterThan(20)
    expect(text).toMatch(/gold|diamond|ring/i)
  }, 30000)
})
