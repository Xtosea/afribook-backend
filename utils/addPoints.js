import Wallet from "../models/Wallet.js";

export const addPoints = async (userId, amount = 0, type = "") => {
  if (!userId) throw new Error("userId is required");

  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }

  // ensure safe defaults
  wallet.points = (wallet.points || 0) + amount;

  switch (type) {
    case "story_like":
      wallet.storyLikes = (wallet.storyLikes || 0) + amount;
      break;

    case "story_view":
      wallet.storyViews = (wallet.storyViews || 0) + amount;
      break;

    case "reel_like":
      wallet.reelLikes = (wallet.reelLikes || 0) + amount;
      break;

    case "reel_view":
      wallet.reelViews = (wallet.reelViews || 0) + amount;
      break;

    case "video_like":
      wallet.videoLikes = (wallet.videoLikes || 0) + amount;
      break;

    case "video_view":
      wallet.videoViews = (wallet.videoViews || 0) + amount;
      break;

    case "referral":
      wallet.referralPoints = (wallet.referralPoints || 0) + amount;
      break;

    case "leaderboard":
      wallet.leaderboardPoints = (wallet.leaderboardPoints || 0) + amount;
      break;
  }

  await wallet.save();

  console.log("💰 Wallet updated:", {
    userId,
    amount,
    type,
    totalPoints: wallet.points,
  });

  return wallet;
};