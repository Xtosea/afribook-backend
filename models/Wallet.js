import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },

    // MAIN POINTS
    points: {
      type: Number,
      default: 0,
    },

    // STORY
    storyLikes: {
      type: Number,
      default: 0,
    },

    storyViews: {
      type: Number,
      default: 0,
    },

    // REELS
    reelLikes: {
      type: Number,
      default: 0,
    },

    reelViews: {
      type: Number,
      default: 0,
    },

    // VIDEOS
    videoLikes: {
      type: Number,
      default: 0,
    },

    videoViews: {
      type: Number,
      default: 0,
    },

    // REFERRALS
    referralPoints: {
      type: Number,
      default: 0,
    },

    // LEADERBOARD
    leaderboardPoints: {
      type: Number,
      default: 0,
    },

    // MONEY
    balance: {
      type: Number,
      default: 0,
    },

    totalEarned: {
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Wallet",
  walletSchema
);