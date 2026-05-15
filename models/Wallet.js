import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },

    /* ================= POINTS ================= */
    points: {
      type: Number,
      default: 0,
    },

    /* ================= BALANCE ================= */
    balance: {
      type: Number,
      default: 0,
    },

    /* ================= EARNINGS ================= */
    totalEarned: {
      type: Number,
      default: 0,
    },

    lifetimeEarned: {
      type: Number,
      default: 0,
    },

    /* ================= PENDING ================= */
    pending: {
      type: Number,
      default: 0,
    },
  },

  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Wallet",
  walletSchema
);