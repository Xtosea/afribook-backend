import mongoose from "mongoose";

const creatorEarningSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdCampaign",
      required: true,
    },

    impressionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdImpression",
    },

    amount: {
      type: Number,
      required: true,
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

    notes: {
      type: String,
      default: "",
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