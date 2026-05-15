import mongoose from "mongoose";

const walletSchema =
  new mongoose.Schema({
    user: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    points: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },
  });

export default mongoose.model(
  "Wallet",
  walletSchema
);