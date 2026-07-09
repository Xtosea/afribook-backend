import mongoose from "mongoose";

const marketplaceSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    category: {
      type: String,
      required: true,
    },

    condition: {
      type: String,
      enum: ["New", "Used"],
      default: "Used",
    },

    location: {
      type: String,
      required: true,
    },

    images: [
      {
        url: String,
        public_id: String,
      },
    ],

    status: {
      type: String,
      enum: ["Available", "Sold"],
      default: "Available",
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Marketplace",
  marketplaceSchema
);