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

  type: {
    type: String,
    default: "post"
  },

  feeling: { 
    type: String, 
    default: "" 
  },

  location: { 
    type: String, 
    default: "" 
  },

  // ✅ FIXED
  taggedFriends: [String],

  likes: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  ],

  reactions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      type: String
    }
  ],

  comments: [commentSchema],

  createdAt: { 
    type: Date, 
    default: Date.now 
  }

});