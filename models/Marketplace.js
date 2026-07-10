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

    negotiable: {
      type: Boolean,
      default: false,
    },

    category: {
      type: String,
      required: true,
    },

    brand: {
      type: String,
      default: "",
    },

    model: {
      type: String,
      default: "",
    },

    condition: {
      type: String,
      enum: [
        "Brand New",
        "Like New",
        "Used",
        "For Parts",
      ],
      default: "Used",
    },

    quantity: {
      type: Number,
      default: 1,
    },

    country: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    area: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    whatsapp: {
      type: String,
      default: "",
    },

    contactMethods: {
      phone: {
        type: Boolean,
        default: true,
      },

      whatsapp: {
        type: Boolean,
        default: true,
      },

      chat: {
        type: Boolean,
        default: true,
      },
    },

    hidePhone: {
      type: Boolean,
      default: false,
    },

    deliveryAvailable: {
      type: Boolean,
      default: false,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    images: [
      {
        url: String,
        public_id: String,
      },
    ],

    status: {
      type: String,
      enum: [
        "Available",
        "Reserved",
        "Sold",
      ],
      default: "Available",
    },

    featured: {
      type: Boolean,
      default: false,
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

    expiresAt: {
      type: Date,
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