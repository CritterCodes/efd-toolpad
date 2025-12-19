export type Id = string;

// In-memory demo store (non-production)
type StepInputs = {
  materialsCost: number;
  laborHours: number;
  laborBaseRate: number;
  otherDirectCosts?: number;
  materialMarkupRate: number;
  laborMarkupRate: number;
  taxabilityFlags?: { materials?: boolean; labor?: boolean; other?: boolean };
};

type Step = { id: Id; name?: string; inputs: StepInputs };
type Process = { id: Id; name?: string; steps: Step[] };
type LineItem = { id: Id; name?: string; processes: Process[] };
type Estimate = { id: Id; isDemo: boolean; lineItems: LineItem[] };

const db: { estimates: Record<Id, Estimate> } = { estimates: {} };

let idCounter = 1;
function genId(prefix: string): Id {
  return `${prefix}-${idCounter++}`;
}

const DEFAULT_TAX_RATE = 0.0825; // 8.25% demo

export async function createEstimate(): Promise<Id> {
  const id = 'demo-estimate-id';
  db.estimates[id] = { id, isDemo: true, lineItems: [] };
  return id;
}

export async function addLineItem(estimateId: Id, payload: { name?: string }): Promise<Id> {
  const li: LineItem = { id: genId('li'), name: payload?.name, processes: [] };
  db.estimates[estimateId]?.lineItems.push(li);
  return li.id;
}

export async function addProcess(lineItemId: Id, payload: { name?: string }): Promise<Id> {
  const proc: Process = { id: genId('proc'), name: payload?.name, steps: [] };
  // find LI across all estimates
  for (const est of Object.values(db.estimates)) {
    const li = est.lineItems.find((l) => l.id === lineItemId);
    if (li) {
      li.processes.push(proc);
      break;
    }
  }
  return proc.id;
}

export async function addStep(processId: Id, payload: { name?: string; inputs: StepInputs }): Promise<Id> {
  const step: Step = { id: genId('step'), name: payload?.name, inputs: payload.inputs };
  for (const est of Object.values(db.estimates)) {
    for (const li of est.lineItems) {
      const pr = li.processes.find((p) => p.id === processId);
      if (pr) {
        pr.steps.push(step);
        return step.id;
      }
    }
  }
  return step.id;
}

export async function recalculate(estimateId: Id): Promise<{ totals: Record<string, number> }> {
  const est = db.estimates[estimateId];
  if (!est) return { totals: {} };

  let invoiceSubtotal = 0;
  let taxableBase = 0;
  const taxRate = DEFAULT_TAX_RATE;

  for (const li of est.lineItems) {
    for (const pr of li.processes) {
      for (const st of pr.steps) {
        const s = st.inputs;
        const materialsPrice = s.materialsCost * (1 + s.materialMarkupRate);
        const laborCost = s.laborHours * s.laborBaseRate;
        const laborPrice = laborCost * (1 + s.laborMarkupRate);
        const other = s.otherDirectCosts ?? 0;
        const stepSubtotal = materialsPrice + laborPrice + other;
        invoiceSubtotal += stepSubtotal;

        const materialsTaxable = s.taxabilityFlags?.materials ?? true;
        const laborTaxable = s.taxabilityFlags?.labor ?? false;
        const otherTaxable = s.taxabilityFlags?.other ?? false;
        if (materialsTaxable) taxableBase += materialsPrice;
        if (laborTaxable) taxableBase += laborPrice;
        if (otherTaxable) taxableBase += other;
      }
    }
  }

  const taxAmount = taxableBase * taxRate;
  const total = invoiceSubtotal + taxAmount;
  const amountDue = total; // no deposits in demo flow

  return {
    totals: {
      subtotal: round2(invoiceSubtotal),
      discountAmount: 0,
      taxableBase: round2(taxableBase),
      taxAmount: round2(taxAmount),
      total: round2(total),
      amountDue: round2(amountDue),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


