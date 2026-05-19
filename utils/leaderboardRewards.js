import User from "../models/User.js";
import { addPoints } from "./addPoints.js";

export const rewardTopUsers =
  async () => {

    const users =
      await User.find()
        .sort({ points: -1 })
        .limit(3);

    const rewards = [
      10000,
      5000,
      2500,
    ];

    for (
      let i = 0;
      i < users.length;
      i++
    ) {

      await addPoints(
        users[i]._id,
        rewards[i],
        "leaderboard"
      );
    }
  };