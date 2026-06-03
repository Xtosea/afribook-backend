import express from "express";
import StoryMusic from "../models/StoryMusic.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const music = await StoryMusic.find()
    .sort({ title: 1 });

  res.json(music);
});

export default router;