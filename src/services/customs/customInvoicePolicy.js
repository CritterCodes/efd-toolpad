const PLACEHOLDER_DOMAINS = new Set(['example.com', 'example.test', 'test.com']);

export function isBillableEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split('@')[1];
  return !PLACEHOLDER_DOMAINS.has(domain) && !domain.endsWith('.test');
}

export function calculateCustomInvoice({ type, amount, depositPct, dueDays, progress }) {
  const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const projectTotal = round(progress?.projectTotal);
  const totalPaid = round(progress?.totalPaid);
  const totalPending = round(progress?.totalPending);
  const available = round(Math.max(0, projectTotal - totalPaid - totalPending));
  let resolvedAmount;

  if (type === 'deposit') {
    const percent = Number(depositPct ?? 50);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      throw new Error('Deposit percentage must be between 1 and 100.');
    }
    resolvedAmount = round(projectTotal * percent / 100);
  } else if (type === 'final') {
    resolvedAmount = available;
  } else {
    resolvedAmount = round(amount);
  }

  if (projectTotal <= 0) throw new Error('The published quote must have a positive total.');
  if (resolvedAmount <= 0) throw new Error('Invoice amount must be greater than zero.');
  if (resolvedAmount > available) {
    throw new Error(`Invoice exceeds the uninvoiced balance of $${available.toFixed(2)}.`);
  }

  return {
    amount: resolvedAmount,
    dueDays: Math.max(1, Math.min(90, Number(dueDays) || 7)),
    available,
  };
}
