import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },

    points: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    lifetimeEarned: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Wallet",
  walletSchema
);