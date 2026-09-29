import { getProduct } from "./products.js";

/**
 * Activate a verified Advertisement payment.
 *
 * IMPORTANT:
 * - Payment must already be verified as paid by Paystack.
 * - The stored payment record is the source of truth.
 * - Activation is idempotent using transactionReference.
 */
export async function activateVerifiedAdvertisement(db, payment) {
  if (!payment) {
    throw new Error("Payment record is required.");
  }

  if (payment.status !== "paid") {
    throw new Error("Payment has not been verified as paid.");
  }

  if (!payment.transactionReference) {
    throw new Error("Payment transaction reference is missing.");
  }

  const product = getProduct(payment.productId);

  if (!product) {
    throw new Error("Payment product no longer exists.");
  }

  if (product.type !== "advertisement") {
    throw new Error(
      "This payment product does not use Advertisement activation."
    );
  }

  const userId = payment.user;

  if (!userId) {
    throw new Error("Payment contains an invalid user ID.");
  }

  /*
   * Idempotency:
   * If this payment has already activated a campaign,
   * return the existing campaign.
   */
  const existingCampaign = await db
    .collection("advertisement_campaigns")
    .findOne({
      paymentReference: payment.transactionReference,
    });

  if (existingCampaign) {
    return {
      activated: true,
      alreadyActivated: true,
      campaign: serializeAdvertisementCampaign(existingCampaign),
    };
  }

  /*
   * The advertisement campaign should have been created
   * before payment and linked to this transaction reference.
   */
  const campaignId = payment.advertisementCampaignId;

  if (!campaignId) {
    throw new Error(
      "Advertisement campaign reference is missing from payment."
    );
  }

  const campaign = await db.collection("advertisement_campaigns").findOne({
    _id: campaignId,
    advertiserId: userId,
  });

  if (!campaign) {
    throw new Error("Advertisement campaign not found.");
  }

  const now = new Date();

  const durationDays = Number(product.durationDays);

  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error("Advertisement product has an invalid duration.");
  }

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + durationDays);

  const updateResult = await db
    .collection("advertisement_campaigns")
    .updateOne(
      {
        _id: campaign._id,
        advertiserId: userId,
        paymentStatus: { $ne: "paid" },
      },
      {
        $set: {
          paymentStatus: "paid",
          paymentReference: payment.transactionReference,
          paymentGatewayReference: payment.gatewayReference || null,
          paymentProvider: payment.provider || "paystack",
          paidAmount: payment.amount,
          currency: payment.currency || "NGN",
          status: "active",
          startDate: now,
          endDate,
          updatedAt: now,
          activatedAt: now,
        },
      }
    );

  /*
   * Another request may have activated the campaign first.
   * Re-read it so the endpoint remains idempotent.
   */
  const activatedCampaign = await db
    .collection("advertisement_campaigns")
    .findOne({
      _id: campaign._id,
    });

  if (!activatedCampaign) {
    throw new Error("Advertisement campaign could not be activated.");
  }

  return {
    activated: updateResult.modifiedCount > 0,
    alreadyActivated: updateResult.modifiedCount === 0,
    campaign: serializeAdvertisementCampaign(activatedCampaign),
  };
}

function serializeAdvertisementCampaign(campaign) {
  if (!campaign) return null;

  return {
    ...campaign,
    _id: campaign._id?.toString?.() || campaign._id,
    advertiserId:
      campaign.advertiserId?.toString?.() || campaign.advertiserId,
    createdBy: campaign.createdBy?.toString?.() || campaign.createdBy,
    paymentReference: campaign.paymentReference || null,
    paymentGatewayReference:
      campaign.paymentGatewayReference || null,
  };
}