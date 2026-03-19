import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const mediaSchema = new mongoose.Schema({
  url: String,
  type: String // e.g., "image/jpeg" or "video/mp4"
});

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  media: [mediaSchema],              // images/videos
  feeling: { type: String, default: "" },
  location: { type: String, default: "" },
  taggedFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // NEW
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Post", postSchema);