import mongoose from "mongoose";

const pkBattleSchema = new mongoose.Schema(
  {
    hostA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hostB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    duration: {
      type: Number,
      default: 300, // 5 minutes
    },

    hostAScore: {
      type: Number,
      default: 0,
    },

    hostBScore: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PKBattle = mongoose.model("PKBattle", pkBattleSchema);

export default PKBattle;