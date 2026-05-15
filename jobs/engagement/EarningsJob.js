import Story from "../models/Story.js";
import User from "../models/User.js";

export const updateStoryEarnings = async () => {
  const stories = await Story.find();

  for (const story of stories) {
    const earnings =
      story.views.length * 0.002 +
      story.likes.length * 0.01 +
      story.shares * 0.05;

    story.earnings = earnings;

    await story.save();

    const user = await User.findById(story.user);

    if (user) {
      user.wallet.balance += earnings;
      user.wallet.totalEarned += earnings;

      await user.save();
    }
  }
};