import { currentLocale } from "./locale";

/**
 * Money, exactly as the API sends it: integer minor units and the currency they
 * are in. Never a float, and never a bare number without its currency attached.
 *
 * The backend's rule is that money is integer cents in transit as well as in
 * storage, and that formatting is the frontend's job. This is the frontend
 * doing its job, in one place.
 */
export type Money = {
  currency: string;
  amount: number;
};

/**
 * `{ currency: "USD", amount: 1200 }` becomes `"$12"`.
 *
 * **Formatted against the site's locale, never the browser's.** `Intl` defaults
 * to the browser's when passed `undefined`, which would render a US visitor's
 * price as `10,00 $` for anyone whose laptop is set to German. The currency
 * varies by visitor; the language it is written in does not.
 *
 * **Trailing `.00` is dropped**, because the design says `$12` and not `$12.00`.
 * A price that is not a whole unit keeps both decimals, so `1250` is `$12.50`
 * rather than a number rounded quietly into something the customer is not
 * charged.
 */
export function formatPrice({ currency, amount }: Money): string {
  const whole = amount % 100 === 0;

  return new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount / 100);
}
