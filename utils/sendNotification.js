// utils/sendNotification.js

import Notification from "../models/Notification.js";
import { io } from "../server.js";

export const sendNotification = async ({
  recipient,
  sender,
  type,
  text,
  post = null,
}) => {
  const notification =
    await Notification.create({
      recipient,
      sender,
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
        "post",
        "content media"
      );

  io.to(recipient.toString()).emit(
    "new-notification",
    populated
  );

  return populated;
};