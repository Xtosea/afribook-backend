import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
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

const mediaSchema = new mongoose.Schema({
  url: String,
  type: String,
});

const watchSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  duration: {
    type: Number,
    default: 0,
  },

  completed: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  content: {
    type: String,
    default: "",
  },

  media: [mediaSchema],

  type: {
    type: String,
    default: "post",
  },

  feeling: {
    type: String,
    default: "",
  },

  location: {
    type: String,
    default: "",
  },

  // TEMPORARY SIMPLE TAGS
  taggedFriends: [String],

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  reactions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      type: {
        type: String,
        default: "❤️",
      },
    },
  ],

  comments: [commentSchema],

  isReel: {
    type: Boolean,
    default: false,
  },

  // ================= VIDEO / REEL ANALYTICS =================

  watchTime: {
    type: Number,
    default: 0,
  },

  watchSessions: [watchSessionSchema],

  engagementPoints: {
    type: Number,
    default: 0,
  },

  earnings: {
    type: Number,
    default: 0,
  },

  viral: {
    type: Boolean,
    default: false,
  },

  multiplier: {
    type: Number,
    default: 1,
  },

  shares: {
    type: Number,
    default: 0,
  },

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

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model(
  "Post",
  postSchema
);

export default Post;