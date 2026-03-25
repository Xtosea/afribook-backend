// src/models/Story.js
import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  media: [
    {
      url: String,
      type: { type: String, enum: ["image", "video"], default: "image" },
    },
  ],
  type: { type: String, enum: ["image", "video"], default: "image" },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, type: String }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

export default mongoose.model("Story", storySchema);