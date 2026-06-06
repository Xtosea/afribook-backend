import mongoose from "mongoose";

const adCampaignSchema = new mongoose.Schema(
  {
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    thumbnailUrl: String,

    adType: {
      type: String,
      enum: [
        "story",
        "reel",
        "video",
        "banner",
      ],
      default: "video",
    },

    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingBudget: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingBudget: {
  type: Number,
  default: 0,
},

    spent: {
      type: Number,
      default: 0,
    },

    costPerView: {
      type: Number,
      default: 1,
    },

    impressions: {
      type: Number,
      default: 0,
    },

    clicks: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "paused",
        "completed",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "AdCampaign",
  adCampaignSchema
);
