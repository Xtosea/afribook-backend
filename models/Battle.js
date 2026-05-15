import mongoose from "mongoose";

const battleSchema =
  new mongoose.Schema(
    {
      creator1: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      creator2: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      score1: {
        type: Number,
        default: 0,
      },

      score2: {
        type: Number,
        default: 0,
      },

      active: {
        type: Boolean,
        default: true,
      },
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Battle",
  battleSchema
);