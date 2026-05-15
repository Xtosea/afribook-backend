import mongoose from "mongoose";

const storySchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      media: [
        {
          url: {
            type: String,
            required: true,
          },

          type: {
            type: String,

            enum: [
              "image",
              "video",
            ],

            required: true,
          },
        },
      ],

      caption: {
        type: String,
        default: "",
      },

      likes: [
        {
          type:
            mongoose.Schema.Types.ObjectId,

          ref: "User",
        },
      ],

      replies: [
        {
          user: {
            type:
              mongoose.Schema.Types.ObjectId,

            ref: "User",
          },

          text: String,

          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

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