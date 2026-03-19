import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  media: String,
  createdAt: { type: Date, default: Date.now, expires: 86400 } // auto delete in 24h
});

export default mongoose.model("Story", storySchema);