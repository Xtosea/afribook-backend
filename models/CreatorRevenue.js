const creatorRevenueSchema =
new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdCampaign",
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },

  impressions: {
    type: Number,
    default: 0,
  },

  earnings: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.model(
  "CreatorRevenue",
  creatorRevenueSchema
);