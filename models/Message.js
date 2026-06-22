import mongoose from "mongoose";

const messageSchema =
  new mongoose.Schema(
    {
      sender: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
      },

      receiver: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
      },


      deletedFor: [
  {
    type: String,
  },
],

edited: {
  type: Boolean,
  default: false,
},

editedAt: Date,

      text: {
        type: String,
        default: "",
      },

      media: {
        type: String,
        default: "",
      },

      mediaType: {
  type: String,
  enum: [
    "image",
    "video",
    "audio",
    null,
  ],
  default: null,
},

      callType: {
        type: String,
        enum: [
          "voice",
          "video",
        ],
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "Message",
  messageSchema
);