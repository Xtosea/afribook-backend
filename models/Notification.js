import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    type: {
  type: String,
  enum: [
    "LIKE",
    "COMMENT",
    "FOLLOW",
    "SHARE",
    "POST_VIEW",
    "PROFILE_VIEW",
    "REEL_VIEW",
    "REEL_LIKE",
    "REEL_COMMENT",
    "STORY_VIEW",
    "STORY_LIKE",
    "FRIEND_REQUEST",
    "FRIEND_ACCEPT",
    "MESSAGE",
    "MENTION",
    "CHALLENGE_WIN",
    "POINT_REWARD",
    "WITHDRAWAL_APPROVED",
    "WITHDRAWAL_REJECTED",
    "VERIFICATION_APPROVED" // 👈 add here
  ],
  required: true,
},

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },

    text: String,

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "Notification",
  notificationSchema
);