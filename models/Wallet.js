import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
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

    pending: {
      type: Number,
      default: 0,
    },

    storyLikes: {
      type: Number,
      default: 0,
    },

    storyViews: {
      type: Number,
      default: 0,
    },

    reelLikes: {
      type: Number,
      default: 0,
    },

    reelViews: {
      type: Number,
      default: 0,
    },

    videoLikes: {
      type: Number,
      default: 0,
    },

    videoViews: {
      type: Number,
      default: 0,
    },

    referralPoints: {
      type: Number,
      default: 0,
    },

    leaderboardPoints: {
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