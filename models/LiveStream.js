import mongoose from "mongoose";

const liveStreamSchema =
  new mongoose.Schema(
    {
      host: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      title: String,

      thumbnail: String,

      streamKey: String,

      live: {
        type: Boolean,
        default: false,
      },

      viewers: [
        {
          type:
            mongoose.Schema
              .Types.ObjectId,
          ref: "User",
        },
      ],

      moderators: [
        {
          type:
            mongoose.Schema
              .Types.ObjectId,
          ref: "User",
        },
      ],

      totalDiamonds: {
        type: Number,
        default: 0,
      },

      roomType: {
        type: String,
        enum: [
          "public",
          "paid",
          "subscribers",
        ],

        default: "public",
      },

      entryFee: {
        type: Number,
        default: 0,
      },
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "LiveStream",
  liveStreamSchema
);