// src/models/Story.js
import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },

  media: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], default: "image" },
    },
  ],

  replies: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  views: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],

  reactions: [
    { 
      user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      }, 
      type: String 
    }
  ],

  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  expiresAt: { 
    type: Date, 
    required: true,
    expires: 0 // Auto delete when expiresAt is reached
  },
});

export default mongoose.model("Story", storySchema);