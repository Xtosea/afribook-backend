import Wallet from "../models/Wallet.js";

export const addPoints = async (
  userId,
  amount,
  type = ""
) => {
  let wallet = await Wallet.findOne({
    user: userId,
  });

  // CREATE WALLET IF NONE
  if (!wallet) {
    wallet = await Wallet.create({
      user: userId,
    });
  }

  wallet.points += amount;

  // TRACK TYPES
  switch (type) {

    case "story_like":
      wallet.storyLikes += amount;
      break;

    case "story_view":
      wallet.storyViews += amount;
      break;

    case "reel_like":
      wallet.reelLikes += amount;
      break;

    case "reel_view":
      wallet.reelViews += amount;
      break;

    case "video_like":
      wallet.videoLikes += amount;
      break;

    case "video_view":
      wallet.videoViews += amount;
      break;

    case "referral":
      wallet.referralPoints += amount;
      break;

    case "leaderboard":
      wallet.leaderboardPoints += amount;
      break;

    default:
      break;
  }

  await wallet.save();

  return wallet;
};