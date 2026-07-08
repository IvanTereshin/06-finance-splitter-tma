const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function assertCents(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer amount in cents.`);
  }
}

export function formatCents(cents: number): string {
  assertCents(cents, 'cents');
  const sign = cents < 0 ? '-' : '';
  return `${sign}${currencyFormatter.format(Math.abs(cents) / 100)}`;
}

export function parseCentsInput(value: string): number {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return Number.NaN;
  }

  return Number(normalized);
}
