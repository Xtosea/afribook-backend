import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  // Later: read from MongoDB
  res.json([
    {
      _id: "1",
      title: "Afro Beat",
      artist: "AfricSocial",
      audioUrl: "https://media.globelynks.com/music/afrobeat.mp3",
    },
  ]);
});

export default router;