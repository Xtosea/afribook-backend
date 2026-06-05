// models/AdImpression.js

import mongoose from "mongoose";

const adImpressionSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdCampaign",
    required: true,
  },

campaign: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "AdCampaign",
      },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },

  ipAddress: String,

  watchTime: {
    type: Number,
    default: 0,
  },

clicked: {
        type: Boolean,
        default: false,
      },

  valid: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.model(
  "AdImpression",
  adImpressionSchema
);
