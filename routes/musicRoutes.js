import express from "express";

const router = express.Router();

const songs = [
  {
    _id: "1",
    title: "Afrobeats Vibes",
    artist: "AfricSocial",
    audioUrl: "https://your-domain.com/music/afrobeats.mp3",
  },
  {
    _id: "2",
    title: "Amapiano",
    artist: "AfricSocial",
    audioUrl: "https://your-domain.com/music/amapiano.mp3",
  },
  {
    _id: "3",
    title: "Hip Hop",
    artist: "AfricSocial",
    audioUrl: "https://your-domain.com/music/hiphop.mp3",
  },
];

router.get("/", (req, res) => {
  res.json(songs);
});

export default router;