"use client";
import React from 'react';
import EstimateTree from '../../../components/repair-costing/EstimateTree';
import DetailPanel from '../../../components/repair-costing/DetailPanel';
import TotalsSummary from '../../../components/repair-costing/TotalsSummary';
import DrilldownView from '../../../components/repair-costing/DrilldownView';
import { createEstimate, addLineItem, addProcess, addStep, recalculate } from '../../../services/repairCostingApi';

export default function RepairCostingPage(): JSX.Element {
  const [estimateId, setEstimateId] = React.useState<string | undefined>();
  const [totals, setTotals] = React.useState<Record<string, unknown> | undefined>();
  const [busy, setBusy] = React.useState<boolean>(false);
  const [log, setLog] = React.useState<string[]>([]);

  async function runDemo(): Promise<void> {
    setBusy(true);
    setLog([]);
    try {
      const eid = await createEstimate();
      setEstimateId(eid);
      setLog((l) => [...l, `Created estimate ${eid}`]);
      const li = await addLineItem(eid, { name: 'Ring Resize' });
      setLog((l) => [...l, `Added line item ${li}`]);
      const pr = await addProcess(li, { name: 'Solder new bar' });
      setLog((l) => [...l, `Added process ${pr}`]);
      const st = await addStep(pr, {
        name: 'Fit bar and solder',
        inputs: {
          materialsCost: 75,
          laborHours: 1.5,
          laborBaseRate: 80,
          otherDirectCosts: 10,
          materialMarkupRate: 0.35,
          laborMarkupRate: 0.5,
        },
      });
      setLog((l) => [...l, `Added step ${st}`]);
      const res = await recalculate(eid);
      setTotals((res as any)?.totals ?? {});
      setLog((l) => [...l, 'Recalculated totals']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div aria-label="Repair Costing Demo">
      <header>
        <h1>Repair Costing (Demo)</h1>
        <span>Demo / Preview</span>
        <div style={{ marginTop: 8 }}>
          <button onClick={runDemo} disabled={busy} aria-busy={busy}>
            {busy ? 'Running…' : 'Run Demo Flow'}
          </button>
          {estimateId ? <span style={{ marginLeft: 12 }}>Estimate: {estimateId}</span> : null}
        </div>
      </header>
      <main>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'start' }}>
          <section aria-label="Hierarchy Tree">
            <EstimateTree />
          </section>
          <section aria-label="Detail Panel">
            <DetailPanel />
            <div style={{ marginTop: 16 }}>
              <DrilldownView />
            </div>
          </section>
        </div>
        <footer aria-label="Totals Summary" style={{ marginTop: 16 }}>
          <TotalsSummary totals={totals as any} />
        </footer>
        <section aria-label="Demo Log" style={{ marginTop: 16 }}>
          <pre>{log.join('\n')}</pre>
        </section>
      </main>
    </div>
  );
}


