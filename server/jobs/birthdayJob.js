import User from "../models/User.js";
import Post from "../models/Post.js";

export const checkBirthdays = async () => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await User.find({
      dob: { $exists: true, $ne: null }
    });

    for (let user of users) {
      const dob = new Date(user.dob);

      if (
        dob.getDate() === day &&
        dob.getMonth() + 1 === month
      ) {
        await Post.create({
          user: user._id,
          text: `🎉 Today is ${user.name}'s birthday! Wish them well.`,
          type: "birthday"
        });
      }
    }

    console.log("Birthday check complete");
  } catch (err) {
    console.error(err);
  }
};