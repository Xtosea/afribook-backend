import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  type: {
    type: String,
    enum: ["LIKE", "COMMENT", "FOLLOW"],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  },
  text: String,
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);