import mongoose from "mongoose";

const verificationSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      paymentMethod: {
        type: String,
        enum: [
          "WALLET",
          "TRANSFER",
        ],
      },

      amount: {
        type: Number,
        default: 5000,
      },

      proof: {
        type: String,
        default: "",
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "APPROVED",
          "REJECTED",
        ],
        default: "PENDING",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Verification",
  verificationSchema
);