import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    profilePic: {
      type: String,
      default: "", // e.g., "/uploads/default.png"
    },
    coverPhoto: { type: String, default: "" },
    dob: { type: String, default: "" },
    phone: { type: String, default: "" },
    education: { type: String, default: "" },
    origin: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    spouse: { type: String, default: "" },  // ✅ fixed
    gender: { type: String, default: "" },  // ✅ fixed
    hubby: { type: String, default: "" },   // ✅ fixed typo
    bio: { type: String, default: "" },
    intro: { type: String, default: "" },

    // Email verification
    isVerified: { type: Boolean, default: false },
    verifyToken: String,
    verifyTokenExpiry: Date,

    // Password reset
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },

    // Social connections
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

   referralCode: String,

referredBy: {
  type:
    mongoose.Schema
      .Types.ObjectId,
  ref: "User",
},

referralEarnings: {
  type: Number,
  default: 0,
},

    // Points system
    points: { type: Number, default: 0 },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const User = mongoose.model("User", UserSchema);

export default User;