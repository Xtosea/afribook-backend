import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* ================= MONEY ================= */

    // Money deposited by the user
    walletBalance: {
      type: Number,
      default: 0,
    },

    // Money earned from creators, ads, referrals, etc.
    earningBalance: {
      type: Number,
      default: 0,
    },

    // Withdrawals waiting for approval
    pendingWithdrawal: {
      type: Number,
      default: 0,
    },

    /* ================= POINTS ================= */

    points: {
      type: Number,
      default: 0,
    },

    /* ================= ANALYTICS ================= */

    lifetimeDeposits: {
      type: Number,
      default: 0,
    },

    lifetimeSpent: {
      type: Number,
      default: 0,
    },

    lifetimeEarned: {
      type: Number,
      default: 0,
    },

    lifetimeWithdrawn: {
      type: Number,
      default: 0,
    },

    /* ================= SOCIAL STATS ================= */

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

export default mongoose.model("Wallet", walletSchema);