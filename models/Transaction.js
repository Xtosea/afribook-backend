import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    /* ================= USER ================= */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ================= TRANSACTION ================= */

    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "transfer",
        "conversion",
        "purchase",
        "earning",
        "refund",
      ],
      required: true,
    },

    category: {
      type: String,
      enum: [
        "wallet",
        "advertisement",
        "boost_post",
        "boost_story",
        "boost_reel",
        "boost_event",
        "marketplace",
        "marketplace_premium",
        "marketplace_featured",
        "event_premium",
        "subscription",
        "verified_badge",
        "creator_badge",
        "business_badge",
        "sticker_pack",
        "theme",
        "gift",
        "withdrawal",
        "creator_earning",
        "points_conversion",
        "other",
      ],
      default: "other",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    /* ================= PAYMENT ================= */

    paymentMethod: {
      type: String,
      enum: [
        "wallet",
        "paystack_card",
        "paystack_bank_transfer",
        "bank_transfer",
        "card",
        "ussd",
        "manual",
      ],
      default: "wallet",
    },

    reference: {
      type: String,
      unique: true,
      sparse: true,
    },

    gatewayReference: {
      type: String,
      default: "",
    },

    /* ================= STATUS ================= */

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "success",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },

    description: {
      type: String,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

transactionSchema.index({
  user: 1,
  createdAt: -1,
});

transactionSchema.index({
  reference: 1,
});

export default mongoose.model(
  "Transaction",
  transactionSchema
);