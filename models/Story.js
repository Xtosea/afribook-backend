import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  media: String,
  type: { type: String, enum: ["image", "video"], default: "image" },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, type: String }],
  createdAt: { type: Date, default: Date.now, expires: 86400 } // auto delete after 24h
});

export default mongoose.model("Story", storySchema);