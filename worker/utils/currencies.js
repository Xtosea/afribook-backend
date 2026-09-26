/*
 * ============================================================
 * AFRICSOCIAL CURRENCY CONFIGURATION
 * ============================================================
 *
 * This file defines supported display/payment currencies.
 *
 * IMPORTANT:
 * Currency availability is NOT the same thing as payment-provider
 * availability. Paystack/Flutterwave support will be checked separately
 * when the payment layer is implemented.
 */

export const SUPPORTED_CURRENCIES = Object.freeze({
  NGN: Object.freeze({
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    country: "NG",
    countryName: "Nigeria",
    default: true,
  }),

  GHS: Object.freeze({
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "GH₵",
    country: "GH",
    countryName: "Ghana",
    default: false,
  }),

  KES: Object.freeze({
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    country: "KE",
    countryName: "Kenya",
    default: false,
  }),

  ZAR: Object.freeze({
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    country: "ZA",
    countryName: "South Africa",
    default: false,
  }),

  USD: Object.freeze({
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    country: null,
    countryName: "International",
    default: false,
  }),
});

export const COUNTRY_CURRENCY = Object.freeze({
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
});

export function normalizeCurrency(currency) {
  const code = String(currency || "NGN").trim().toUpperCase();

  return SUPPORTED_CURRENCIES[code] ? code : null;
}

export function getCurrency(currency) {
  const code = normalizeCurrency(currency);

  return code ? SUPPORTED_CURRENCIES[code] : null;
}

export function getCurrencyForCountry(countryCode) {
  if (!countryCode) return "NGN";

  const code = String(countryCode).trim().toUpperCase();

  return COUNTRY_CURRENCY[code] || "USD";
}

export function listCurrencies() {
  return Object.values(SUPPORTED_CURRENCIES);
}
