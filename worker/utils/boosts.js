import { ObjectId } from "mongodb";

import {
  getProduct,
} from "./products.js";

function toObjectId(value) {
  if (!value) return null;

  if (value instanceof ObjectId) {
    return value;
  }

  try {
    return new ObjectId(String(value));
  } catch {
    return null;
  }
}

function calculateBoostExpiry(
  product,
  startedAt
) {
  if (
    product.neverExpires ||
    product.durationDays == null
  ) {
    return null;
  }

  const expiresAt =
    new Date(startedAt);

  expiresAt.setDate(
    expiresAt.getDate() +
      Number(product.durationDays)
  );

  return expiresAt;
}

function cleanBoost(boost) {
  return {
    id: boost._id?.toString() || null,
    user: boost.user?.toString() || null,
    post: boost.post?.toString() || null,
    productId: boost.productId,
    amount: boost.amount,
    currency: boost.currency,
    status: boost.status,
    startedAt: boost.startedAt,
    expiresAt: boost.expiresAt,
    paymentProvider:
      boost.paymentProvider,
    transactionReference:
      boost.transactionReference,
    gatewayReference:
      boost.gatewayReference || null,
    createdAt: boost.createdAt,
    updatedAt: boost.updatedAt,
  };
}

export async function activateVerifiedBoost(
  db,
  payment
) {
  if (!payment) {
    throw new Error(
      "Payment record is required."
    );
  }

  if (payment.status !== "paid") {
    throw new Error(
      "Payment has not been verified as paid."
    );
  }

  if (!payment.transactionReference) {
    throw new Error(
      "Payment transaction reference is missing."
    );
  }

  const product = getProduct(
    payment.productId
  );

  if (!product) {
    throw new Error(
      "Payment product no longer exists."
    );
  }

  if (product.type !== "boost") {
    throw new Error(
      "This payment product does not use Boost activation."
    );
  }

  const userId =
    toObjectId(payment.user);

  if (!userId) {
    throw new Error(
      "Payment contains an invalid user ID."
    );
  }

  const postId =
    toObjectId(payment.targetPostId);

  if (!postId) {
    throw new Error(
      "Boost target post is missing or invalid."
    );
  }

  const post =
    await db.collection("posts").findOne({
      _id: postId,
    });

  if (!post) {
    throw new Error(
      "The post or Reel to boost was not found."
    );
  }

  if (
    String(post.user) !==
    String(userId)
  ) {
    throw new Error(
      "You can only boost your own content."
    );
  }

  const existingActivation =
    await db.collection("boosts").findOne({
      transactionReference:
        payment.transactionReference,
    });

  if (existingActivation) {
    return {
      activated: true,
      alreadyActivated: true,
      boost:
        cleanBoost(existingActivation),
    };
  }

  const startedAt = new Date();

  const boost = {
    user: userId,
    post: postId,
    productId: product.id,
    amount: payment.amount,
    currency: payment.currency,
    status: "active",
    startedAt,
    expiresAt:
      calculateBoostExpiry(
        product,
        startedAt
      ),
    paymentProvider:
      payment.provider || "paystack",
    transactionReference:
      payment.transactionReference,
    gatewayReference:
      payment.gatewayReference || null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };

  try {
    const result =
      await db.collection("boosts").insertOne(
        boost
      );

    boost._id =
      result.insertedId;

    await db.collection("payments").updateOne(
      {
        _id: payment._id,
      },
      {
        $set: {
          activationStatus:
            "activated",
          activatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return {
      activated: true,
      alreadyActivated: false,
      boost:
        cleanBoost(boost),
    };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate =
        await db.collection("boosts").findOne({
          transactionReference:
            payment.transactionReference,
        });

      if (duplicate) {
        return {
          activated: true,
          alreadyActivated: true,
          boost:
            cleanBoost(duplicate),
        };
      }
    }

    throw error;
  }
}
