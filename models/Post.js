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

      type: String,
    },
  ],

  comments: [commentSchema],

  isReel: {
    type: Boolean,
    default: false,
  },

  // ✅ ADD THESE INSIDE THE SCHEMA
  shares: {
    type: Number,
    default: 0,
  },

  views: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model("Post", postSchema);

export default Post;