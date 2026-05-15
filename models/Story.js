import mongoose from "mongoose";

/* ================= REACTION SCHEMA ================= */
const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  type: {
    type: String,

    enum: [
      "❤️",
      "😂",
      "😮",
      "😢",
      "👍",
      "🔥",
    ],

    default: "❤️",
  },
});

/* ================= REPLY SCHEMA ================= */
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

/* ================= STORY SCHEMA ================= */
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

    expiresAt: Date,

    /* ================= VIEWS ================= */
    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    viewsCount: {
      type: Number,
      default: 0,
    },

    /* ================= LIKES ================= */
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* ================= REACTIONS ================= */
    reactions: [reactionSchema],

    /* ================= REPLIES ================= */
    replies: [replySchema],

    /* ================= SHARES ================= */
    shares: {
      type: Number,
      default: 0,
    },

    /* ================= ENGAGEMENT ================= */
    engagementPoints: {
      type: Number,
      default: 0,
    },
  },

  {
    timestamps: true,
  }
);

export default mongoose.model("Story", storySchema);