import Wallet from "../models/Wallet.js";
import { sendNotification } from "./sendNotification.js";




export const addPoints = async (userId, amount = 0, type = "") => {

console.log("🔥 addPoints CALLED");


  if (!userId) throw new Error("userId is required");

  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }

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

  // 🔥 DEBUG LOG (VERY IMPORTANT)
  console.log("💰 POINTS ADDED:", {
    userId,
    amount,
    type,
    total: wallet.points,
  });

  return wallet;
};


await wallet.save();

// SEND NOTIFICATION
await sendNotification({
  recipient: userId,
  type: "POINT_REWARD",
  text: `You earned ${amount} points`,
});

console.log("💰 POINTS ADDED:", {
  userId,
  amount,
  type,
  total: wallet.points,
});

return wallet;