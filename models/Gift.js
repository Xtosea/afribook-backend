import mongoose from "mongoose";

const giftSchema =
  new mongoose.Schema(
    {
      sender: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      receiver: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      stream: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "LiveStream",
      },

      giftType: String,

      diamonds: Number,
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Gift",
  giftSchema
);