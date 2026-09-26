import { ObjectId } from "mongodb";
import {
  cleanSubscription,
  isSubscriptionActive,
} from "./subscriptions.js";

/*
 * ============================================================
 * AFRICSOCIAL PREMIUM STATUS
 * ============================================================
 *
 * Premium status comes ONLY from the subscriptions collection.
 *
 * Supported active Premium types:
 *
 *   plan: "premium"
 *   expiresAt: future date
 *
 *   plan: "legacy"
 *   expiresAt: null
 *
 * Never use users.isPremium as the authoritative source.
 */

/**
 * Safely convert a user ID into ObjectId.
 */
function toUserObjectId(userId) {
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
 * Find the user's currently active Premium subscription.
 */
export async function getActivePremiumSubscription(
  db,
  userId
) {
  const objectUserId = toUserObjectId(userId);

  if (!objectUserId) {
    return null;
  }

  const now = new Date();

  /*
   * Legacy:
   *   plan = legacy
   *   status = active
   *   expiresAt = null
   *
   * Normal Premium:
   *   plan = premium
   *   status = active
   *   expiresAt > now
   */
  const candidates = await db
    .collection("subscriptions")
    .find({
      user: objectUserId,
      status: "active",
      $or: [
        {
          plan: "legacy",
          expiresAt: null,
        },
        {
          plan: "premium",
          expiresAt: {
            $gt: now,
          },
        },
      ],
    })
    .sort({
      /*
       * Legacy is handled explicitly by the filter.
       * Newest subscription wins among normal subscriptions.
       */
      createdAt: -1,
    })
    .limit(10)
    .toArray();

  for (const subscription of candidates) {
    if (isSubscriptionActive(subscription, now)) {
      return subscription;
    }
  }

  return null;
}

/**
 * Simple boolean Premium check.
 */
export async function hasActivePremium(db, userId) {
  const subscription =
    await getActivePremiumSubscription(db, userId);

  return Boolean(subscription);
}

/**
 * Return Premium status for frontend/API use.
 */
export async function getPremiumStatus(db, userId) {
  const subscription =
    await getActivePremiumSubscription(db, userId);

  if (!subscription) {
    return {
      isPremium: false,
      subscription: null,
    };
  }

  return {
    isPremium: true,
    subscription: cleanSubscription(subscription),
  };
}
