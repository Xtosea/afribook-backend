import mongoose from "mongoose";

const pkRewardSchema = new mongoose.Schema(
  {
    // ==========================================
    // PK BATTLE
    // ==========================================

    battle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PKBattle",
      required: true,
      unique: true,
      index: true,
    },

    // ==========================================
    // WINNER / LOSER
    // ==========================================

    winner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
  index: true,
},

    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // "A", "B", or "draw"
    result: {
      type: String,
      enum: ["A", "B", "draw"],
      required: true,
    },

    // ==========================================
    // PK SCORES
    // ==========================================

    winnerScore: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    loserScore: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalPKPoints: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // ==========================================
    // GIFT / COIN VALUE
    // ==========================================

    totalCoinsSpent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // ==========================================
    // PLATFORM ECONOMICS
    // ==========================================

    platformFeeRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.20,
    },

    platformFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    creatorRewardPool: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    winnerReward: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // ==========================================
    // REWARD STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // ==========================================
    // TRANSACTION REFERENCE
    // ==========================================

    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ==========================================
    // PAYMENT DETAILS
    // ==========================================

    paidAt: {
      type: Date,
      default: null,
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

export default mongoose.model(
  "PKReward",
  pkRewardSchema
);