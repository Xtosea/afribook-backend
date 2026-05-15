import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  type: {
    type: String,
    enum: ["❤️", "😂", "😮", "😢", "👍"],
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

viewsCount: {
  type: Number,
  default: 0,
},

engagementPoints: {
  type: Number,
  default: 0,
},

    caption: String,

    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [reactionSchema],

    replies: [replySchema],

    shares: {
      type: Number,
      default: 0,
    },

    engagementPoints: {
      type: Number,
      default: 0,
    },

    expiresAt: Date,
  },

  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Story",
  storySchema
);