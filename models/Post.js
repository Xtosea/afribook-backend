import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  text: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const mediaSchema = new mongoose.Schema({
  url: String,
  type: String
});

const postSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  content: { 
    type: String, 
    default: "" 
  },

  media: [mediaSchema],

  feeling: { 
    type: String, 
    default: "" 
  },

  location: { 
    type: String, 
    default: "" 
  },

  taggedFriends: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  ],

  likes: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  ],

  comments: [commentSchema],

  createdAt: { 
    type: Date, 
    default: Date.now 
  }

});

export default mongoose.model("Post", postSchema);