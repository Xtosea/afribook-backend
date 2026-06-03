import mongoose from "mongoose";

const reactionSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      type: {
        type: String,
        enum: [
          "❤️",
          "😂",
          "😮",
          "😢",
          "👍",
        ],
      },
    },
    { _id: false }
  );

const replySchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      text: String,

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    { _id: false }
  );

const storySchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      media: [
        {
          url: String,

          type: {
            type: String,
            enum: [
              "image",
              "video",
            ],
          },
        },
      ],

     music: {
  title: String,
  artist: String,
  audioUrl: String,
  coverUrl: String,
},

text: {
  type: String,
  default: "",
},

stickers: [
  {
    emoji: String,
    x: String,
    y: String,
  },
],

backgroundColor: {
  type: String,
  default: "#000000",
},
      
      caption: {
        type: String,
        default: "",
      },

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

      reactions: [reactionSchema],

      replies: [replySchema],

      shares: {
        type: Number,
        default: 0,
      },

      engagementPoints: {
        type: Number,
        default: 0,
      },

      expiresAt: {
        type: Date,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Story",
  storySchema
);