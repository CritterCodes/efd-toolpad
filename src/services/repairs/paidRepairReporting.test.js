import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'

vi.mock('@/app/api/repairs/model', () => ({
  default: { findById: vi.fn() },
}))
vi.mock('@/app/api/repair-invoices/model', () => ({
  default: { updateByInvoiceID: vi.fn() },
}))

import RepairsModel from '@/app/api/repairs/model'
import RepairInvoicesModel from '@/app/api/repair-invoices/model'
import {
  buildUserData,
  isReportableRepair,
  reportPaidInvoiceToMeta,
} from './paidRepairReporting.js'

const sha = (v) => createHash('sha256').update(v).digest('hex')

const retailRepair = (over = {}) => ({
  repairID: 'repair-abc',
  leadSource: 'retail-chat',
  clientEmail: 'dana@example.com',
  clientPhone: '(479) 555-0188',
  attribution: { fbc: 'fb.1.123.CLICKID', fbp: 'fb.1.456.789' },
  ...over,
})

const paidInvoice = (over = {}) => ({
  invoiceID: 'rinv-1234',
  paymentStatus: 'paid',
  total: 185.5,
  amountPaid: 185.5,
  paidAt: new Date('2026-07-28T15:00:00Z'),
  repairIDs: ['repair-abc'],
  ...over,
})

describe('isReportableRepair', () => {
  it('accepts a charged retail lead from the shop form', () => {
    expect(isReportableRepair(retailRepair())).toBe(true)
  })

  it('rejects leads that did not come from the shop form', () => {
    expect(isReportableRepair(retailRepair({ leadSource: 'walk-in' }))).toBe(false)
    expect(isReportableRepair(retailRepair({ leadSource: undefined }))).toBe(false)
  })

  it('never reports wholesale', () => {
    expect(isReportableRepair(retailRepair({ isWholesale: true }))).toBe(false)
    expect(isReportableRepair(retailRepair({ billing: { mode: 'wholesale' } }))).toBe(false)
  })

  it('rejects comped and internal work, where the customer paid nothing', () => {
    expect(isReportableRepair(retailRepair({ compRepair: true }))).toBe(false)
    expect(isReportableRepair(retailRepair({ includedWithSale: true }))).toBe(false)
    expect(isReportableRepair(retailRepair({ billing: { mode: 'comped' } }))).toBe(false)
    expect(isReportableRepair(retailRepair({ billing: { mode: 'internal' } }))).toBe(false)
  })

  it('handles a missing repair without throwing', () => {
    expect(isReportableRepair(null)).toBe(false)
    expect(isReportableRepair(undefined)).toBe(false)
  })
})

describe('buildUserData', () => {
  it('hashes email and phone, and passes click ids through unhashed', () => {
    const ud = buildUserData(retailRepair())
    expect(ud.em).toEqual([sha('dana@example.com')])
    expect(ud.ph).toEqual([sha('14795550188')])
    expect(ud.fbc).toBe('fb.1.123.CLICKID')
    expect(ud.fbp).toBe('fb.1.456.789')
  })

  it('normalises before hashing', () => {
    const ud = buildUserData(retailRepair({ clientEmail: '  Dana@Example.COM ' }))
    expect(ud.em).toEqual([sha('dana@example.com')])
  })

  it('never emits raw contact details', () => {
    const serialised = JSON.stringify(buildUserData(retailRepair()))
    expect(serialised).not.toContain('dana@example.com')
    expect(serialised).not.toContain('555-0188')
  })

  it('falls back to leadContact when canonical fields are absent (older leads)', () => {
    const emailOnly = buildUserData({ leadContact: 'old@example.com' })
    expect(emailOnly.em).toEqual([sha('old@example.com')])
    expect(emailOnly.ph).toBeUndefined()

    const phoneOnly = buildUserData({ leadContact: '4795550188' })
    expect(phoneOnly.ph).toEqual([sha('14795550188')])
    expect(phoneOnly.em).toBeUndefined()
  })

  it('falls back to the notes Contact: prefix as a last resort', () => {
    const ud = buildUserData({ notes: 'Contact: legacy@example.com' })
    expect(ud.em).toEqual([sha('legacy@example.com')])
  })

  it('omits click ids when the visit had no ad click', () => {
    const ud = buildUserData(retailRepair({ attribution: {} }))
    expect(ud.fbc).toBeUndefined()
    expect(ud.fbp).toBeUndefined()
    expect(ud.em).toBeDefined()
  })
})

