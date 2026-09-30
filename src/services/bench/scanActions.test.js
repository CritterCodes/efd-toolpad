import { describe, it, expect, vi } from 'vitest';
import { SCAN_ACTIONS, scanActionByKey, runScanAction, summarizeScanRun } from './scanActions';

/**
 * Scanning could only ever CLAIM (owner, 2026-09-30). These pin the two dispatch shapes the workflow
 * forced on it: a real transition has its own route and goes one at a time, a plain status move goes
 * to the bulk endpoint in a single call.
 */
const okRes = { ok: true, json: async () => ({}) };
const errRes = (error) => ({ ok: false, json: async () => ({ error }) });

describe('the actions a scan can run', () => {
  it('offers claim, QC, parts, communications and back-to-work', () => {
    expect(SCAN_ACTIONS.map((a) => a.key)).toEqual(['claim', 'qc', 'parts', 'comms', 'ready']);
    expect(scanActionByKey('qc')).toMatchObject({ mode: 'per-repair' });
    expect(scanActionByKey('comms')).toMatchObject({ mode: 'bulk', status: 'COMMUNICATION REQUIRED' });
    expect(scanActionByKey('nonsense')).toBeNull();
  });
});

describe('per-repair actions', () => {
  it('calls the workflow route once per ticket', async () => {
    const fetchImpl = vi.fn(async () => okRes);
    const out = await runScanAction({ action: scanActionByKey('qc'), repairIDs: ['r-1', 'r-2'], fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledWith('/api/repairs/r-1/move-to-qc', { method: 'POST' });
    expect(out).toEqual({ ok: ['r-1', 'r-2'], failed: [] });
  });

  it('lets one ticket fail without taking the batch with it', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('r-2') ? errRes('Not yours to move.') : okRes));
    const out = await runScanAction({ action: scanActionByKey('claim'), repairIDs: ['r-1', 'r-2', 'r-3'], fetchImpl });

    expect(out.ok).toEqual(['r-1', 'r-3']);
    expect(out.failed).toEqual([{ repairID: 'r-2', error: 'Not yours to move.' }]);
  });
});

describe('bulk status moves', () => {
  it('sends the whole queue in one call', async () => {
    const fetchImpl = vi.fn(async () => okRes);
    const out = await runScanAction({ action: scanActionByKey('parts'), repairIDs: ['r-1', 'r-2'], fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/repairs/move');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ repairIDs: ['r-1', 'r-2'], status: 'NEEDS PARTS' });
    expect(out.ok).toEqual(['r-1', 'r-2']);
  });

  it('fails the whole queue together, because the server applied it as one statement', async () => {
    const fetchImpl = vi.fn(async () => errRes('Parts capability required.'));
    const out = await runScanAction({ action: scanActionByKey('parts'), repairIDs: ['r-1', 'r-2'], fetchImpl });

    expect(out.ok).toEqual([]);
    expect(out.failed).toEqual([
      { repairID: 'r-1', error: 'Parts capability required.' },
      { repairID: 'r-2', error: 'Parts capability required.' },
    ]);
  });
});

describe('the queue itself', () => {
  it('dedupes and ignores blanks — a scanner double-reads', async () => {
    const fetchImpl = vi.fn(async () => okRes);
    const out = await runScanAction({ action: scanActionByKey('claim'), repairIDs: ['r-1', ' r-1 ', '', null, 'r-2'], fetchImpl });
    expect(out.ok).toEqual(['r-1', 'r-2']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does nothing with nothing, and never throws on a dead network', async () => {
    expect(await runScanAction({ action: scanActionByKey('claim'), repairIDs: [] })).toEqual({ ok: [], failed: [] });
    const dead = vi.fn(async () => { throw new Error('offline'); });
    const out = await runScanAction({ action: scanActionByKey('qc'), repairIDs: ['r-1'], fetchImpl: dead });
    expect(out.failed).toEqual([{ repairID: 'r-1', error: 'offline' }]);
  });
});

describe('what the jeweler is told', () => {
  it('names what moved and what did not', () => {
    const action = scanActionByKey('qc');
    expect(summarizeScanRun({ action, ok: ['r-1', 'r-2'] })).toEqual({ text: 'Sent to QC 2 repairs.', severity: 'success' });
    expect(summarizeScanRun({ action, ok: ['r-1'], failed: [{ repairID: 'r-2', error: 'nope' }] })).toMatchObject({ severity: 'warning' });
    expect(summarizeScanRun({ action, ok: [], failed: [{ repairID: 'r-2', error: 'nope' }] })).toMatchObject({ severity: 'error' });
    expect(summarizeScanRun({ action })).toMatchObject({ text: 'Nothing to do.' });
  });
});
