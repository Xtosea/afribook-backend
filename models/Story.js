import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  media: { type: String, required: true }, // URL to image or video
  type: { type: String, enum: ["image", "video"], default: "image" },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reactions: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    type: { type: String } 
  }],
  createdAt: { type: Date, default: Date.now, expires: 86400 } // auto delete after 24h
});

export default mongoose.model("Story", storySchema);