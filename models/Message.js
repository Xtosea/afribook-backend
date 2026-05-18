import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  text: String,

  media: String,

  mediaType: {
    type: String,
    enum: ["image", "video", "audio"],
  },

  callType: {
    type: String,
    enum: ["voice", "video"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Message", messageSchema);