import User from "../models/User.js";
import Post from "../models/Post.js";
import { getSocket } from "../socket.js";

export const checkBirthdays = async () => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1; // JS months are 0-indexed
    const day = today.getDate();

    // Fetch only users whose birthday is today
    const users = await User.find({
      dob: { $exists: true, $ne: null },
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$dob" }, day] },
          { $eq: [{ $month: "$dob" }, month] }
        ]
      }
    });

    const io = getSocket();

    for (let user of users) {
      // Create birthday post
      await Post.create({
        user: user._id,
        text: `🎉 Today is ${user.name}'s birthday! Wish them well.`,
        type: "birthday"
      });

      // Emit socket event
      io.emit("birthday", {
        userId: user._id,
        name: user.name
      });
    }

    console.log(`Birthday check complete. ${users.length} birthday(s) today.`);
  } catch (err) {
    console.error("Error checking birthdays:", err);
  }
};