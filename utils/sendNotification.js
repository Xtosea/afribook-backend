import Notification from "../models/Notification.js";
import { io } from "../server.js";

export const sendNotification = async ({
  recipient,
  sender,
  type,
  text,
  post = null,
}) => {
  try {
    const groupableTypes = [
      "LIKE",
      "COMMENT",
      "REEL_LIKE",
      "STORY_LIKE",
    ];

    if (groupableTypes.includes(type)) {
      const existing =
        await Notification.findOne({
          recipient,
          type,
          post,
          read: false,
        });

      if (existing) {
        const alreadyExists =
          existing.senders.some(
            (id) =>
              id.toString() ===
              sender.toString()
          );

        if (!alreadyExists) {
          existing.senders.push(sender);
          existing.count += 1;
          existing.sender = sender;

          await existing.save();
        }

        const populated =
          await Notification.findById(
            existing._id
          )
            .populate(
              "sender",
              "name profilePic"
            )
            .populate(
              "senders",
              "name profilePic"
            )
            .populate(
              "post",
              "content media"
            );

        io.to(recipient.toString()).emit(
          "new-notification",
          populated
        );

        return populated;
      }
    }

    const notification =
      await Notification.create({
        recipient,
        sender,
        senders: sender ? [sender] : [],
        count: 1,
        type,
        text,
        post,
      });

    const populated =
      await Notification.findById(
        notification._id
      )
        .populate(
          "sender",
          "name profilePic"
        )
        .populate(
          "senders",
          "name profilePic"
        )
        .populate(
          "post",
          "content media"
        );

    io.to(recipient.toString()).emit(
      "new-notification",
      populated
    );

    return populated;
  } catch (err) {
    console.error(
      "Notification Error:",
      err
    );
  }
};