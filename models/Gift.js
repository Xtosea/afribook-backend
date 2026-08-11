import mongoose from "mongoose";

const giftSchema = new mongoose.Schema(
  {
    // Gift name shown in the gift picker
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Emoji/icon shown for the gift
    emoji: {
      type: String,
      required: true,
      trim: true,
    },

    // Coins the viewer must spend to send this gift
    coinCost: {
      type: Number,
      required: true,
      min: 1,
    },

    // PK points generated for the host
    pkPoints: {
      type: Number,
      required: true,
      min: 1,
    },

    // Optional: diamonds represented by the gift
    diamonds: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Whether the gift is currently available
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Controls gift ordering in the picker
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Gift = mongoose.model("Gift", giftSchema);

export default Gift;