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
      default: "",
    },

    coverPhoto: {
      type: String,
      default: "",
    },

    dob: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    education: {
      type: String,
      default: "",
    },

    origin: {
      type: String,
      default: "",
    },

    maritalStatus: {
      type: String,
      default: "",
    },

    spouse: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      default: "",
    },

    hubby: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    intro: {
      type: String,
      default: "",
    },

    // Email verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    verifyToken: String,
    verifyTokenExpiry: Date,

    // Password reset
    resetToken: {
      type: String,
      default: null,
    },

    resetTokenExpiry: {
      type: Date,
      default: null,
    },

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

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    friendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    sentRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Referral system
    referralCode: String,

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    referralEarnings: {
      type: Number,
      default: 0,
    },

    // Virtual economy
    coins: {
      type: Number,
      default: 0,
    },

    diamonds: {
      type: Number,
      default: 0,
    },

    // Creator subscriptions
    subscriptions: [
      {
        creator: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        expiresAt: Date,
      },
    ],

    // Interests
    interests: [
      {
        type: String,
      },
    ],

    // Reel/video watch history
    watchHistory: [
      {
        reel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },

        watchTime: Number,

        completed: Boolean,
      },
    ],

    likedCategories: [String],

    skippedCategories: [String],

    // Points system
    points: {
  type: Number,
  default: 0,
},

verified: {
  type: Boolean,
  default: false,
},

verificationStatus: {
  type: String,
  enum: [
    "NONE",
    "PENDING",
    "APPROVED",
    "REJECTED",
  ],
  default: "NONE",
},

verificationBadge: {
  type: String,
  default: "blue",
},

},
{
  timestamps: true,
}
);

const User = mongoose.model(
  "User",
  UserSchema
);

export default User;

export default User;