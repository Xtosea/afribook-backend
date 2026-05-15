import mongoose from "mongoose";

const trendSchema =
  new mongoose.Schema(
    {
      name: String,

      type: {
        type: String,
        enum: [
          "hashtag",
          "sound",
          "challenge",
        ],
      },

      usageCount: {
        type: Number,
        default: 0,
      },

      growthRate: {
        type: Number,
        default: 0,
      },
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Trend",
  trendSchema
);