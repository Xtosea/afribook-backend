import { ObjectId } from "mongodb";

/* ============================================================
   GET ACTIVE PREMIUM SUBSCRIPTION
   ============================================================ */

export async function getActivePremiumSubscription(
  db,
  userId
) {
  if (!userId) {
    return null;
  }

  let objectUserId;

  try {
    objectUserId =
      userId instanceof ObjectId
        ? userId
        : new ObjectId(userId);
  } catch {
    return null;
  }

  const now = new Date();

  return await db
    .collection("subscriptions")
    .findOne({
      user: objectUserId,
      plan: "premium",
      status: "active",
      expiresAt: {
        $gt: now,
      },
    });
}

/* ============================================================
   CHECK ACTIVE PREMIUM
   ============================================================ */

export async function hasActivePremium(
  db,
  userId
) {
  const subscription =
    await getActivePremiumSubscription(
      db,
      userId
    );

  return Boolean(subscription);
}

/* ============================================================
   GET PREMIUM STATUS
   ============================================================ */

export async function getPremiumStatus(
  db,
  userId
) {
  const subscription =
    await getActivePremiumSubscription(
      db,
      userId
    );

  if (!subscription) {
    return {
      isPremium: false,
      subscription: null,
    };
  }

  return {
    isPremium: true,

    subscription: {
      _id:
        subscription._id
          ?.toString?.() ||
        subscription._id,

      plan:
        subscription.plan,

      status:
        subscription.status,

      startedAt:
        subscription.startedAt ||
        null,

      expiresAt:
        subscription.expiresAt ||
        null,

      paymentProvider:
        subscription.paymentProvider ||
        null,
    },
  };
}