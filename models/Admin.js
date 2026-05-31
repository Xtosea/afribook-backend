import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,

    profilePic: String,

    verified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      default: "PENDING",
    },

    // 👇 ADD THIS
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);