describe('reportPaidInvoiceToMeta', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...OLD_ENV, META_CAPI_ACCESS_TOKEN: 'tok', META_PIXEL_ID: '123' }
    RepairsModel.findById.mockResolvedValue(retailRepair())
    RepairInvoicesModel.updateByInvoiceID.mockResolvedValue({})
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events_received: 1 }),
    })
  })

  afterEach(() => {
    process.env = OLD_ENV
    vi.unstubAllGlobals()
  })

  const sentBody = () => JSON.parse(global.fetch.mock.calls[0][1].body)

  it('sends one Purchase event with the invoice total', async () => {
    const res = await reportPaidInvoiceToMeta(paidInvoice())
    expect(res).toEqual({ sent: 1 })

    const body = sentBody()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].event_name).toBe('Purchase')
    expect(body.data[0].custom_data.value).toBe(185.5)
    expect(body.data[0].custom_data.currency).toBe('USD')
    expect(body.data[0].action_source).toBe('physical_store')
  })

  it('sends event_time in seconds, not milliseconds', async () => {
    await reportPaidInvoiceToMeta(paidInvoice())
    const { event_time } = sentBody().data[0]
    expect(event_time).toBe(Math.floor(new Date('2026-07-28T15:00:00Z').getTime() / 1000))
    expect(String(event_time)).toHaveLength(10)
  })

  it('uses a stable event_id so retries deduplicate', async () => {
    await reportPaidInvoiceToMeta(paidInvoice())
    expect(sentBody().data[0].event_id).toBe('repair-invoice-rinv-1234')
  })

  it('records the marker only after Meta accepts', async () => {
    await reportPaidInvoiceToMeta(paidInvoice())
    expect(RepairInvoicesModel.updateByInvoiceID).toHaveBeenCalledWith(
      'rinv-1234',
      expect.objectContaining({ metaPurchaseEventID: 'repair-invoice-rinv-1234' })
    )
  })

  it('does not record the marker when Meta rejects, so it can be retried', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid access token' } }),
    })
    const res = await reportPaidInvoiceToMeta(paidInvoice())
    expect(res.sent).toBe(0)
    expect(RepairInvoicesModel.updateByInvoiceID).not.toHaveBeenCalled()
  })

  it('is idempotent — a reopened and re-paid invoice does not report twice', async () => {
    const res = await reportPaidInvoiceToMeta(paidInvoice({ metaPurchaseSentAt: new Date() }))
    expect(res).toEqual({ sent: 0, reason: 'already reported' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('skips unpaid invoices', async () => {
    const res = await reportPaidInvoiceToMeta(paidInvoice({ paymentStatus: 'partial' }))
    expect(res.reason).toBe('not paid')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('skips zero-total invoices (a comped job can be legitimately paid)', async () => {
    const res = await reportPaidInvoiceToMeta(paidInvoice({ total: 0 }))
    expect(res.reason).toBe('zero total')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('skips invoices with no reportable repairs', async () => {
    RepairsModel.findById.mockResolvedValue(retailRepair({ isWholesale: true }))
    const res = await reportPaidInvoiceToMeta(paidInvoice())
    expect(res.reason).toBe('no reportable repairs')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('skips silently when the integration is unconfigured', async () => {
    delete process.env.META_CAPI_ACCESS_TOKEN
    const res = await reportPaidInvoiceToMeta(paidInvoice())
    expect(res.reason).toBe('not configured')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('reports the invoice value once for a multi-repair invoice', async () => {
    RepairsModel.findById
      .mockResolvedValueOnce(retailRepair({ repairID: 'r1', attribution: {} }))
      .mockResolvedValueOnce(retailRepair({ repairID: 'r2' }))

    await reportPaidInvoiceToMeta(paidInvoice({ repairIDs: ['r1', 'r2'] }))
    const body = sentBody()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].custom_data.value).toBe(185.5)
    // Attributed to the repair that actually carries the ad click.
    expect(body.data[0].user_data.fbc).toBe('fb.1.123.CLICKID')
    expect(body.data[0].custom_data.num_items).toBe(2)
  })

  it('survives a repair that cannot be loaded', async () => {
    RepairsModel.findById
      .mockRejectedValueOnce(new Error('Repair not found.'))
      .mockResolvedValueOnce(retailRepair())
    const res = await reportPaidInvoiceToMeta(paidInvoice({ repairIDs: ['gone', 'repair-abc'] }))
    expect(res).toEqual({ sent: 1 })
  })

  it('never throws, whatever goes wrong', async () => {
    global.fetch.mockRejectedValue(new Error('network down'))
    await expect(reportPaidInvoiceToMeta(paidInvoice())).resolves.toEqual(
      expect.objectContaining({ sent: 0 })
    )
  })

  it('forwards a test event code when set', async () => {
    process.env.META_CAPI_TEST_EVENT_CODE = 'TEST123'
    await reportPaidInvoiceToMeta(paidInvoice())
    expect(sentBody().test_event_code).toBe('TEST123')
  })
})
