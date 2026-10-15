/**
 * CivicSphere AI — Currency Formatting Utilities
 * Standardizes Nigerian Naira (NGN) formatting across the application.
 * Uses Intl.NumberFormat with locale 'en-NG' and currency 'NGN'.
 */

export interface CurrencyFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formats a numeric monetary amount into Nigerian Naira (NGN) with the official ₦ symbol.
 * Example: 568480 -> "₦568,480"
 */
export function formatNaira(
  amount: number | null | undefined,
  options?: CurrencyFormatOptions
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

/**
 * Strips formatting to parse raw numeric input from formatted currency strings.
 */
export function parseNairaInput(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) return undefined;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}
