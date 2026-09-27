import {
  buildSubscriptionRecord,
  toObjectId,
} from "./subscriptions.js";

import {
  getProduct,
} from "./products.js";

import {
  cleanSubscription,
} from "./subscriptions.js";

/**
 * Activate a verified Premium payment.
 *
 * IMPORTANT:
 * - This function must only receive a payment that has
 *   already been verified successfully by Paystack.
 * - The payment transaction reference is the idempotency key.
 * - The product and amount come from the stored payment record.
 * - Premium subscriptions stack onto an existing active
 *   normal Premium subscription.
 */
export async function activateVerifiedPayment(
  db,
  payment
) {
  if (!payment) {
    throw new Error("Payment record is required.");
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

  if (product.type !== "premium") {
    throw new Error(
      "This payment product does not use Premium activation."
    );
  }

  const userId = toObjectId(payment.user);

  if (!userId) {
    throw new Error(
      "Payment contains an invalid user ID."
    );
  }

  /*
   * Idempotency:
   *
   * If this transaction already created a subscription,
   * return that subscription instead of creating another one.
   */
  const existingActivation =
    await db.collection("subscriptions").findOne({
      transactionReference:
        payment.transactionReference,
    });

  if (existingActivation) {
    return {
      activated: true,
      alreadyActivated: true,
      subscription:
        cleanSubscription(existingActivation),
    };
  }

  const existingSubscription =
    await db.collection("subscriptions")
      .findOne(
        {
          user: userId,
          status: "active",
          $or: [
            {
              plan: "legacy",
              expiresAt: null,
            },
            {
              plan: "premium",
              expiresAt: {
                $gt: new Date(),
              },
            },
          ],
        },
        {
          sort: {
            createdAt: -1,
          },
        }
      );

  const subscription =
    buildSubscriptionRecord({
      userId,
      productId: product.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentProvider:
        payment.provider || "paystack",
      transactionReference:
        payment.transactionReference,
      gatewayReference:
        payment.gatewayReference || null,
      existingSubscription,
      startedAt: new Date(),
    });

  try {
    const result =
      await db.collection("subscriptions").insertOne(
        subscription
      );

    subscription._id = result.insertedId;

    await db.collection("payments").updateOne(
      {
        _id: payment._id,
      },
      {
        $set: {
          activationStatus: "activated",
          activatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return {
      activated: true,
      alreadyActivated: false,
      subscription:
        cleanSubscription(subscription),
    };
  } catch (error) {
    /*
     * Another request may have activated the same payment
     * between our initial lookup and insert.
     *
     * Re-check the transaction reference before returning
     * an error.
     */
    if (error?.code === 11000) {
      const duplicate =
        await db.collection("subscriptions").findOne({
          transactionReference:
            payment.transactionReference,
        });

      if (duplicate) {
        return {
          activated: true,
          alreadyActivated: true,
          subscription:
            cleanSubscription(duplicate),
        };
      }
    }

    throw error;
  }
}
