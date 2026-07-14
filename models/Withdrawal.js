import mongoose from "mongoose";

const withdrawalSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      amount: {
        type: Number,
        required: true,
      },

      bankName: {
        type: String,
        required: true,
      },

      accountNumber: {
        type: String,
        required: true,
      },

      type: {
  type: String,
  enum: [
    "points",
    "creator",
  ],
  default: "points",
},

      accountName: {
        type: String,
        required: true,
      },


    
    reference: {
  type: String,
  unique: true,
},

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "paid",
          "rejected",
        ],
        default: "pending",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Withdrawal",
  withdrawalSchema
);
