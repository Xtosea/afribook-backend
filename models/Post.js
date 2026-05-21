import mongoose from "mongoose";

// ================= COMMENTS =================

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    text: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ================= MEDIA =================

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    default: "",
  },

  type: {
    type: String,
    enum: ["image", "video", "audio"],
    default: "image",
  },
});

// ================= WATCH SESSION =================

const watchSessionSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      duration: {
        type: Number,
        default: 0,
      },

      completed: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

// ================= POST =================

const postSchema = new mongoose.Schema(
  {
    // ================= OWNER =================

    user: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ================= CONTENT =================

    title: {
      type: String,
      default: "",
    },

    content: {
      type: String,
      default: "",
    },

    media: [mediaSchema],

    type: {
      type: String,
      default: "post",
    },

    isReel: {
      type: Boolean,
      default: false,
    },

    // ================= POST STYLE =================

    feeling: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    textColor: {
      type: String,
      default: "#000000",
    },

    backgroundStyle: {
      type: String,
      default: "bg-white",
    },

    fontStyle: {
      type: String,
      default: "font-sans",
    },

    // ================= TAGGING =================

    taggedFriends: [
      {
        type: String,
      },
    ],

    tags: [String],

    category: {
      type: String,
      enum: [
        "general",
        "music",
        "sports",
        "comedy",
        "education",
        "gaming",
        "movies",
        "news",
      ],
      default: "general",
    },

    // ================= ENGAGEMENT =================

    likes: [
      {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        user: {
          type:
            mongoose.Schema.Types
              .ObjectId,
          ref: "User",
        },

        type: {
          type: String,
          default: "❤️",
        },
      },
    ],

    comments: [commentSchema],

    shares: {
      type: Number,
      default: 0,
    },

    // ================= SAVED / PINNED =================

    savedBy: [
      {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    pinned: {
      type: Boolean,
      default: false,
    },

    // ================= SPONSORED =================

    sponsored: {
      type: Boolean,
      default: false,
    },

    sponsor: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    promotionBudget: {
      type: Number,
      default: 0,
    },

    adClicks: {
      type: Number,
      default: 0,
    },

    // ================= AI / VIRAL =================

    aiScore: {
      type: Number,
      default: 0,
    },

    viralScore: {
      type: Number,
      default: 0,
    },

    viral: {
      type: Boolean,
      default: false,
    },

    multiplier: {
      type: Number,
      default: 1,
    },

    // ================= VIDEO ANALYTICS =================

    watchTime: {
      type: Number,
      default: 0,
    },

    watchSessions: [
      watchSessionSchema,
    ],

    engagementPoints: {
      type: Number,
      default: 0,
    },

    earnings: {
      type: Number,
      default: 0,
    },

    // ================= VIEWS =================

    views: [
      {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model(
  "Post",
  postSchema
);

export default Post;