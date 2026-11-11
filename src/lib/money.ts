// Money is stored and computed as integer cents (D-004). Never use floating
// point dollars for arithmetic: 0.1 + 0.2 !== 0.3.

/** Smallest gift we accept: $1.00. */
export const MIN_DONATION_CENTS = 100;
/** Largest single gift we accept for now: $10,000.00. */
export const MAX_DONATION_CENTS = 1_000_000;

// Whole dollars with an optional 1–2 digit cents part: "5", "5.5", "5.50".
// No signs, exponents, thousands separators or currency symbols.
const DOLLAR_AMOUNT = /^\d{1,7}(\.\d{1,2})?$/;

/**
 * Converts a dollar amount typed by a user ("5", "5.50", or the number 5.5)
 * to integer cents (500, 550). Returns null if the input isn't a plain,
 * non-negative amount with at most two decimal places.
 *
 * Parses the text digit by digit instead of multiplying a float by 100,
 * which can be off by one cent (e.g. 1.13 * 100 = 112.99999999999999).
 */
export function parseDollarsToCents(input: string | number): number | null {
  const text =
    typeof input === "number" ? (Number.isFinite(input) ? String(input) : "") : input.trim();
  if (!DOLLAR_AMOUNT.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Formats integer cents for display, e.g. formatCents(1050) → "$10.50". */
export function formatCents(cents: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
