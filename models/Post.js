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

  thumbnailUrl: {
    type: String,
    default: "",
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

    editor: {
  textPosition: {
    x: Number,
    y: Number,
  },
  textRotation: Number,
  textSize: Number,
  textColor: String,
  backgroundColor: String,

  stickers: [
    {
      emoji: String,
      x: Number,
      y: Number,
      size: Number,
    },
  ],
},


editor: {
  textPosition: {
    x: Number,
    y: Number,
  },

  textRotation: {
    type: Number,
    default: 0,
  },

  textSize: {
    type: Number,
    default: 60,
  },

  textColor: {
    type: String,
    default: "#ffffff",
  },

  backgroundColor: {
    type: String,
    default: "#000000",
  },

  stickers: [
    {
      emoji: String,
      x: Number,
      y: Number,
      size: Number,
    },
  ],

  music: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Music",
    },

    title: {
      type: String,
      default: "",
    },

    url: {
      type: String,
      default: "",
    },
  },
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

    viewedBy: [
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