import mongoose from "mongoose";

const adSchema =
  new mongoose.Schema(
    {
      advertiser: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      title: String,

      description: String,

      mediaUrl: String,

      targetUrl: String,

      rewardPoints: {
        type: Number,
        default: 10,
      },

      budget: {
        type: Number,
        default: 0,
      },

      spent: {
        type: Number,
        default: 0,
      },

      impressions: {
        type: Number,
        default: 0,
      },

      clicks: {
        type: Number,
        default: 0,
      },

      active: {
        type: Boolean,
        default: true,
      },

      type: {
        type: String,
        enum: [
          "rewarded",
          "banner",
          "sponsored-reel",
        ],
      },
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Ad",
  adSchema
);