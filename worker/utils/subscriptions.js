import { ObjectId } from "mongodb";
import { getProduct } from "./products.js";

/*
 * ============================================================
 * AFRICSOCIAL SUBSCRIPTION HELPERS
 * ============================================================
 *
 * IMPORTANT:
 * - Subscriptions must only be activated after verified payment.
 * - Product definitions come from products.js.
 * - Clients must never supply the authoritative price.
 * - Legacy Premium has no expiration date.
 */

/**
 * Convert a user ID into MongoDB ObjectId safely.
 */
export function toObjectId(userId) {
  if (!userId) return null;

  if (userId instanceof ObjectId) {
    return userId;
  }

  try {
    return new ObjectId(String(userId));
  } catch {
    return null;
  }
}

/**
 * Calculate the expiration date for a product.
 *
 * Legacy Premium returns null because it never expires.
 */
export function calculateSubscriptionExpiry(
  product,
  startedAt = new Date()
) {
  if (!product) return null;

  if (product.neverExpires === true) {
    return null;
  }

  if (
    !Number.isFinite(product.durationDays) ||
    product.durationDays <= 0
  ) {
    return null;
  }

  const start = new Date(startedAt);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid subscription start date.");
  }

  const expiresAt = new Date(start);

  expiresAt.setUTCDate(
    expiresAt.getUTCDate() + product.durationDays
  );

  return expiresAt;
}

/**
 * Determine whether a subscription is currently active.
 *
 * Legacy subscriptions remain active when expiresAt is null.
 */
export function isSubscriptionActive(
  subscription,
  now = new Date()
) {
  if (!subscription) return false;

  if (subscription.status !== "active") {
    return false;
  }

  if (
    subscription.plan === "legacy" ||
    subscription.neverExpires === true
  ) {
    return subscription.expiresAt == null;
  }

  if (!subscription.expiresAt) {
    return false;
  }

  const expiresAt = new Date(subscription.expiresAt);

  return (
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt > now
  );
}

/**
 * Calculate the start date for a new paid subscription.
 *
 * If the user already has an active normal Premium subscription,
 * the new subscription begins when the existing one expires.
 *
 * Legacy Premium always starts immediately.
 */
export function calculateSubscriptionStart(
  existingSubscription = null,
  now = new Date()
) {
  if (!existingSubscription) {
    return new Date(now);
  }

  if (
    existingSubscription.plan === "legacy" ||
    existingSubscription.neverExpires === true
  ) {
    return new Date(now);
  }

  if (!existingSubscription.expiresAt) {
    return new Date(now);
  }

  const existingExpiry = new Date(
    existingSubscription.expiresAt
  );

  if (
    Number.isNaN(existingExpiry.getTime()) ||
    existingExpiry <= now
  ) {
    return new Date(now);
  }

  return existingExpiry;
}

/**
 * Build the database record for an activated Premium subscription.
 *
 * This function does NOT write to MongoDB.
 * It should only be called after payment verification.
 */
export function buildSubscriptionRecord({
  userId,
  productId,
  amount,
  currency = "NGN",
  paymentProvider = null,
  transactionReference = null,
  gatewayReference = null,
  existingSubscription = null,
  startedAt = new Date(),
}) {
  const product = getProduct(productId);

  if (!product) {
    throw new Error("Invalid product.");
  }

  if (product.type !== "premium") {
    throw new Error(
      "The selected product is not a Premium subscription."
    );
  }

  const userObjectId = toObjectId(userId);

  if (!userObjectId) {
    throw new Error("Invalid user ID.");
  }

  const normalizedCurrency = String(currency)
    .trim()
    .toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid subscription amount.");
  }

  const start = calculateSubscriptionStart(
    existingSubscription,
    startedAt
  );

  const expiresAt = calculateSubscriptionExpiry(
    product,
    start
  );

  const isLegacy = product.neverExpires === true;

  return {
    user: userObjectId,

    /*
     * Keep both plan and productId.
     *
     * plan:
     *   premium = normal Premium
     *   legacy  = Legacy Premium
     */
    plan: isLegacy ? "legacy" : "premium",

    productId: product.id,

    status: "active",

    amount,
    currency: normalizedCurrency,

    startedAt: start,
    expiresAt,

    neverExpires: isLegacy,

    paymentProvider,
    transactionReference,
    gatewayReference,

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Return a safe subscription representation for API responses.
 */
export function cleanSubscription(subscription) {
  if (!subscription) return null;

  return {
    _id:
      subscription._id?.toString?.() ||
      subscription._id ||
      null,

    user:
      subscription.user?.toString?.() ||
      subscription.user ||
      null,

    plan: subscription.plan || null,

    productId: subscription.productId || null,

    status: subscription.status || null,

    amount:
      Number.isFinite(subscription.amount)
        ? subscription.amount
        : null,

    currency: subscription.currency || null,

    startedAt: subscription.startedAt || null,

    expiresAt: subscription.expiresAt || null,

    neverExpires:
      subscription.neverExpires === true ||
      subscription.plan === "legacy",

    paymentProvider:
      subscription.paymentProvider || null,
  };
}
