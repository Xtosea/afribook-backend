import mongoose from "mongoose";

const StoryMusicSchema = new mongoose.Schema({
  title: String,
  artist: String,
  audioUrl: String,
  coverUrl: String,
});

export default mongoose.model(
  "StoryMusic",
  StoryMusicSchema
);