import mongoose from "mongoose";

const adCampaignSchema = new mongoose.Schema({
  advertiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  title: String,

  mediaUrl: String,

  budget: Number,

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

  status: {
    type: String,
    default: "active",
  },
}, {
  timestamps: true,
});

export default mongoose.model(
  "AdCampaign",
  adCampaignSchema
);
