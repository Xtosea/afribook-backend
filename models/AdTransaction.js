import mongoose from "mongoose";

const adTransactionSchema =
new mongoose.Schema({
  advertiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdCampaign",
  },

  amount: Number,

  reference: String,

  status: {
    type: String,
    default: "pending",
  },

  paymentMethod: String,
},
{
  timestamps: true,
});

export default mongoose.model(
  "AdTransaction",
  adTransactionSchema
);
