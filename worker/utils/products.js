/*
 * ============================================================
 * AFRICSOCIAL PRODUCT CATALOG
 * ============================================================
 *
 * IMPORTANT:
 * - Product IDs are stable identifiers.
 * - Prices are authoritative on the backend.
 * - Clients must never be trusted to submit their own amount.
 * - Foreign-currency prices can be added deliberately per market.
 *
 * Product families:
 *   premium       = Marketplace Premium
 *   boost         = Boost existing AfricSocial content
 *   advertisement = Business advertising campaign
 */

export const PRODUCT_TYPES = Object.freeze({
  PREMIUM: "premium",
  BOOST: "boost",
  ADVERTISEMENT: "advertisement",
});

export const PRODUCTS = Object.freeze({
  /* ==========================================================
   * MARKETPLACE PREMIUM
   * ========================================================== */

  premium_monthly: Object.freeze({
    id: "premium_monthly",
    type: PRODUCT_TYPES.PREMIUM,
    name: "Premium Monthly",
    description: "AfricSocial Marketplace Premium for 30 days.",
    durationDays: 30,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 5000,
    }),
    benefits: Object.freeze([
      "Premium seller status",
      "Up to 10 product images per listing",
      "Premium seller badge",
      "Premium Marketplace features",
      "Seller visibility features",
    ]),
  }),

  premium_3_months: Object.freeze({
    id: "premium_3_months",
    type: PRODUCT_TYPES.PREMIUM,
    name: "Premium 3 Months",
    description: "AfricSocial Marketplace Premium for 90 days.",
    durationDays: 90,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 12000,
    }),
    benefits: Object.freeze([
      "Premium seller status",
      "Up to 10 product images per listing",
      "Premium seller badge",
      "Premium Marketplace features",
      "Seller visibility features",
    ]),
  }),

  premium_yearly: Object.freeze({
    id: "premium_yearly",
    type: PRODUCT_TYPES.PREMIUM,
    name: "Premium Yearly",
    description: "AfricSocial Marketplace Premium for 365 days.",
    durationDays: 365,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 40000,
    }),
    benefits: Object.freeze([
      "Premium seller status",
      "Up to 10 product images per listing",
      "Premium seller badge",
      "Premium Marketplace features",
      "Seller visibility features",
    ]),
  }),

  premium_legacy: Object.freeze({
    id: "premium_legacy",
    type: PRODUCT_TYPES.PREMIUM,
    name: "Legacy Premium",
    description:
      "Special AfricSocial Premium membership with no expiration.",
    durationDays: null,
    neverExpires: true,
    prices: Object.freeze({
      NGN: 100000,
    }),
    benefits: Object.freeze([
      "Premium seller status",
      "No Premium expiration",
      "Up to 10 product images per listing",
      "Premium seller badge",
      "Legacy badge",
      "Premium Marketplace features",
      "Seller visibility features",
    ]),
  }),

  /* ==========================================================
   * BOOST PACKAGES
   * ========================================================== */

  boost_starter: Object.freeze({
    id: "boost_starter",
    type: PRODUCT_TYPES.BOOST,
    name: "Starter Boost",
    description: "Small boost for quick local awareness.",
    durationDays: 2,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 1000,
    }),
  }),

  boost_growth: Object.freeze({
    id: "boost_growth",
    type: PRODUCT_TYPES.BOOST,
    name: "Growth Boost",
    description: "Boost your content for wider visibility.",
    durationDays: 4,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 2000,
    }),
  }),

  boost_business: Object.freeze({
    id: "boost_business",
    type: PRODUCT_TYPES.BOOST,
    name: "Business Boost",
    description: "Seven-day promotion for products, services and content.",
    durationDays: 7,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 4000,
    }),
  }),

  boost_pro: Object.freeze({
    id: "boost_pro",
    type: PRODUCT_TYPES.BOOST,
    name: "Pro Boost",
    description: "Extended promotion for creators and businesses.",
    durationDays: 10,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 7500,
    }),
  }),

  boost_premium: Object.freeze({
    id: "boost_premium",
    type: PRODUCT_TYPES.BOOST,
    name: "Premium Boost",
    description: "Extended campaign for stronger product awareness.",
    durationDays: 14,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 15000,
    }),
  }),

  boost_enterprise: Object.freeze({
    id: "boost_enterprise",
    type: PRODUCT_TYPES.BOOST,
    name: "Enterprise Boost",
    description: "Long-running promotion for established businesses.",
    durationDays: 30,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 30000,
    }),
  }),

  /* ==========================================================
   * ADVERTISEMENT PACKAGES
   * ========================================================== */

  ad_local_starter: Object.freeze({
    id: "ad_local_starter",
    type: PRODUCT_TYPES.ADVERTISEMENT,
    name: "Local Starter",
    description: "Three-day advertising campaign.",
    durationDays: 3,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 2000,
    }),
  }),

  ad_local_growth: Object.freeze({
    id: "ad_local_growth",
    type: PRODUCT_TYPES.ADVERTISEMENT,
    name: "Local Growth",
    description: "Seven-day advertising campaign.",
    durationDays: 7,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 5000,
    }),
  }),

  ad_business: Object.freeze({
    id: "ad_business",
    type: PRODUCT_TYPES.ADVERTISEMENT,
    name: "Business Reach",
    description: "Seven-day business advertising campaign.",
    durationDays: 7,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 10000,
    }),
  }),

  ad_business_growth: Object.freeze({
    id: "ad_business_growth",
    type: PRODUCT_TYPES.ADVERTISEMENT,
    name: "Business Growth",
    description: "Fourteen-day advertising campaign.",
    durationDays: 14,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 20000,
    }),
  }),

  ad_brand: Object.freeze({
    id: "ad_brand",
    type: PRODUCT_TYPES.ADVERTISEMENT,
    name: "Brand Campaign",
    description: "Thirty-day advertising campaign.",
    durationDays: 30,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 50000,
    }),
  }),

  ad_enterprise: Object.freeze({
    id: "ad_enterprise",
    type: PRODUCT_TYPES.ADVERTISEMENT,
    name: "Enterprise Campaign",
    description: "Large advertising campaign with custom configuration.",
    durationDays: 30,
    neverExpires: false,
    prices: Object.freeze({
      NGN: 100000,
    }),
    customAmountAllowed: true,
    minimumAmount: 100000,
  }),
});

export function getProduct(productId) {
  if (!productId) return null;

  return PRODUCTS[String(productId)] || null;
}

export function getProductPrice(productId, currency = "NGN") {
  const product = getProduct(productId);

  if (!product) return null;

  const normalizedCurrency = String(currency).toUpperCase();

  const amount = product.prices?.[normalizedCurrency];

  return Number.isFinite(amount) ? amount : null;
}

export function listProducts({
  type = null,
  currency = "NGN",
} = {}) {
  const normalizedCurrency = String(currency).toUpperCase();

  return Object.values(PRODUCTS)
    .filter((product) => {
      if (type && product.type !== type) return false;

      return Number.isFinite(product.prices?.[normalizedCurrency]);
    })
    .map((product) => ({
      ...product,
      prices: {
        [normalizedCurrency]: product.prices[normalizedCurrency],
      },
    }));
}
