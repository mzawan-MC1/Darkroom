export function formatCurrency(amount: number | string | null | undefined, currency: string = 'AED'): string {
  if (amount === null || amount === undefined) {
    return `${currency} 0.00`;
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${numAmount.toFixed(2)}`;
}

export function formatPrice(amount: number | string | null | undefined): string {
  return formatCurrency(amount, 'AED');
}

export function roundToTwoDecimals(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined) {
    return 0;
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return 0;
  }

  return Math.round(numAmount * 100) / 100;
}
