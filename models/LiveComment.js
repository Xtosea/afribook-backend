import mongoose from "mongoose";

const liveCommentSchema =
  new mongoose.Schema(
    {
      stream: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "LiveStream",
      },

      user: {
        type:
          mongoose.Schema
            .Types.ObjectId,
        ref: "User",
      },

      text: String,
    },

    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "LiveComment",
  liveCommentSchema
);