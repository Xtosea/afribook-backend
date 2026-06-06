// models/CreatorEarning.js

import mongoose from "mongoose";

const creatorEarningSchema =
  new mongoose.Schema(
    {
      creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdCampaign",
      },

      impressionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdImpression",
      },

      amount: {
        type: Number,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
          "paid",
        ],
        default: "pending",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "CreatorEarning",
  creatorEarningSchema
);