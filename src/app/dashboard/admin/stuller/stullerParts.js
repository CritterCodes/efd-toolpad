export function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export function identifierHelperText(label) {
  return `${label} can be pasted one per line or comma separated.`;
}

