import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  type: {
    type: String,
    default: "❤️",
  },
});

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  text: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    media: [
      {
        url: String,
        type: String,
      },
    ],

    caption: String,

    reactions: [reactionSchema],

    replies: [replySchema],

    views: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    shares: {
      type: Number,
      default: 0,
    },

    privacy: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Story",
  storySchema
);